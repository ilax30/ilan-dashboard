import { describe, expect, it } from 'vitest'
import type { CalEvent } from './calendarTypes'
import { colorIndex, dayWindow, eventsOnDay, formatCountdown, greeting, headline, layoutDay, monthGrid, stripPosition, upcoming, weekDays } from './dayMath'

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
  it('geeft een afspraak van 0 minuten minimaal 30 minuten (leesbaar blok)', () => {
    const [b] = layoutDay([ev('kort', '2026-10-05T12:00', '2026-10-05T12:00')], day)
    expect(b.endMin - b.startMin).toBe(30)
  })
  it('houdt wandkloktijd aan op de dag van de wintertijd (25 okt 2026)', () => {
    const dst = at('2026-10-25T00:00')
    const blocks = layoutDay([ev('loop', '2026-10-25T09:00', '2026-10-25T10:00'), ev('laat', '2026-10-25T23:30', '2026-10-25T23:50')], dst)
    expect(blocks.map((b) => b.startMin)).toEqual([540, 1410])
  })
  it('houdt wandkloktijd aan op de dag van de zomertijd (28 mrt 2027)', () => {
    const [b] = layoutDay([ev('loop', '2027-03-28T09:00', '2027-03-28T10:00')], at('2027-03-28T00:00'))
    expect([b.startMin, b.endMin]).toEqual([540, 600])
  })
  it('kapt op een wintertijd-dag af op de echte middernacht', () => {
    const [b] = layoutDay([ev('nacht', '2026-10-25T22:30', '2026-10-26T01:00')], at('2026-10-25T00:00'))
    expect(b.endMin).toBe(1440)
    expect(layoutDay([ev('morgen', '2026-10-26T00:30', '2026-10-26T01:00')], at('2026-10-25T00:00'))).toEqual([])
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

describe('upcoming', () => {
  const now = at('2026-10-05T11:00')
  const day = [
    ev('Ochtend', '2026-10-05T07:00', '2026-10-05T08:00'),
    ev('Werk', '2026-10-05T09:00', '2026-10-05T12:00'),
    ev('Lunch', '2026-10-05T12:30', '2026-10-05T13:00'),
    ev('Sport', '2026-10-05T17:30', '2026-10-05T18:30'),
    ev('Eten', '2026-10-05T19:00', '2026-10-05T21:00'),
  ]
  it('geeft de eerstvolgende drie afspraken van vandaag die nog niet voorbij zijn', () => {
    const r = upcoming(day, now)
    expect(r.today.map((e) => e.title)).toEqual(['Werk', 'Lunch', 'Sport'])
    expect(r.tomorrow).toBeNull()
  })
  it('telt een afspraak die gisteren begon en nog loopt mee', () => {
    const r = upcoming([ev('Nachtdienst', '2026-10-04T22:00', '2026-10-05T12:00')], now)
    expect(r.today.map((e) => e.title)).toEqual(['Nachtdienst'])
  })
  it('geeft de eerste afspraak van morgen als er vandaag niets meer is', () => {
    const r = upcoming([day[0], ev('Tandarts', '2026-10-06T09:00', '2026-10-06T09:30'), ev('Later', '2026-10-06T14:00', '2026-10-06T15:00')], now)
    expect(r.today).toEqual([])
    expect(r.tomorrow?.title).toBe('Tandarts')
  })
  it('negeert hele-dag-afspraken', () => {
    const r = upcoming([ev('Verjaardag', '2026-10-05T00:00', '2026-10-06T00:00', true)], now)
    expect(r).toEqual({ today: [], tomorrow: null })
  })
})

describe('stripPosition', () => {
  const w = { startMin: 420, endMin: 1380 }
  it('zet minuten om naar een percentage van de dagbalk', () => {
    expect(stripPosition(420, w)).toBe(0)
    expect(stripPosition(1380, w)).toBe(100)
    expect(stripPosition(900, w)).toBe(50)
  })
  it('geeft null buiten het venster (bijv. 01:00 snachts)', () => {
    expect(stripPosition(60, w)).toBeNull()
  })
})

describe('monthGrid', () => {
  it('geeft 35 dagen vanaf maandag van deze week, ook over de wintertijd heen', () => {
    const grid = monthGrid(at('2026-10-07T12:00'))
    expect(grid).toHaveLength(35)
    expect(grid[0]).toEqual(at('2026-10-05T00:00'))
    expect(grid[34]).toEqual(at('2026-11-08T00:00'))
    expect(grid.every((d) => d.getHours() === 0 && d.getMinutes() === 0)).toBe(true)
    expect(new Set(grid.map((d) => `${d.getMonth()}-${d.getDate()}`)).size).toBe(35)
  })
})

describe('eventsOnDay', () => {
  const vakantie = ev('Vakantie', '2026-10-06T00:00', '2026-10-09T00:00', true)
  const tandarts = ev('Tandarts', '2026-10-07T09:00', '2026-10-07T09:30')
  it('zet een meerdaagse hele-dag-afspraak op elke dag die hij beslaat', () => {
    const titles = (d: string) => eventsOnDay([vakantie], at(d)).map((e) => e.title)
    expect(titles('2026-10-06T00:00')).toEqual(['Vakantie'])
    expect(titles('2026-10-07T00:00')).toEqual(['Vakantie'])
    expect(titles('2026-10-08T00:00')).toEqual(['Vakantie'])
    expect(titles('2026-10-09T00:00')).toEqual([])
  })
  it('zet hele-dag-afspraken voor gewone afspraken', () => {
    expect(eventsOnDay([tandarts, vakantie], at('2026-10-07T00:00')).map((e) => e.title)).toEqual(['Vakantie', 'Tandarts'])
  })
  it('telt een afspraak van 0 minuten op die dag mee', () => {
    expect(eventsOnDay([ev('Herinnering', '2026-10-07T00:00', '2026-10-07T00:00')], at('2026-10-07T00:00'))).toHaveLength(1)
  })
})
