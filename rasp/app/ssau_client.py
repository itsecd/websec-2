import re
import requests
from typing import List, Tuple, Dict, Optional
from urllib.parse import urljoin, urlparse, parse_qs
from bs4 import BeautifulSoup

SSAU_BASE = "https://ssau.ru"


class SsauClient:
    
    def __init__(self, timeout_seconds: float = 25.0):
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
        })
        self._timeout = timeout_seconds
        self._cached_csrf: Optional[str] = None
    
    def fetch_html(self, url: str) -> str:
        response = self._session.get(url, timeout=self._timeout)
        response.raise_for_status()
        return response.text
    
    def _ensure_csrf_token(self) -> str:
        if self._cached_csrf:
            return self._cached_csrf
        
        html = self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
        
        match = re.search(r'name="csrf-token"\s+content="([^"]+)"', html, re.IGNORECASE)
        if not match:
            match = re.search(r"name='csrf-token'\s+content='([^']+)'", html, re.IGNORECASE)
        
        if not match:
            raise RuntimeError("Не удалось найти csrf-token на странице /rasp")
        
        self._cached_csrf = match.group(1)
        return self._cached_csrf
    
    def get_institutes(self) -> List[Tuple[int, str]]:
        html = self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
        soup = BeautifulSoup(html, "lxml")
        
        links = soup.select('a[href*="/rasp/faculty/"]')
        institutes: Dict[int, Tuple[int, str]] = {}
        
        for a in links:
            href = a.get("href")
            if not href:
                continue
            
            abs_url = urljoin(SSAU_BASE, href)
            match = re.search(r"/rasp/faculty/(\d+)", abs_url)
            if not match:
                continue
            
            faculty_id = int(match.group(1))
            name = a.get_text(" ", strip=True)
            
            if name and faculty_id not in institutes:
                institutes[faculty_id] = (faculty_id, name)
        
        return sorted(institutes.values(), key=lambda x: x[1].lower())
    
    def get_available_courses(self, faculty_id: int) -> List[int]:
        url = urljoin(SSAU_BASE, f"/rasp/faculty/{faculty_id}?course=1")
        html = self.fetch_html(url)
        soup = BeautifulSoup(html, "lxml")
        
        courses: set = set()
        
        for a in soup.select('a[href*="course="]'):
            href = a.get("href") or ""
            try:
                parsed = urlparse(urljoin(SSAU_BASE, href))
                params = parse_qs(parsed.query)
                if "course" in params:
                    course_num = int(params["course"][0])
                    if 1 <= course_num <= 6:  # Обычно курсы 1-5, иногда 6
                        courses.add(course_num)
            except (ValueError, TypeError):
                continue
        
        if not courses:
            courses = {1, 2, 3, 4, 5}
        
        return sorted(courses)
    
    def get_groups_by_course(self, faculty_id: int, course: int) -> List[Tuple[int, str]]:
        url = urljoin(SSAU_BASE, f"/rasp/faculty/{faculty_id}?course={course}")
        html = self.fetch_html(url)
        soup = BeautifulSoup(html, "lxml")
        
        groups: Dict[int, Tuple[int, str]] = {}
        
        for a in soup.select('a[href*="groupId="]'):
            href = a.get("href")
            if not href:
                continue
            
            abs_url = urljoin(SSAU_BASE, href)
            parsed = urlparse(abs_url)
            params = parse_qs(parsed.query)
            
            if "groupId" not in params:
                continue
            
            try:
                group_id = int(params["groupId"][0])
                name = a.get_text(" ", strip=True)
                if name and group_id not in groups:
                    groups[group_id] = (group_id, name)
            except (ValueError, TypeError):
                continue
        
        return sorted(groups.values(), key=lambda x: x[1])
    
    def search_teachers(self, query: str) -> List[dict]:
        csrf = self._ensure_csrf_token()
        
        response = self._session.post(
            urljoin(SSAU_BASE, "/rasp/search"),
            data={"text": query},
            headers={
                "X-CSRF-TOKEN": csrf,
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            timeout=self._timeout
        )
        response.raise_for_status()
        
        data = response.json()
        teachers = []
        
        for item in data:
            if "staffId=" in item.get("url", ""):
                teachers.append({
                    "id": item.get("id"),
                    "name": item.get("text", "")
                })
        
        return teachers
    
    def get_schedule_html(self, group_id: int, week: int = 0) -> str:
        url = urljoin(SSAU_BASE, f"/rasp?groupId={group_id}")
        if week != 0:
            url += f"&selectedWeek={week}"
        
        return self.fetch_html(url)
    
    def get_teacher_schedule_html(self, staff_id: int, week: int = 0) -> str:
        url = urljoin(SSAU_BASE, f"/rasp?staffId={staff_id}")
        if week != 0:
            url += f"&selectedWeek={week}"
        
        return self.fetch_html(url)