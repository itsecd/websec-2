from bs4 import BeautifulSoup

def parse_schedule(html):
    soup = BeautifulSoup(html, 'html.parser')

    day_map = {
        'понедельник': 'monday', 'вторник': 'tuesday',
        'среда': 'wednesday', 'четверг': 'thursday',
        'пятница': 'friday', 'суббота': 'saturday'
    }

    days = [day_map.get(d.text.strip().lower(), d.text.strip().lower())
            for d in soup.select('.schedule__head-weekday')]

    if not days:
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    days = days[5:] + days[:5]

    time_slots = [
        "08:00-09:35", "09:45-11:20", "11:30-13:05",
        "13:30-15:05", "15:15-16:50", "17:00-18:35"
    ]

    items = soup.select('.schedule__items .schedule__item')

    lesson_cells = []
    for item in items:
        if item.find(class_='schedule__head') or item.find(class_='schedule__time-item'):
            continue
        lesson_cells.append(item)

    rows = [lesson_cells[i:i + 6] for i in range(0, len(lesson_cells), 6)]

    for idx, row in enumerate(rows):
        if any(cell.find(class_='schedule__lesson') for cell in row):
            rows = rows[idx:]
            break

    rows = [row for row in rows if any(cell.find(class_='schedule__lesson') for cell in row)]

    schedule = []

    for row_idx, row in enumerate(rows):
        if row_idx >= len(time_slots):
            break

        day_data = {}

        for col_idx, cell in enumerate(row):
            if col_idx >= len(days):
                continue

            day = days[col_idx]
            lessons = []

            for lesson in cell.select('.schedule__lesson'):
                title = lesson.select_one('.schedule__discipline')
                teacher = lesson.select_one('.schedule__teacher')
                place = lesson.select_one('.schedule__place')
                type_chip = lesson.select_one('.schedule__lesson-type-chip')

                title_text = title.text.strip() if title else ""

                teacher_text = ""
                if teacher:
                    a = teacher.find('a')
                    teacher_text = a.text.strip() if a else teacher.text.strip()

                place_text = place.text.strip() if place else ""
                type_text = type_chip.text.strip() if type_chip else ""

                type_class = 'lesson'
                if 'лекц' in type_text.lower():
                    type_class = 'lecture'
                elif 'практ' in type_text.lower():
                    type_class = 'practice'
                elif 'лаб' in type_text.lower():
                    type_class = 'lab'

                if title_text:
                    lessons.append({
                        "title": title_text,
                        "teacher": teacher_text,
                        "room": place_text,
                        "type": type_text if type_text else "Занятие",
                        "typeClass": type_class
                    })

            day_data[day] = lessons

        schedule.append({"time": time_slots[row_idx], "days": day_data})

    return schedule