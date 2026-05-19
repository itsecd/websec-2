import pandas as pd
import json

# 1. Загружаем датасет напрямую из источника
url = "data_allsettlements_anon_156_v20251217.csv"

df = pd.read_csv(url, sep=';')

df = df[(df['object_level'].astype(str).str.strip() == 'Населенный пункт') | (df['object_level'].astype(str).str.strip() == 'Город федерального значения')]

# Сортируем по колонке населения (обычно 'population') и берем топ-1000
top_settlements = df.nlargest(1000, 'population')

# Формируем чистый JSON для фронтенда
result = []
for _, row in top_settlements.iterrows():
    result.append({
        "name": row['object_name'],
        "lat": float(row['latitude_dadata']),
        "lon": float(row['longitude_dadata']),
        "population": int(row['population'])
    })

# 4. Сохраняем в файл проекта
with open('settlements.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)