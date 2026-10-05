import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ICAL from 'ical.js'
import { describe, expect, it } from 'vitest'
import { amsterdamDayStart, calendarRange, expandEvents } from './expand'

const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')
// Bereik in UTC-momenten: 5 okt 00:00 t/m 13 okt 00:00 Amsterdamse tijd (CEST = UTC+2).
const START = new Date('2026-10-04T22:00:00Z')
const END = new Date('2026-10-12T22:00:00Z')

describe('expandEvents', () => {
  it('leest een losse afspraak met tijdzone', () => {
    const events = expandEvents(ICAL, fixture('single.ics'), START, END)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      title: 'Projectoverleg',
      location: 'Kantoor',
      allDay: false,
      start: '2026-10-05T08:30:00.000Z',
      end: '2026-10-05T09:30:00.000Z',
    })
  })

  it('vouwt een wekelijkse afspraak uit en slaat EXDATE over', () => {
    const starts = expandEvents(ICAL, fixture('weekly.ics'), START, new Date('2026-10-19T22:00:00Z')).map((e) => e.start)
    expect(starts).toContain('2026-10-05T07:00:00.000Z')
    expect(starts).not.toContain('2026-10-12T07:00:00.000Z')
    expect(starts).toContain('2026-10-19T07:00:00.000Z')
  })

  it('houdt 09:00 lokale tijd aan over de wintertijd-overgang (25 okt 2026)', () => {
    const starts = expandEvents(ICAL, fixture('dst.ics'), new Date('2026-10-17T22:00:00Z'), new Date('2026-11-01T23:00:00Z')).map(
      (e) => e.start,
    )
    expect(starts).toEqual(['2026-10-18T07:00:00.000Z', '2026-10-25T08:00:00.000Z', '2026-11-01T08:00:00.000Z'])
  })

  it('gebruikt een verplaatste instantie (RECURRENCE-ID)', () => {
    const events = expandEvents(ICAL, fixture('override.ics'), START, END)
    const oct5 = events.filter((e) => e.start.startsWith('2026-10-05'))
    expect(oct5).toHaveLength(1)
    expect(oct5[0]).toMatchObject({ title: 'Sportschool (verplaatst)', start: '2026-10-05T12:00:00.000Z' })
  })

  it('zet hele-dag-afspraken op Amsterdamse middernachten', () => {
    const [e] = expandEvents(ICAL, fixture('allday.ics'), START, END)
    expect(e).toMatchObject({
      title: 'Verjaardag Sanne',
      allDay: true,
      start: '2026-10-04T22:00:00.000Z',
      end: '2026-10-05T22:00:00.000Z',
    })
  })

  it('geeft afspraken gesorteerd op start terug', () => {
    const events = expandEvents(ICAL, fixture('weekly.ics'), new Date('2026-09-06T22:00:00Z'), END)
    const starts = events.map((e) => e.start)
    expect([...starts].sort()).toEqual(starts)
  })

  it('vindt afspraken van een dagelijkse reeks die al sinds 1990 loopt', () => {
    const t0 = performance.now()
    const events = expandEvents(ICAL, fixture('daily-old.ics'), START, END)
    expect(events.map((e) => e.start)[0]).toBe('2026-10-05T07:00:00.000Z')
    expect(events).toHaveLength(8)
    expect(performance.now() - t0).toBeLessThan(1500)
  })

  it('gooit parse_failed bij een ongeldig bestand (bijv. een 404-pagina)', () => {
    expect(() => expandEvents(ICAL, '<html>404</html>', START, END)).toThrow('parse_failed')
  })
})

describe('calendarRange', () => {
  it('loopt van maandag van deze week tot en met 7 dagen na vandaag', () => {
    // woensdag 7 okt 2026
    expect(calendarRange(new Date('2026-10-07T10:00:00Z'))).toEqual({
      start: new Date('2026-10-04T22:00:00Z'),
      end: new Date('2026-10-14T22:00:00Z'),
    })
  })
  it('begint op maandag zelf als het maandag is, en zondag hoort bij dezelfde week', () => {
    expect(calendarRange(new Date('2026-10-05T06:00:00Z')).start).toEqual(new Date('2026-10-04T22:00:00Z'))
    expect(calendarRange(new Date('2026-10-11T20:00:00Z')).start).toEqual(new Date('2026-10-04T22:00:00Z'))
  })
  it('gebruikt Amsterdamse middernachten rond de wintertijd', () => {
    // maandag 26 okt 2026, net na de overgang: UTC+1
    expect(calendarRange(new Date('2026-10-26T10:00:00Z')).start).toEqual(new Date('2026-10-25T23:00:00Z'))
    // zondag 25 okt: week begon op ma 19 okt (nog zomertijd)
    expect(calendarRange(new Date('2026-10-25T10:00:00Z'))).toEqual({
      start: new Date('2026-10-18T22:00:00Z'),
      end: new Date('2026-11-01T23:00:00Z'),
    })
  })
})

describe('amsterdamDayStart', () => {
  it('geeft middernacht Amsterdamse tijd van de huidige dag', () => {
    expect(amsterdamDayStart(new Date('2026-10-05T08:16:00Z')).toISOString()).toBe('2026-10-04T22:00:00.000Z')
    // 01:30 lokaal op 5 okt is in UTC nog 4 okt
    expect(amsterdamDayStart(new Date('2026-10-04T23:30:00Z')).toISOString()).toBe('2026-10-04T22:00:00.000Z')
    // na de wintertijd: UTC+1
    expect(amsterdamDayStart(new Date('2026-11-02T10:00:00Z')).toISOString()).toBe('2026-11-01T23:00:00.000Z')
  })
})
