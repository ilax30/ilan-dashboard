import { describe, expect, it } from 'vitest'
import type { CalEvent } from './calendarTypes'
import { agendaList, monthMatrix, rangeBounds } from './agendaPage'

const at = (s: string) => new Date(s)
const ev = (id: string, start: string, end: string, allDay = false): CalEvent => ({
  id,
  title: id,
  start: at(start).toISOString(),
  end: at(end).toISOString(),
  allDay,
})

describe('agendaList', () => {
  const now = at('2026-10-05T10:00')
  it('groepeert per dag, slaat lege dagen over en zet hele-dag apart', () => {
    const list = agendaList(
      [
        ev('Werk', '2026-10-05T09:00', '2026-10-05T17:00'),
        ev('Tandarts', '2026-10-06T08:30', '2026-10-06T09:00'),
        ev('Vakantie', '2026-10-08T00:00', '2026-10-10T00:00', true),
      ],
      now,
    )
    expect(list.map((d) => d.day.getDate())).toEqual([5, 6, 8, 9])
    expect(list[0].timed.map((e) => e.title)).toEqual(['Werk'])
    expect(list[2].allDay.map((e) => e.title)).toEqual(['Vakantie'])
    expect(list[3].allDay.map((e) => e.title)).toEqual(['Vakantie'])
  })
  it('kijkt standaard 14 dagen vooruit', () => {
    const list = agendaList([ev('Ver weg', '2026-10-25T09:00', '2026-10-25T10:00'), ev('Net', '2026-10-18T09:00', '2026-10-18T10:00')], now)
    expect(list.map((d) => d.day.getDate())).toEqual([18])
  })
  it('laat afspraken van eerder vandaag die al voorbij zijn staan (hele dag zichtbaar)', () => {
    expect(agendaList([ev('Ontbijt', '2026-10-05T07:00', '2026-10-05T08:00')], now)).toHaveLength(1)
  })
})

describe('monthMatrix', () => {
  it('begint op maandag en vult hele weken (oktober 2026: 5 weken)', () => {
    const m = monthMatrix(at('2026-10-15T12:00'))
    expect(m).toHaveLength(35)
    expect(m[0]).toEqual(at('2026-09-28T00:00'))
    expect(m[34]).toEqual(at('2026-11-01T00:00'))
  })
  it('gebruikt 6 weken als de maand dat nodig heeft (november 2026)', () => {
    const m = monthMatrix(at('2026-11-01T12:00'))
    expect(m).toHaveLength(42)
    expect(m[0]).toEqual(at('2026-10-26T00:00'))
  })
})

describe('rangeBounds', () => {
  it('loopt van maandag van deze week t/m 90 dagen later', () => {
    expect(rangeBounds(at('2026-10-07T12:00'))).toEqual({ first: at('2026-10-05T00:00'), last: at('2027-01-03T00:00') })
  })
})
