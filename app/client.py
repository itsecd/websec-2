from __future__ import annotations

import re
from typing import List, Tuple, Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

SSAU_BASE = "https://ssau.ru"


class SsauClient:
    """HTTP клиент для взаимодействия с ssau.ru"""
    
    def __init__(self, timeout: float = 30.0):
        self._client = httpx.AsyncClient(
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
            },
            timeout=httpx.Timeout(timeout),
            follow_redirects=True,
        )
        self._csrf_token: Optional[str] = None
    
    async def close(self):
        await self._client.aclose()
    
    async def fetch_html(self, url: str) -> str:
        """Получает HTML страницы"""
        print(f"Fetching URL: {url}")
        response = await self._client.get(url)
        response.raise_for_status()
        
        if "ssau.ru/rasp" not in response.url.path:
            print(f"Warning: Redirected to {response.url}")
        
        return response.text
    
    async def get_institutes(self) -> List[Tuple[int, str, str]]:
        """Получает список институтов/факультетов"""
        html = await self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
        soup = BeautifulSoup(html, "lxml")
        
        institutes = []
        for link in soup.select('a[href*="/rasp/faculty/"]'):
            href = link.get("href", "")
            match = re.search(r"/rasp/faculty/(\d+)", href)
            if match:
                inst_id = int(match.group(1))
                name = link.get_text(strip=True)
                if name and len(name) > 1:
                    institutes.append((inst_id, name, urljoin(SSAU_BASE, href)))
        
        return sorted(institutes, key=lambda x: x[1])
    
    async def get_courses(self, institute_id: int) -> List[int]:
        """Получает доступные курсы для института"""
        url = urljoin(SSAU_BASE, f"/rasp/faculty/{institute_id}")
        html = await self.fetch_html(url)
        soup = BeautifulSoup(html, "lxml")
        
        courses = set()
        for link in soup.select('a[href*="course="], button[data-course]'):
            href = link.get("href", "")
            match = re.search(r"course=(\d+)", href)
            if match:
                course = int(match.group(1))
                if 1 <= course <= 12:
                    courses.add(course)
            
            data_course = link.get("data-course")
            if data_course:
                try:
                    course = int(data_course)
                    if 1 <= course <= 12:
                        courses.add(course)
                except ValueError:
                    pass
        
        return sorted(courses) if courses else [1, 2, 3, 4]
    
    async def get_groups(self, institute_id: int, course: int) -> List[Tuple[int, str]]:
        """Получает группы для института и курса"""
        url = urljoin(SSAU_BASE, f"/rasp/faculty/{institute_id}?course={course}")
        html = await self.fetch_html(url)
        soup = BeautifulSoup(html, "lxml")
        
        groups = []
        for link in soup.select('a[href*="groupId="]'):
            href = link.get("href", "")
            match = re.search(r"groupId=(\d+)", href)
            if match:
                group_id = int(match.group(1))
                name = link.get_text(strip=True)
                if name and len(name) > 1:
                    groups.append((group_id, name))
        
        if not groups:
            for link in soup.select('[data-group-id]'):
                group_id = link.get("data-group-id")
                if group_id:
                    name = link.get_text(strip=True)
                    groups.append((int(group_id), name))
        
        return sorted(groups, key=lambda x: x[1])
    
    async def search_teachers(self, query: str) -> List[Tuple[int, str]]:
        """Ищет преподавателей по имени"""
        if len(query) < 2:
            return []
        
        if not self._csrf_token:
            html = await self.fetch_html(urljoin(SSAU_BASE, "/rasp"))
            match = re.search(r'csrf-token" content="([^"]+)"', html)
            if match:
                self._csrf_token = match.group(1)
        
        if not self._csrf_token:
            return []
        
        try:
            response = await self._client.post(
                urljoin(SSAU_BASE, "/rasp/search"),
                data={"text": query},
                headers={
                    "X-CSRF-TOKEN": self._csrf_token,
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": urljoin(SSAU_BASE, "/rasp"),
                },
            )
            
            if response.status_code == 200:
                data = response.json()
                teachers = []
                for item in data:
                    url = item.get("url", "")
                    if "staffId=" in url:
                        match = re.search(r"staffId=(\d+)", url)
                        if match:
                            teachers.append((int(match.group(1)), item.get("text", "")))
                return teachers
        except Exception as e:
            print(f"Search error: {e}")
        
        return []