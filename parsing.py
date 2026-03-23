import requests 
from bs4 import BeautifulSoup
from flask import Flask, jsonify, Response
from flask_cors import CORS
import json

app=Flask(__name__)
CORS(app)

@app.route('/api/groups')
def groups():
    url="https://ssau.ru/rasp/faculty/492430598?course=4"

    try: 
        response=requests.get(url)
        soup= BeautifulSoup(response.text, 'html.parser')

        groups=[]
        group_list=soup.select(".group-catalog__group")

        for g in group_list:
            group_number=g.find('span').text.strip()
            href=g['href']
            group_id=href.split("groupId=")[-1]

            groups.append({
                "group_number": group_number,
                "id": group_id
            })
        return Response(json.dumps(groups, ensure_ascii=False), mimetype='application/json') 
    except Exception as e:
        return jsonify({"error": "Сайт недоступен, попробуйте позже."}), 500

@app.route('/api/timetable/<group_id>')
def timetable(group_id):
    url = f"https://ssau.ru/rasp?groupId={group_id}"

    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')

        timetable = []

        lessons = soup.select(".schedule__lesson")

        for lesson in lessons:
            subject = lesson.select_one(".schedule__discipline")
            teacher = lesson.select_one(".schedule__teacher a")
            place = lesson.select_one(".schedule__place")
            lesson_type = lesson.select_one(".schedule__lesson-type-chip")

            timetable.append({
                "lesson": subject.text.strip() if subject else "—",
                "lecturer": teacher.text.strip() if teacher else "—",
                "place": place.text.strip() if place else "—",
                "type": lesson_type.text.strip() if lesson_type else "—"
            })

        return Response(json.dumps(timetable, ensure_ascii=False), mimetype='application/json')

    except Exception as e:
        print(e)
        return jsonify({"error": "Ошибка парсинга"}), 500

def parse_lecturers():
    url = "https://ssau.ru/staff"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    teachers = {}
    for li in soup.select("ul.list-group > li.list-group-item"):
        a_tag = li.find("a")
        if a_tag:
            href = a_tag.get("href")
            staff_id = href.split("/")[-1]
            name = a_tag.text.strip()
            teachers[staff_id] = name
    return teachers

lecturers_dict = parse_lecturers()

@app.route('/api/lecturers')
def get_lecturers():
    return Response(json.dumps(lecturers_dict, ensure_ascii=False), mimetype='application/json')


if __name__ == '__main__':
    app.run(debug=True)
