require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const API_KEY = process.env.YANDEX_RASP_KEY
const BASE_URL = process.env.YANDEX_API_BASE_URL || 'https://api.rasp.yandex-net.ru/v3.0'
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS, 10) || 24 * 60 * 60 * 1000

let stationsCache = []
let cacheTimestamp = null

async function yandexRequest(path, params = {}) {
  const url = new URL(BASE_URL + path)
  url.searchParams.set('apikey', API_KEY)
  url.searchParams.set('lang', 'ru_RU')
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const res = await fetch(url.href)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Yandex error ${res.status}: ${text}`)
  }

  return res.json()
}

async function loadStations() {
  const data = await yandexRequest('/stations_list/', {})
  const results = []

  for (const country of data.countries || []) {
    for (const region of country.regions || []) {
      for (const settlement of region.settlements || []) {
        for (const station of settlement.stations || []) {
          const code = station.codes?.yandex_code
          const title = station.title || ''
          const transportType = String(station.transport_type || '').toLowerCase()
          const lat = station.latitude
          const lng = station.longitude

          if (!code || !title || lat == null || lng == null) continue
          if (transportType !== 'train' && transportType !== 'suburban') continue

          results.push({
            code,
            title,
            region: region.title || '',
            settlement: settlement.title || '',
            latitude: lat,
            longitude: lng,
            stationType: station.station_type || '',
            transportType: station.transport_type || ''
          })
        }
      }
    }
  }

  stationsCache = results
  cacheTimestamp = Date.now()
  console.log(`Загружено ${stationsCache.length} ЖД станций`)
}

app.get('/api/rasp/find-stations', async (req, res) => {
  try {
    const query = String(req.query.name || '').trim().toLowerCase()
    const region = req.query.region

    if (query.length < 2) {
      return res.json({ stations: [] })
    }

    const now = Date.now()
    if (!stationsCache.length || !cacheTimestamp || (now - cacheTimestamp) > CACHE_TTL) {
      console.log('Обновление кэша станций...')
      await loadStations()
    }

    let filtered = stationsCache;
    if (query !== 'самара' && query !== 'самарская область') {
      filtered = filtered.filter(station => 
        station.title.toLowerCase().includes(query)
      );
    }

    if (region === 'samara') {
      filtered = filtered.filter(s => 
        s.region && s.region.toLowerCase().includes('самар')
      )
    }

    filtered.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()
      if (aTitle === 'самара' && bTitle !== 'самара') return -1
      if (bTitle === 'самара' && aTitle !== 'самара') return 1
      return aTitle.localeCompare(bTitle)
    })

    res.json({ stations: filtered.slice(0, 50) })
    
  } catch (error) {
    console.error('Ошибка поиска:', error.message)
    res.status(500).json({ message: error.message })
  }
})

app.get('/api/rasp/schedule', async (req, res) => {
  try {
    const { station_code, date } = req.query
    if (!station_code) {
      return res.status(400).json({ error: 'Требуется station_code' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const requestDate = date || today

    console.log(`Запрос расписания для станции ${station_code} на ${requestDate}`)

    const data = await yandexRequest('/schedule/', {
      station: station_code,
      date: requestDate,
      transport_type: 'suburban'
    })

    console.log('Расписание получено:', data.schedule?.length || 0, 'поездов')
    res.json(data)
  } catch (error) {
    console.error('Ошибка расписания:', error.message)
    res.status(500).json({ error: error.message, fallback: true })
  }
})

app.get('/api/rasp/route', async (req, res) => {
  try {
    const { from, to, date } = req.query
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Требуются параметры from и to' })
    }

    console.log(`Поиск маршрута: ${from} → ${to} на ${date}`)

    const data = await yandexRequest('/search/', {
      from,
      to,
      date: date || new Date().toISOString().slice(0, 10),
      transport_type: 'suburban'
    })

    console.log('Найдено сегментов:', data.segments?.length || 0)
    res.json(data)
    
  } catch (error) {
    console.error('Ошибка маршрута:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/rasp/nearest', async (req, res) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'Нужны корректные lat и lng' })
  }

  try {
    const data = await yandexRequest('/nearest_stations/', {
      lat,
      lng,
      distance: 25,
      limit: 10,
      transport_types: 'train,suburban'
    })

    const stations = (data.stations || []).map(station => ({
      code: station.code || station.codes?.yandex_code || '',
      title: station.title || '',
      latitude: Number(station.lat || station.latitude || 0),
      longitude: Number(station.lng || station.longitude || 0),
      distance: Number(station.distance || 0)
    }))

    res.json({ stations })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.get('/api/rasp/:endpoint', async (req, res) => {
  try {
    let { endpoint } = req.params
    endpoint = endpoint.replace(/^\/+|\/+$/g, '') + '/'
    
    const data = await yandexRequest(endpoint, req.query)
    res.json(data)
  } catch (error) {
    console.error('Proxy error:', error.message)
    res.status(500).json({ message: error.message })
  }
})

const PORT = process.env.PORT || 3001

loadStations().then(() => {
  app.listen(PORT, () => {
    console.log(`Прокси-сервер запущен: http://localhost:${PORT}`)
  })
}).catch(error => {
  console.error('Не удалось загрузить станции:', error)
  app.listen(PORT, () => {
    console.log(`Сервер запущен без кэша: http://localhost:${PORT}`)
  })
})