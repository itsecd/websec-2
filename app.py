from flask import Flask, jsonify, request, send_from_directory
from scraper import search_ssau, get_schedule

app = Flask(__name__, static_folder='public', static_url_path='')


@app.route('/')
def index():
    return send_from_directory('public', 'index.html')


@app.route('/api/search')
def api_search():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify([])

    results, error = search_ssau(q)
    if error:
        return jsonify({'error': error}), 500
    return jsonify(results)


@app.route('/api/schedule')
def api_schedule():
    entity_type = request.args.get('type', '')
    entity_id = request.args.get('id', '').strip()
    week = request.args.get('week', None)

    if not entity_id:
        return jsonify({'error': 'Не указан id'}), 400
    if entity_type not in ('group', 'teacher'):
        return jsonify({'error': 'Параметр type должен быть group или teacher'}), 400

    week_num = int(week) if week and week.isdigit() else None

    data, error = get_schedule(entity_type, entity_id, week_num)
    if error:
        return jsonify({'error': error}), 500
    return jsonify(data)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=False)
