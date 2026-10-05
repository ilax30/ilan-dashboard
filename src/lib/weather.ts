import { useCallback, useEffect, useRef, useState } from 'react'

// Weer voor de vaste woonplaats, rechtstreeks van Open-Meteo (geen sleutel nodig).

export type Weather = {
  temp: number
  code: number
  max: number
  min: number
  /** Lokale tijd van zonsopkomst/-ondergang vandaag, bijv. "2026-10-05T07:58". */
  sunrise: string | null
  sunset: string | null
  hourly: { time: string; temp: number; rainChance: number; code: number }[]
}

export type WeatherIcon = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm'

const CACHE_KEY = 'dashboard.weather'
const REFRESH_MS = 30 * 60 * 1000

/** WMO-weercode → Nederlandse omschrijving + icoon. */
export function describeWeather(code: number): { text: string; icon: WeatherIcon } {
  if (code === 0) return { text: 'Zonnig', icon: 'sun' }
  if (code === 1) return { text: 'Licht bewolkt', icon: 'partly' }
  if (code === 2) return { text: 'Half bewolkt', icon: 'partly' }
  if (code === 3) return { text: 'Bewolkt', icon: 'cloud' }
  if (code === 45 || code === 48) return { text: 'Mist', icon: 'fog' }
  if (code >= 51 && code <= 57) return { text: 'Motregen', icon: 'rain' }
  if (code >= 61 && code <= 67) return { text: 'Regen', icon: 'rain' }
  if (code >= 71 && code <= 77) return { text: 'Sneeuw', icon: 'snow' }
  if (code >= 80 && code <= 82) return { text: 'Buien', icon: 'rain' }
  if (code === 85 || code === 86) return { text: 'Sneeuwbuien', icon: 'snow' }
  if (code >= 95 && code <= 99) return { text: 'Onweer', icon: 'storm' }
  return { text: 'Wisselend', icon: 'partly' }
}

type Forecast = {
  current?: { temperature_2m?: number; weather_code?: number }
  hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: (number | null)[]; weather_code?: number[] }
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; sunrise?: string[]; sunset?: string[] }
}

/** Open-Meteo-antwoord → Weather. Gooit als er iets wezenlijks ontbreekt. */
export function parseForecast(raw: Forecast): Weather {
  const { current, hourly, daily } = raw
  const temp = current?.temperature_2m
  const code = current?.weather_code
  const max = daily?.temperature_2m_max?.[0]
  const min = daily?.temperature_2m_min?.[0]
  if (typeof temp !== 'number' || typeof code !== 'number' || typeof max !== 'number' || typeof min !== 'number') {
    throw new Error('weather_incomplete')
  }
  const times = hourly?.time ?? []
  return {
    temp,
    code,
    max,
    min,
    sunrise: daily?.sunrise?.[0] ?? null,
    sunset: daily?.sunset?.[0] ?? null,
    hourly: times.map((time, i) => ({
      time,
      temp: hourly?.temperature_2m?.[i] ?? temp,
      rainChance: hourly?.precipitation_probability?.[i] ?? 0,
      code: hourly?.weather_code?.[i] ?? code,
    })),
  }
}

function forecastUrl(lat: number, lon: number) {
  // forecast_days=2: ook 's avonds laat nog een paar uur vooruit kunnen tonen.
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code&hourly=temperature_2m,precipitation_probability,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Europe%2FAmsterdam&forecast_days=2'
  )
}

type Cache = { lat: number; lon: number; fetchedAt: number; weather: Weather }

function readCache(lat: number | null, lon: number | null): Cache | null {
  if (lat === null || lon === null) return null
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Cache | null
    return cache && cache.lat === lat && cache.lon === lon ? cache : null
  } catch {
    return null
  }
}

/** Weer van de woonplaats: direct uit de cache, verversen bij openen, elke 30 min en bij weer online komen. */
export function useWeather(lat: number | null, lon: number | null): { weather: Weather | null; stale: boolean } {
  const [state, setState] = useState(() => ({ weather: readCache(lat, lon)?.weather ?? null, stale: false }))
  const fetchedAt = useRef(readCache(lat, lon)?.fetchedAt ?? 0)

  const refresh = useCallback(async () => {
    if (lat === null || lon === null) return
    try {
      const res = await fetch(forecastUrl(lat, lon))
      if (!res.ok) throw new Error('weather_failed')
      const weather = parseForecast(await res.json())
      fetchedAt.current = Date.now()
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lon, fetchedAt: fetchedAt.current, weather } satisfies Cache))
      } catch {
        // cache is een gemak, geen vereiste
      }
      setState({ weather, stale: false })
    } catch {
      setState((s) => ({ weather: s.weather, stale: s.weather !== null }))
    }
  }, [lat, lon])

  useEffect(() => {
    const cache = readCache(lat, lon)
    fetchedAt.current = cache?.fetchedAt ?? 0
    setState({ weather: cache?.weather ?? null, stale: false })
    if (lat === null || lon === null) return
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)
    const onOnline = () => void refresh()
    // Timers lopen niet door als de app op de achtergrond staat: bij terugkomen inhalen.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - fetchedAt.current > REFRESH_MS) void refresh()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [lat, lon, refresh])

  return state
}

export type CityResult = { name: string; region?: string; country: string; latitude: number; longitude: number }

/** Woonplaats zoeken via Open-Meteo geocoding. */
export async function searchCity(q: string): Promise<CityResult[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&language=nl&count=5&format=json`,
  )
  if (!res.ok) throw new Error('geocoding_failed')
  const data = (await res.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[]
  }
  return (data.results ?? []).map((r) => ({
    name: r.name,
    ...(r.admin1 ? { region: r.admin1 } : {}),
    country: r.country ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}
