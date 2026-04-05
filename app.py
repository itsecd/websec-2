from flask import Flask, request, jsonify, render_template
import urllib.request
import urllib.error
import json
from datetime import datetime
application = Flask(__name__)
EOL_API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc1MDU2NDQ5LCJpYXQiOjE3NzUwNTYxNDksImp0aSI6IjcwODcwNjQ0MzZhMTRiYTM4OTM0NTZiODVhNjQyOTI5IiwidXNlcl9pZCI6IjM2MDYifQ.Xu4-XGRIm16hwlFAn2GZW5KW9HKH4NB0gFKb3C2hxtA"
@application.route('/')
def index():
    return render_template('index.html')
@application.route('/api/weather')
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({"error": "Укажите координаты lat и lon"}), 400
    try:
        import concurrent.futures
        from datetime import timedelta
        def fetch_date(date_str):
            u = f"https://projecteol.ru/api/weather?lat={lat}&lon={lon}&date={date_str}&token={EOL_API_TOKEN}"
            return json.loads(urllib.request.urlopen(urllib.request.Request(u)).read().decode('utf-8'))
        base_date = datetime.now()
        dates_to_fetch = [(base_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(15)]
        all_data = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            results = executor.map(fetch_date, dates_to_fetch)
            for res in results:
                all_data.extend(res)
        return jsonify(all_data)
    except urllib.error.HTTPError as e:
        val = e.read().decode('utf-8')
        return jsonify({"error": "Ошибка API", "details": val}), e.code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
if __name__ == '__main__':
    application.run(debug=True, port=5000)