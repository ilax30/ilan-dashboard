import { describe, expect, it } from 'vitest'
import { describeWeather, parseForecast } from './weather'

describe('describeWeather', () => {
  it.each([
    [0, 'Zonnig', 'sun'],
    [2, 'Half bewolkt', 'partly'],
    [3, 'Bewolkt', 'cloud'],
    [45, 'Mist', 'fog'],
    [61, 'Regen', 'rain'],
    [71, 'Sneeuw', 'snow'],
    [95, 'Onweer', 'storm'],
  ])('code %i → %s', (code, text, icon) => {
    expect(describeWeather(code)).toEqual({ text, icon })
  })

  it('onbekende code → Wisselend', () => {
    expect(describeWeather(12345).text).toBe('Wisselend')
  })
})

describe('parseForecast', () => {
  const raw = {
    current: { temperature_2m: 14.6, weather_code: 3 },
    hourly: {
      time: ['2026-10-05T10:00', '2026-10-05T11:00'],
      temperature_2m: [14.1, 15.4],
      precipitation_probability: [10, 40],
      weather_code: [3, 61],
    },
    daily: { temperature_2m_max: [17.2], temperature_2m_min: [9.8] },
  }

  it('zet het Open-Meteo-antwoord om naar Weather', () => {
    expect(parseForecast(raw)).toEqual({
      temp: 14.6,
      code: 3,
      max: 17.2,
      min: 9.8,
      sunrise: null,
      sunset: null,
      hourly: [
        { time: '2026-10-05T10:00', temp: 14.1, rainChance: 10, code: 3 },
        { time: '2026-10-05T11:00', temp: 15.4, rainChance: 40, code: 61 },
      ],
    })
  })

  it('neemt zonsopkomst en -ondergang mee als ze er zijn', () => {
    const withSun = { ...raw, daily: { ...raw.daily, sunrise: ['2026-10-05T07:58'], sunset: ['2026-10-05T19:05'] } }
    expect(parseForecast(withSun)).toMatchObject({ sunrise: '2026-10-05T07:58', sunset: '2026-10-05T19:05' })
    expect(parseForecast(raw)).toMatchObject({ sunrise: null, sunset: null })
  })

  it('gooit bij een onvolledig antwoord', () => {
    expect(() => parseForecast({ current: {} })).toThrow()
  })
})
