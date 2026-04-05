from flask import Flask, jsonify, send_from_directory, request
from app.ssau_client import SsauClient
from app.ssau_parser import parse_schedule

app = Flask(__name__, static_folder='../static')
client = SsauClient()

@app.route('/')
def index():
    return send_from_directory('../static', 'index.html')

@app.route('/api/institutes')
def get_institutes():
    try:
        institutes = client.get_institutes()
        result = [{"id": inst_id, "name": name} for inst_id, name in institutes]
        return jsonify({"institutes": result})
    except Exception as e:
        print(f"Ошибка: {e}")
        return jsonify({"institutes": []})

@app.route('/api/groups')
def get_groups():
    institute_id = request.args.get('institute_id', type=int)
    course = request.args.get('course', type=int)
    
    if course is None:
        try:
            courses = client.get_available_courses(institute_id)
            return jsonify({"available_courses": courses})
        except Exception as e:
            print(f"Ошибка получения курсов: {e}")
            return jsonify({"available_courses": [1, 2, 3, 4, 5]})
    else:
        try:
            groups = client.get_groups_by_course(institute_id, course)
            result = [{"id": group_id, "name": name} for group_id, name in groups]
            return jsonify({"groups": result})
        except Exception as e:
            print(f"Ошибка получения групп: {e}")
            return jsonify({"groups": []})
        
@app.route('/api/teachers')
def search_teachers():
    query = request.args.get('q', '')
    if len(query) < 2:
        return jsonify({"teachers": []})
    
    try:
        teachers = client.search_teachers(query)
        return jsonify({"teachers": teachers})
    except Exception as e:
        print(f"Ошибка поиска: {e}")
        return jsonify({"teachers": []})

@app.route('/api/schedule/group')
def get_schedule():
    group_id = request.args.get('group_id', type=int)
    week = request.args.get('week', 0, type=int)
    
    if not group_id:
        return jsonify({"error": "group_id required"}), 400
    
    try:
        html = client.get_schedule_html(group_id, week)
        schedule = parse_schedule(html)
        
        return jsonify({
            "entity_name": schedule.entity_name,
            "week_number": schedule.week_number,
            "week_label": schedule.week_label,
            "week_dates": schedule.week_dates,
            "week_start_date": schedule.week_start_date,
            "week_end_date": schedule.week_end_date,
            "prev_week": schedule.prev_week,
            "next_week": schedule.next_week,
            "time_slots": [{"time_start": ts[0], "time_end": ts[1]} for ts in schedule.time_slots],
            "days": [
                {
                    "weekday": day.weekday,
                    "date": day.date,
                    "date_iso": day.date_iso,
                    "lessons": [
                        {
                            "time_start": lesson.time_start,
                            "time_end": lesson.time_end,
                            "subject": lesson.subject,
                            "lesson_type": lesson.lesson_type,
                            "room": lesson.room,
                            "teachers": lesson.teachers,
                            "groups": lesson.groups,
                            "subgroup": lesson.subgroup,
                            "comment": lesson.comment
                        }
                        for lesson in day.lessons
                    ]
                }
                for day in schedule.days
            ]
        })
    except Exception as e:
        print(f"Ошибка получения расписания: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/schedule/teacher')
def get_schedule_teacher():
    staff_id = request.args.get('staff_id', type=int)
    week = request.args.get('week', 0, type=int)
    
    if not staff_id:
        return jsonify({"error": "staff_id required"}), 400
    
    try:
        html = client.get_teacher_schedule_html(staff_id, week)
        schedule = parse_schedule(html)
        
        return jsonify({
            "entity_name": schedule.entity_name,
            "week_number": schedule.week_number,
            "week_label": schedule.week_label,
            "week_dates": schedule.week_dates,
            "week_start_date": schedule.week_start_date,
            "week_end_date": schedule.week_end_date,
            "prev_week": schedule.prev_week,
            "next_week": schedule.next_week,
            "time_slots": [{"time_start": ts[0], "time_end": ts[1]} for ts in schedule.time_slots],
            "days": [
                {
                    "weekday": day.weekday,
                    "date": day.date,
                    "date_iso": day.date_iso,
                    "lessons": [
                        {
                            "time_start": lesson.time_start,
                            "time_end": lesson.time_end,
                            "subject": lesson.subject,
                            "lesson_type": lesson.lesson_type,
                            "room": lesson.room,
                            "teachers": lesson.teachers,
                            "groups": lesson.groups,
                            "subgroup": lesson.subgroup,
                            "comment": lesson.comment
                        }
                        for lesson in day.lessons
                    ]
                }
                for day in schedule.days
            ]
        })
    except Exception as e:
        print(f"Ошибка получения расписания преподавателя: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)