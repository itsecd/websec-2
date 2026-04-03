import csv
import json

cities = []

print("Читаем CSV файл...")

with open('data.csv', mode='r', encoding='utf-8') as file:
    reader = csv.reader(file, delimiter=';')
    
    # Пропускаем первую строку с заголовками
    next(reader, None)
    
    for row in reader:
        if len(row) < 21:
            continue
            
        object_level = row[0]
        name = row[1]
        pop_str = row[7]
        lat_str = row[19]
        lon_str = row[20]
        
        # Берем только населенные пункты, у которых указано население и координаты
        if object_level == 'Населенный пункт' and pop_str and lat_str and lon_str:
            try:
                pop = int(pop_str)
                lat = float(lat_str)
                lon = float(lon_str)
                
                cities.append({
                    'name': name,
                    'lat': lat,
                    'lon': lon,
                    'pop': pop
                })
            except ValueError:
                # Если в числах попался мусор - просто пропускаем строку
                continue

print(f"Всего найдено корректных населенных пунктов: {len(cities)}")

# Сортируем по убыванию населения
cities.sort(key=lambda x: x['pop'], reverse=True)

# Отрезаем топ-1000 
top_1000 = [{'name': c['name'], 'lat': c['lat'], 'lon': c['lon']} for c in cities[:1000]]

# Сохраняем в JSON
with open('cities.json', mode='w', encoding='utf-8') as json_file:
    json.dump(top_1000, json_file, ensure_ascii=False, indent=2)

print("Готово! Файл cities.json успешно создан.")