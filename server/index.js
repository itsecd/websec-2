require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const YANDEX_API = 'https://api.rasp.yandex-net.ru/v3.0';
const API_KEY = process.env.YANDEX_RASP_KEY;

app.get('/api/rasp/:endpoint', async (req, res) => {
  try {
    let { endpoint } = req.params;
    
    endpoint = endpoint.replace(/^\/+|\/+$/g, '') + '/';
    
    const queryParams = new URLSearchParams({
      apikey: API_KEY,
      lang: 'ru_RU'  
    });
    
    Object.keys(req.query).forEach(key => {
      if (key !== 'apikey' && key !== 'lang') {
        queryParams.append(key, req.query[key]);
      }
    });
    
    const url = `${YANDEX_API}/${endpoint}?${queryParams.toString()}`;
    console.log('Запрос к Яндексу:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Yandex API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    res.json(data);
    
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Прокси-сервер запущен: http://localhost:${PORT}`));