import { describe, expect, it } from 'vitest'
import { rememberPlace, rememberedPlace } from './settings'

const memory = () => {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map }
}

describe('rememberPlace / rememberedPlace', () => {
  it('onthoudt woonplaats en coördinaten, zodat het weer offline direct kan tonen', () => {
    const storage = memory()
    rememberPlace({ icalUrl: 'https://calendar.google.com/geheim/basic.ics', cityName: 'Utrecht', latitude: 52.09, longitude: 5.12, layout: null }, storage)
    expect(rememberedPlace(storage)).toEqual({ cityName: 'Utrecht', latitude: 52.09, longitude: 5.12 })
  })

  it('slaat de geheime agenda-link nooit op', () => {
    const storage = memory()
    rememberPlace({ icalUrl: 'https://calendar.google.com/geheim/basic.ics', cityName: 'Utrecht', latitude: 52.09, longitude: 5.12, layout: null }, storage)
    expect([...storage.map.values()].join()).not.toContain('geheim')
  })

  it('geeft null zonder (geldige) opgeslagen plaats', () => {
    expect(rememberedPlace(memory())).toBeNull()
    const storage = memory()
    storage.setItem('dashboard.place', '{kapot')
    expect(rememberedPlace(storage)).toBeNull()
  })
})
