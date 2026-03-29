from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Literal, Optional, Tuple
from urllib.parse import urljoin, urlparse, parse_qs

import httpx
from bs4 import BeautifulSoup

SSAU_BASE = "https://ssau.ru"


@dataclass(frozen=True)
class SearchItem:
    id: int
    name: str
    type: Literal["group", "teacher"]
    url: str


class SsauClient:
    """
    Thin client for ssau.ru endpoints used by расписание.

    Note on /rasp/search:
    The SSAU timetable select (select2) posts to /rasp/search with:
      - x-www-form-urlencoded body: text=<query>
      - X-CSRF-TOKEN header (token is embedded in <meta name="csrf-token" ...> on /rasp)
      - cookies received from /rasp.
    """

    def __init__(self, timeout_seconds: float = 25.0) -> None:
        self._client = httpx.AsyncClient(
            headers={
                "User-Agent": "ssau-schedule-proxy/1.0 (+https://ssau.ru/)",
                "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
            },
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=True,
        )

        # Cached CSRF token required for POST /rasp/search
        self._cached_csrf: Optional[str] = None

    async def aclose(self) -> None:
        await self._client.aclose()

    async def fetch_html(self, url: str) -> str:
        r = await self._client.get(url)
        r.raise_for_status()
        return r.text

    async def _post_form_json(self, url: str, form: Dict[str, str], headers: Dict[str, str]):
        r = await self._client.post(url, data=form, headers=headers)
        r.raise_for_status()
        return r.json()

    async def _ensure_rasp_csrf(self) -> str:
        """
        /rasp/search expects CSRF token in header X-CSRF-TOKEN and cookies from /rasp page.
        SSAU embeds token in a <meta name="csrf-token" content="..."> tag.
        """
        if self._cached_csrf:
            return self._cached_csrf

        html = await self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
        # Token is usually early in the document head, but we don't assume exact order.
        m = re.search(r'name="csrf-token"\s+content="([^"]+)"', html, flags=re.IGNORECASE)
        if not m:
            # Some pages render it as name='csrf-token'
            m = re.search(r"name='csrf-token'\s+content='([^']+)'", html, flags=re.IGNORECASE)
        if not m:
            raise RuntimeError("SSAU: не удалось найти csrf-token на странице /rasp")

        self._cached_csrf = m.group(1).strip()
        return self._cached_csrf

    async def search_groups_and_teachers(self, text: str) -> List[SearchItem]:
        """
        POST https://ssau.ru/rasp/search
        Response: array of {id, url, text}.
        """
        text = (text or "").strip()
        if not text:
            return []

        for attempt in range(2):
            csrf = await self._ensure_rasp_csrf()
            try:
                data = await self._post_form_json(
                    urljoin(SSAU_BASE, "/rasp/search"),
                    form={"text": text},
                    headers={
                        "X-CSRF-TOKEN": csrf,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                )
                return _parse_search_items(data)
            except httpx.HTTPStatusError as e:
                # CSRF/cookie can expire — refresh once
                if e.response.status_code in (403, 419) and attempt == 0:
                    self._cached_csrf = None
                    try:
                        self._client.cookies.clear()
                    except Exception:
                        pass
                    continue
                raise

        return []

    async def get_institutes(self) -> List[Tuple[int, str, str]]:
        """
        Parse https://ssau.ru/rasp and extract institutes/faculties list.
        Link format: /rasp/faculty/<facultyId>?course=1
        Returns: list of (facultyId, name, absolute url)
        """
        html = await self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
        soup = BeautifulSoup(html, "lxml")

        # Prefer the block under header "Институты и факультеты", but keep fallback:
        links = soup.select('a[href*="/rasp/faculty/"]')
        out: Dict[int, Tuple[int, str, str]] = {}
        for a in links:
            href = a.get("href")
            if not href:
                continue
            abs_url = urljoin(SSAU_BASE, href)
            m = re.search(r"/rasp/faculty/(\d+)", abs_url)
            if not m:
                continue
            fid = int(m.group(1))
            name = a.get_text(" ", strip=True)
            if not name:
                continue
            out[fid] = (fid, name, abs_url)
        return sorted(out.values(), key=lambda x: x[1].lower())

    async def get_faculty_available_courses(self, faculty_id: int) -> List[int]:
        """
        Faculty page has tabs like "1 курс", "2 курс"... Linking to ?course=N.
        """
        url = urljoin(SSAU_BASE, f"/rasp/faculty/{faculty_id}?course=1")
        html = await self.fetch_html(url)
        soup = BeautifulSoup(html, "lxml")

        courses: set[int] = set()
        for a in soup.select('a[href*="course="]'):
            href = a.get("href") or ""
            try:
                q = parse_qs(urlparse(urljoin(SSAU_BASE, href)).query)
                if "course" in q:
                    c = int(q["course"][0])
                    if 0 <= c <= 12:
                        courses.add(c)
            except Exception:
                continue

        # Fallback: if no tabs found, at least allow course=1
        if not courses:
            courses.add(1)

        return sorted(courses)

    async def get_groups_for_faculty(self, faculty_id: int, course: int) -> List[Tuple[int, str, str]]:
        url = urljoin(SSAU_BASE, f"/rasp/faculty/{faculty_id}?course={course}")
        html = await self.fetch_html(url)
        soup = BeautifulSoup(html, "lxml")

        out: Dict[int, Tuple[int, str, str]] = {}
        for a in soup.select('a[href*="groupId="]'):
            href = a.get("href")
            if not href:
                continue
            abs_url = urljoin(SSAU_BASE, href)
            q = parse_qs(urlparse(abs_url).query)
            if "groupId" not in q:
                continue
            try:
                gid = int(q["groupId"][0])
            except Exception:
                continue
            name = a.get_text(" ", strip=True)
            if not name:
                continue
            out[gid] = (gid, name, abs_url)

        return sorted(out.values(), key=lambda x: x[1].lower())


def _parse_search_items(data) -> List[SearchItem]:
    items: List[SearchItem] = []
    if not isinstance(data, list):
        return items

    for obj in data:
        if not isinstance(obj, dict):
            continue
        try:
            id_ = int(obj.get("id"))
        except Exception:
            continue
        url = str(obj.get("url") or "").strip()
        name = str(obj.get("text") or "").strip()
        if not name:
            continue

        type_: Literal["group", "teacher"]
        if "groupId=" in url:
            type_ = "group"
        elif "staffId=" in url:
            type_ = "teacher"
        else:
            # heuristic fallback
            type_ = "teacher" if "staff" in url.lower() else "group"

        items.append(SearchItem(id=id_, name=name, type=type_, url=url))

    return items
