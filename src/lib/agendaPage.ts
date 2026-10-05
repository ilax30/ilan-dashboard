import type { CalEvent } from './calendarTypes'
import { eventsOnDay, weekDays } from './dayMath'

// Logica voor de agendapagina: lijst van komende dagen, maandraster en het opgehaalde bereik.

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export type AgendaDay = { day: Date; allDay: CalEvent[]; timed: CalEvent[] }

/** Komende `days` dagen (vanaf vandaag) met afspraken; lege dagen weggelaten, hele-dag apart. */
export function agendaList(events: CalEvent[], now: Date, days = 14): AgendaDay[] {
  const today = startOfDay(now)
  const out: AgendaDay[] = []
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i)
    const list = eventsOnDay(events, day)
    if (!list.length) continue
    out.push({ day, allDay: list.filter((e) => e.allDay), timed: list.filter((e) => !e.allDay) })
  }
  return out
}

/** Kalendermaand als raster van hele weken (maandag eerst): 35 of 42 datums. */
export function monthMatrix(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7
  return Array.from({ length: cells }, (_, i) => addDays(first, i - lead))
}

/** Opgehaald bereik: maandag van deze week t/m 90 dagen later (13 weken). */
export function rangeBounds(now: Date): { first: Date; last: Date } {
  const first = weekDays(now)[0]
  return { first, last: addDays(first, 90) }
}
