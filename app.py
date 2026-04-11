from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

HEADERS = {
    "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


def get_current_week():
    """Определение текущей учебной недели"""
    now = datetime.now()
    start_date = datetime(now.year, 9, 1)
    if now < start_date:
        start_date = datetime(now.year - 1, 9, 1)
    week = (now - start_date).days // 7 + 1
    return week if week > 0 else 1


def get_groups():
    """Получение списка групп с сайта ssau.ru"""
    try:
        url = "https://ssau.ru/rasp"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        groups = []
        seen = set()

        for link in soup.find_all('a', href=True):
            if 'groupId=' in link['href']:
                match = re.search(r'groupId=(\d+)', link['href'])
                if match:
                    group_id = match.group(1)
                    if group_id not in seen:
                        seen.add(group_id)
                        name = link.get_text().strip()
                        if name and len(name) > 3:
                            groups.append({"id": group_id, "name": name})

        if groups:
            return groups[:20]
    except:
        pass

    return [
        {"id": "1282690301", "name": "6411-100503D"},
        {"id": "1282690279", "name": "6412-100503D"},
        {"id": "1213641978", "name": "6413-100503D"},
    ]


def get_teachers():
    """Получение списка преподавателей с сайта ssau.ru"""
    teachers = {}
    groups = get_groups()

    for group in groups[:3]:
        try:
            url = f"https://ssau.ru/rasp?groupId={group['id']}"
            response = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')

            for link in soup.find_all('a', href=True):
                if 'staffId=' in link['href']:
                    name = link.get_text().strip()
                    if name and len(name) > 3:
                        teachers[name] = name
        except:
            continue

    result = [{
        "id": str(i),
        "name": name
    } for i, name in enumerate(sorted(teachers.keys()))]
    return result[:30] if result else [{"id": "1", "name": "Иванов И.И."}]


def parse_group_schedule(group_id, week):
    """Парсинг расписания группы с сайта ssau.ru"""
    url = f"https://ssau.ru/rasp?groupId={group_id}"
    if week:
        url += f"&selectedWeek={week}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')

        days = []
        schedule_items = soup.select_one(".schedule__items")

        if schedule_items:
            # Получаем названия дней
            day_names = []
            for head in schedule_items.find_all('div',
                                                class_='schedule__head'):
                if not head.find('div', class_='schedule__time-item'):
                    wd = head.find('div', class_='schedule__head-weekday')
                    if wd:
                        day_names.append(wd.get_text().strip().capitalize())

            # Парсим занятия по времени
            time_blocks = schedule_items.find_all('div',
                                                  class_='schedule__time')
            day_index = 0

            for tb in time_blocks:
                time_items = tb.find_all('div', class_='schedule__time-item')
                time_range = ""
                if len(time_items) >= 2:
                    start = time_items[0].get_text().strip().split()[0]
                    end = time_items[1].get_text().strip().split()[0]
                    time_range = f"{start} - {end}"

                next_elem = tb.find_next_sibling()
                d_idx = 0

                while next_elem and 'schedule__time' not in next_elem.get(
                        'class', []):
                    if 'schedule__item' in next_elem.get('class', []):
                        lesson_div = next_elem.find('div',
                                                    class_='schedule__lesson')
                        if lesson_div and d_idx < len(day_names):
                            title_elem = lesson_div.find(
                                'div', class_='schedule__discipline')
                            title = title_elem.get_text().strip(
                            ) if title_elem else ""

                            if title:
                                type_elem = lesson_div.find(
                                    'div', class_='schedule__lesson-type-chip')
                                lesson_type = type_elem.get_text().strip(
                                ) if type_elem else "Лекция"

                                place_elem = lesson_div.find(
                                    'div', class_='schedule__place')
                                room = place_elem.get_text().strip(
                                ) if place_elem else ""

                                teacher_elem = lesson_div.find(
                                    'div', class_='schedule__teacher')
                                teacher = ""
                                if teacher_elem:
                                    link = teacher_elem.find('a')
                                    teacher = link.get_text().strip(
                                    ) if link else teacher_elem.get_text(
                                    ).strip()

                                while len(days) <= d_idx:
                                    days.append({
                                        'day_name':
                                        day_names[len(days)],
                                        'lessons': []
                                    })

                                days[d_idx]['lessons'].append({
                                    'time': time_range,
                                    'title': title,
                                    'type': lesson_type,
                                    'teacher': teacher,
                                    'room': room
                                })
                    d_idx += 1
                    next_elem = next_elem.find_next_sibling()
                day_index += 1

        days = [d for d in days if d['lessons']]

        return {
            'mode': 'group',
            'id': group_id,
            'name': f'Группа {group_id}',
            'week': week or get_current_week(),
            'days': days
        }
    except Exception as e:
        print(f"Ошибка: {e}")
        return {
            'mode': 'group',
            'id': group_id,
            'name': f'Группа {group_id}',
            'week': week or get_current_week(),
            'days': []
        }


def parse_teacher_schedule(teacher_name, week):
    """Парсинг расписания преподавателя"""
    groups = get_groups()
    all_lessons = []
    actual_week = week or get_current_week()

    for group in groups[:5]:
        group_schedule = parse_group_schedule(group['id'], actual_week)
        for day in group_schedule.get('days', []):
            filtered = []
            for lesson in day.get('lessons', []):
                if teacher_name.lower() in lesson.get('teacher', '').lower():
                    filtered.append({
                        'time': lesson.get('time', ''),
                        'title': lesson.get('title', ''),
                        'type': lesson.get('type', ''),
                        'room': lesson.get('room', ''),
                        'group': group['name']
                    })
            if filtered:
                all_lessons.append({
                    'day_name': day['day_name'],
                    'date': day.get('date', ''),
                    'lessons': filtered
                })

    return {
        'mode': 'teacher',
        'id': teacher_name,
        'name': teacher_name,
        'week': actual_week,
        'days': all_lessons
    }


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('static/css', path)


@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('static/js', path)


@app.route('/api/groups')
def api_groups():
    return jsonify(get_groups())


@app.route('/api/teachers')
def api_teachers():
    return jsonify(get_teachers())


@app.route('/api/current-week')
def api_current_week():
    return jsonify({'week': get_current_week()})


@app.route('/api/schedule/group')
def api_schedule_group():
    group_id = request.args.get('groupId')
    week = request.args.get('week', type=int)
    if not group_id:
        return jsonify({'error': 'Не указана группа'}), 400
    return jsonify(parse_group_schedule(group_id, week))


@app.route('/api/schedule/teacher')
def api_schedule_teacher():
    teacher_name = request.args.get('name')
    week = request.args.get('week', type=int)
    if not teacher_name:
        return jsonify({'error': 'Не указан преподаватель'}), 400
    return jsonify(parse_teacher_schedule(teacher_name, week))


if __name__ == '__main__':
    print("\nСервер запущен: http://localhost:5000\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
