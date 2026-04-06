from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Literal, Optional, Tuple
from urllib.parse import parse_qs, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

SSAU_BASE = "https://ssau.ru"


@dataclass(frozen=True)
class SearchItem:
    id: int
    name: str
    type: Literal["group", "teacher"]
    url: str


class SsauAPI:
    def __init__(self, timeout_seconds: float = 25.0) -> None:
        self._client = httpx.AsyncClient(
            headers={
                "User-Agent": "ssau-schedule-dashboard/1.0",
                "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
            },
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=True,
            trust_env=False,
        )
        self._cached_csrf: Optional[str] = None

    async def aclose(self) -> None:
        await self._client.aclose()

    async def fetch_html(self, url: str) -> str:
        response = await self._client.get(url)
        response.raise_for_status()
        return response.text

    async def _post_form_json(self, url: str, form: Dict[str, str], headers: Dict[str, str]):
        response = await self._client.post(url, data=form, headers=headers)
        response.raise_for_status()
        return response.json()

    async def _ensure_rasp_csrf(self) -> str:
        if self._cached_csrf:
            return self._cached_csrf

        html = await self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
        match = re.search(r'name="csrf-token"\s+content="([^"]+)"', html, flags=re.IGNORECASE)
        if not match:
            match = re.search(r"name='csrf-token'\s+content='([^']+)'", html, flags=re.IGNORECASE)
        if not match:
            raise RuntimeError("Не удалось найти csrf-token на странице SSAU /rasp")

        self._cached_csrf = match.group(1).strip()
        return self._cached_csrf

    async def search_groups_and_teachers(self, text: str) -> List[SearchItem]:
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
        html = await self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
        soup = BeautifulSoup(html, "lxml")

        links = soup.select('a[href*="/rasp/faculty/"]')
        out: Dict[int, Tuple[int, str, str]] = {}

        for a in links:
            href = a.get("href")
            if not href:
                continue
            abs_url = urljoin(SSAU_BASE, href)
            match = re.search(r"/rasp/faculty/(\d+)", abs_url)
            if not match:
                continue
            fid = int(match.group(1))
            name = a.get_text(" ", strip=True)
            if not name:
                continue
            out[fid] = (fid, name, abs_url)

        return sorted(out.values(), key=lambda x: x[1].lower())

    async def get_faculty_available_courses(self, faculty_id: int) -> List[int]:
        url = urljoin(SSAU_BASE, f"/rasp/faculty/{faculty_id}?course=1")
        html = await self.fetch_html(url)
        soup = BeautifulSoup(html, "lxml")

        courses: set[int] = set()
        for a in soup.select('a[href*="course="]'):
            href = a.get("href") or ""
            try:
                query = parse_qs(urlparse(urljoin(SSAU_BASE, href)).query)
                if "course" in query:
                    course = int(query["course"][0])
                    if 0 <= course <= 12:
                        courses.add(course)
            except Exception:
                continue

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
            query = parse_qs(urlparse(abs_url).query)
            if "groupId" not in query:
                continue
            try:
                gid = int(query["groupId"][0])
            except Exception:
                continue
            name = a.get_text(" ", strip=True)
            if not name:
                continue
            out[gid] = (gid, name, abs_url)

        return sorted(out.values(), key=lambda x: x[1].lower())

    async def fetch_group_schedule_html(self, group_id: int, week: Optional[int] = None) -> str:
        if week is None:
            url = f"{SSAU_BASE}/rasp?groupId={group_id}"
        else:
            url = f"{SSAU_BASE}/rasp?groupId={group_id}&selectedWeek={week}&selectedWeekday=1"
        return await self.fetch_html(url)

    async def fetch_teacher_schedule_html(self, staff_id: int, week: Optional[int] = None) -> str:
        if week is None:
            url = f"{SSAU_BASE}/rasp?staffId={staff_id}"
        else:
            url = f"{SSAU_BASE}/rasp?staffId={staff_id}&selectedWeek={week}&selectedWeekday=1"
        return await self.fetch_html(url)


def _parse_search_items(data) -> List[SearchItem]:
    items: List[SearchItem] = []
    if not isinstance(data, list):
        return items

    for obj in data:
        if not isinstance(obj, dict):
            continue
        try:
            item_id = int(obj.get("id"))
        except Exception:
            continue

        url = str(obj.get("url") or "").strip()
        name = str(obj.get("text") or "").strip()
        if not name:
            continue

        if "groupId=" in url:
            item_type: Literal["group", "teacher"] = "group"
        elif "staffId=" in url:
            item_type = "teacher"
        else:
            item_type = "teacher" if "staff" in url.lower() else "group"

        items.append(SearchItem(id=item_id, name=name, type=item_type, url=url))

    return items