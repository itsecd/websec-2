import pandas as pd
import json

try:
    df = pd.read_csv('allsettlements.csv', sep=';', encoding='utf-8', low_memory=False)
except FileNotFoundError:
    print("Ошибка: Файл allsettlements.csv не найден в папке со скриптом.")
    exit()

df['object_level'] = df['object_level'].str.strip().str.lower()

mask = (
    ((df['object_level'] == 'населенный пункт') | (df['object_level'] == 'город федерального значения')) &
    (df['latitude_dadata'].notna()) &
    (df['longitude_dadata'].notna())
)
df_clean = df[mask].copy()

if df_clean.empty:
    print("Внимание: Фильтр вернул 0 строк.")
    print("Доступные значения в object_level:", df['object_level'].unique()[:10])
    exit()

df_clean['population'] = pd.to_numeric(df_clean['population'], errors='coerce').fillna(0)

top_1000 = df_clean.nlargest(1000, 'population')[
    ['settlement', 'region', 'latitude_dadata', 'longitude_dadata', 'population']
]

top_1000.to_json('cities.json', orient='records', force_ascii=False, indent=2)

print(f"Готово! Записано объектов: {len(top_1000)}")