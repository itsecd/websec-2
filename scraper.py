import re
import json
import os
import requests
from bs4 import BeautifulSoup

SSAU_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/122.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
}

KNOWN_TEACHERS = [
    {'id': '432837452', 'name': 'Юзькив Р.Р.',    'type': 'teacher'},
    {'id': '62061001',  'name': 'Мясников В.В.',   'type': 'teacher'},
    {'id': '335824546', 'name': 'Максимов А.И.',   'type': 'teacher'},
    {'id': '664017039', 'name': 'Борисов А.Н.',    'type': 'teacher'},
    {'id': '364272302', 'name': 'Агафонов А.А.',   'type': 'teacher'},
    {'id': '147619112', 'name': 'Кузнецов А.В.',   'type': 'teacher'},
    {'id': '333991624', 'name': 'Веричев А.В.',    'type': 'teacher'},
    {'id': '544973937', 'name': 'Шапиро Д.А.',     'type': 'teacher'},
    {'id': '651422674', 'name': 'Позднякова Д.С.', 'type': 'teacher'},
    {'id': '594502705', 'name': 'Чернышев П.В.',   'type': 'teacher'},
]

_groups_cache = None

def _load_groups():
    global _groups_cache
    if _groups_cache is not None:
        return _groups_cache
    path = os.path.join(os.path.dirname(__file__), 'public', 'groups.json')
    try:
        with open(path, encoding='utf-8') as f:
            _groups_cache = json.load(f)
    except Exception:
        _groups_cache = []
    return _groups_cache


def _search_known(query):
    q = query.lower()
    groups  = [g for g in _load_groups()  if q in g['name'].lower()]
    teachers = [t for t in KNOWN_TEACHERS if q in t['name'].lower()]
    return groups[:30] + teachers


def search_ssau(query):
    try:
        resp = requests.get(
            'https://ssau.ru/rasp/search',
            params={'text': query},
            headers={
                **SSAU_HEADERS,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout=(5, 7),
        )
        resp.raise_for_status()
        remote = resp.json()
        remote = remote if isinstance(remote, list) else []
        known = _search_known(query)
        remote_ids = {str(item.get('id', '')) for item in remote}
        return remote + [k for k in known if k['id'] not in remote_ids], None
    except Exception:
        return _search_known(query), None


def _parse_lessons(cell):
    lessons = []
    for lesson in cell.select('.schedule__lesson'):
        type_chip = lesson.select_one('.schedule__lesson-type-chip')
        chip_class = ' '.join(type_chip.get('class', [])) if type_chip else ''
        type_match = re.search(r'lesson-type-(\d+)', chip_class)

        teacher_el   = lesson.select_one('.schedule__teacher')
        teacher_link = lesson.select_one('.schedule__teacher a')
        teacher_id   = None
        if teacher_link and teacher_link.get('href'):
            m = re.search(r'staffId=(\d+)', teacher_link['href'])
            if m:
                teacher_id = m.group(1)

        groups = []
        for g in lesson.select('.schedule__groups a.schedule__group'):
            m = re.search(r'groupId=(\d+)', g.get('href', ''))
            if m:
                groups.append({'name': g.get_text(strip=True), 'id': m.group(1)})

        place_el    = lesson.select_one('.schedule__place')
        subject_el  = lesson.select_one('.schedule__discipline')
        subgroup_el = lesson.select_one('.schedule__groups span.caption-text')

        lessons.append({
            'subject':   subject_el.get_text(strip=True) if subject_el else '',
            'typeText':  type_chip.get_text(strip=True) if type_chip else '',
            'typeNum':   int(type_match.group(1)) if type_match else 0,
            'teacher':   ' '.join(teacher_el.get_text().split()) if teacher_el else '',
            'teacherId': teacher_id,
            'room':      place_el.get_text(strip=True) if place_el else 'online',
            'groups':    groups,
            'subgroup':  subgroup_el.get_text(strip=True) if subgroup_el else '',
        })
    return lessons


def _parse_html(html):
    soup = BeautifulSoup(html, 'lxml')

    week_span = soup.select_one('.week-nav-current_week')
    week_text = week_span.get_text(strip=True) if week_span else ''
    m = re.search(r'\d+', week_text)
    current_week = int(m.group()) if m else 1

    prev_link = soup.select_one('.week-nav-prev')
    next_link = soup.select_one('.week-nav-next')
    prev_week = current_week - 1
    next_week = current_week + 1
    if prev_link and prev_link.get('href'):
        m = re.search(r'selectedWeek=(\d+)', prev_link['href'])
        if m:
            prev_week = int(m.group(1))
    if next_link and next_link.get('href'):
        m = re.search(r'selectedWeek=(\d+)', next_link['href'])
        if m:
            next_week = int(m.group(1))

    date_el   = soup.select_one('.week-nav-current_date')
    week_date = date_el.get_text(strip=True) if date_el else ''

    entity_name = ''
    for sel in ('.info-block__title', '.h1-text'):
        el = soup.select_one(sel)
        if el:
            entity_name = re.sub(r'^Расписание,?\s*', '', el.get_text(strip=True), flags=re.IGNORECASE).strip()
            break

    items = soup.select('.schedule__items > *')
    days = []
    header_end = 0
    for i, el in enumerate(items):
        if 'schedule__head' not in (el.get('class') or []):
            header_end = i
            break
        wd = el.select_one('.schedule__head-weekday')
        dt = el.select_one('.schedule__head-date')
        if wd:
            days.append({
                'weekday': wd.get_text(strip=True),
                'date':    dt.get_text(strip=True) if dt else '',
            })
        header_end = i + 1

    num_days  = len(days) or 6
    time_slots = []
    grid = []
    i = header_end

    while i < len(items):
        el = items[i]
        if 'schedule__time' in (el.get('class') or []):
            times = []
            for ti in el.select('.schedule__time-item'):
                text = ti.find(string=True, recursive=False)
                times.append(text.strip() if text else ti.get_text(strip=True))
            time_slots.append(f'{times[0]} – {times[1]}' if len(times) >= 2 else '—')

            row = []
            for j in range(1, num_days + 1):
                lessons = _parse_lessons(items[i + j]) if i + j < len(items) else []
                row.append(lessons if lessons else None)
            grid.append(row)
            i += num_days + 1
        else:
            i += 1

    return {
        'week':       current_week,
        'prevWeek':   prev_week,
        'nextWeek':   next_week,
        'weekDate':   week_date,
        'entityName': entity_name,
        'days':       days,
        'timeSlots':  time_slots,
        'grid':       grid,
    }


def get_schedule(entity_type, entity_id, week=None):
    param  = 'groupId' if entity_type == 'group' else 'staffId'
    params = {param: entity_id}
    if week is not None:
        params['selectedWeek'] = week
    try:
        resp = requests.get(
            'https://ssau.ru/rasp',
            params=params,
            headers=SSAU_HEADERS,
            timeout=(5, 10),
        )
        resp.raise_for_status()
        return _parse_html(resp.text), None
    except Exception as exc:
        return None, f'Не удалось загрузить расписание: {exc}'
