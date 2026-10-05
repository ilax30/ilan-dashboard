import { describe, expect, it } from 'vitest'
import type { CalEvent } from './calendarTypes'
import { colorIndex, dayWindow, formatCountdown, greeting, headline, layoutDay, weekDays } from './dayMath'

// Tests draaien in de lokale tijdzone (Nederland); datums zonder 'Z' zijn lokale tijd.
const at = (s: string) => new Date(s)
const ev = (id: string, start: string, end: string, allDay = false): CalEvent => ({
  id,
  title: id,
  start: at(start).toISOString(),
  end: at(end).toISOString(),
  allDay,
})

describe('greeting', () => {
  it('kiest de begroeting per dagdeel', () => {
    expect(greeting(at('2026-10-05T04:59'))).toBe('Goedenacht')
    expect(greeting(at('2026-10-05T05:00'))).toBe('Goedemorgen')
    expect(greeting(at('2026-10-05T11:59'))).toBe('Goedemorgen')
    expect(greeting(at('2026-10-05T12:00'))).toBe('Goedemiddag')
    expect(greeting(at('2026-10-05T18:00'))).toBe('Goedenavond')
  })
})

describe('formatCountdown', () => {
  it('formatteert uren en minuten', () => {
    expect(formatCountdown(74 * 60e3)).toBe('over 1u 14m')
    expect(formatCountdown(60 * 60e3)).toBe('over 1u')
    expect(formatCountdown(5 * 60e3)).toBe('over 5m')
    expect(formatCountdown(30e3)).toBe('over minder dan 1m')
  })
})

describe('headline', () => {
  const now = at('2026-10-05T10:16')
  const werk = ev('Werk', '2026-10-05T09:00', '2026-10-05T12:00')
  const overleg = ev('Overleg', '2026-10-05T11:30', '2026-10-05T12:30')

  it('toont de eerstvolgende afspraak die nog niet begonnen is', () => {
    expect(headline([werk, overleg], now)).toEqual({ kind: 'next', event: overleg })
  })
  it('toont de lopende afspraak als er niets meer volgt', () => {
    expect(headline([werk], now)).toEqual({ kind: 'ongoing', event: werk })
  })
  it('slaat hele-dag-afspraken over', () => {
    expect(headline([ev('Verjaardag', '2026-10-05T00:00', '2026-10-06T00:00', true)], now)).toEqual({ kind: 'none' })
  })
  it('negeert afspraken van morgen', () => {
    expect(headline([ev('Morgen', '2026-10-06T09:00', '2026-10-06T10:00')], now)).toEqual({ kind: 'none' })
  })
})

describe('layoutDay', () => {
  const day = at('2026-10-05T00:00')

  it('zet drie overlappende afspraken in drie kolommen', () => {
    const out = layoutDay(
      [
        ev('a', '2026-10-05T10:00', '2026-10-05T11:00'),
        ev('b', '2026-10-05T10:15', '2026-10-05T10:45'),
        ev('c', '2026-10-05T10:30', '2026-10-05T11:30'),
      ],
      day,
    )
    expect(out.every((b) => b.columns === 3)).toBe(true)
    expect(new Set(out.map((b) => b.column))).toEqual(new Set([0, 1, 2]))
  })
  it('kapt een afspraak over middernacht af tot het eind van de dag', () => {
    const [b] = layoutDay([ev('laat', '2026-10-05T22:30', '2026-10-06T01:00')], day)
    expect(b.startMin).toBe(22 * 60 + 30)
    expect(b.endMin).toBe(1440)
  })
  it('geeft een afspraak van 0 minuten minimaal 20 minuten', () => {
    const [b] = layoutDay([ev('kort', '2026-10-05T12:00', '2026-10-05T12:00')], day)
    expect(b.endMin - b.startMin).toBe(20)
  })
  it('slaat hele-dag-afspraken over', () => {
    expect(layoutDay([ev('hele dag', '2026-10-05T00:00', '2026-10-06T00:00', true)], day)).toEqual([])
  })
})

describe('dayWindow', () => {
  const day = at('2026-10-05T00:00')
  it('is standaard 07:00–23:00', () => {
    expect(dayWindow([], day)).toEqual({ startMin: 420, endMin: 1380 })
  })
  it('breidt uit naar een hele uur voor vroege afspraken', () => {
    expect(dayWindow([ev('vroeg', '2026-10-05T06:15', '2026-10-05T07:00')], day).startMin).toBe(360)
  })
})

describe('weekDays', () => {
  it('geeft maandag t/m zondag van de huidige week', () => {
    const days = weekDays(at('2026-10-07T12:00'))
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual(at('2026-10-05T00:00'))
    expect(days[6]).toEqual(at('2026-10-11T00:00'))
  })
})

describe('colorIndex', () => {
  it('is stabiel per titel en ligt tussen 0 en 5', () => {
    expect(colorIndex('Sportschool')).toBe(colorIndex('Sportschool'))
    for (const t of ['Werk', 'Lunch', 'Sportschool', 'Projectoverleg', '']) {
      const i = colorIndex(t)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThanOrEqual(5)
    }
  })
})
