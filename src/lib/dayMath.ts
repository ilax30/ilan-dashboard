import type { CalEvent } from './calendarTypes'

const MIN = 60_000
const DAY_MIN = 24 * 60
const MIN_BLOCK = 30 // kortste blok in de tijdlijn (minuten): één regel tekst moet passen
const WINDOW = { startMin: 7 * 60, endMin: 23 * 60 }

export function greeting(date: Date): 'Goedemorgen' | 'Goedemiddag' | 'Goedenavond' | 'Goedenacht' {
  const h = date.getHours()
  if (h < 5) return 'Goedenacht'
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

/** "over 1u 14m", "over 1u", "over 5m", "over minder dan 1m". */
export function formatCountdown(ms: number): string {
  const total = Math.floor(ms / MIN)
  if (total < 1) return 'over minder dan 1m'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `over ${m}m`
  return m === 0 ? `over ${h}u` : `over ${h}u ${m}m`
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()

/**
 * Wat de kop toont: de eerstvolgende afspraak van vandaag die nog niet begonnen is;
 * anders een lopende afspraak; anders niets. Hele-dag-afspraken tellen niet mee.
 */
export function headline(events: CalEvent[], now: Date): { kind: 'next' | 'ongoing' | 'none'; event?: CalEvent } {
  const timed = events
    .filter((e) => !e.allDay && sameDay(new Date(e.start), now))
    .sort((a, b) => a.start.localeCompare(b.start))
  const next = timed.find((e) => new Date(e.start) > now)
  if (next) return { kind: 'next', event: next }
  const ongoing = timed.find((e) => new Date(e.start) <= now && new Date(e.end) > now)
  if (ongoing) return { kind: 'ongoing', event: ongoing }
  return { kind: 'none' }
}

/** Lokale middernacht van de dag na `day` (op zomer-/wintertijddagen 23 of 25 uur later). */
export const nextDayStart = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
const clockMin = (d: Date) => d.getHours() * 60 + d.getMinutes()

/**
 * Afspraak als wandkloktijd in minuten (09:00 = 540) op `day`, afgekapt tot de dag, minimaal MIN_BLOCK lang.
 * Wandklok in plaats van verstreken tijd, zodat het raster ook op zomer-/wintertijddagen klopt.
 */
function minutesOnDay(e: CalEvent, day: Date): { startMin: number; endMin: number } | null {
  const dayStart = startOfDay(day)
  const dayEnd = nextDayStart(day)
  const s = new Date(e.start)
  const en = new Date(e.end)
  if (en <= dayStart && s < dayStart) return null
  if (s >= dayEnd) return null
  const startMin = s < dayStart ? 0 : clockMin(s)
  const rawEnd = en >= dayEnd ? DAY_MIN : clockMin(en)
  const endMin = Math.min(DAY_MIN, Math.max(rawEnd, startMin + MIN_BLOCK))
  return { startMin, endMin }
}

/** Zichtbaar uurvenster: 07:00–23:00, uitgebreid naar hele uren als afspraken erbuiten vallen. */
export function dayWindow(events: CalEvent[], day: Date): { startMin: number; endMin: number } {
  let { startMin, endMin } = WINDOW
  for (const e of events) {
    if (e.allDay) continue
    const m = minutesOnDay(e, day)
    if (!m) continue
    startMin = Math.min(startMin, Math.floor(m.startMin / 60) * 60)
    endMin = Math.max(endMin, Math.ceil(m.endMin / 60) * 60)
  }
  return { startMin, endMin }
}

export type DayBlock = { event: CalEvent; startMin: number; endMin: number; column: number; columns: number }

/** Afspraken van één dag als blokken; overlappende afspraken krijgen elk een eigen kolom. */
export function layoutDay(events: CalEvent[], day: Date): DayBlock[] {
  const items = events
    .filter((e) => !e.allDay)
    .map((event) => ({ event, m: minutesOnDay(event, day) }))
    .filter((x): x is { event: CalEvent; m: { startMin: number; endMin: number } } => x.m !== null)
    .sort((a, b) => a.m.startMin - b.m.startMin || b.m.endMin - a.m.endMin)

  const out: DayBlock[] = []
  let cluster: DayBlock[] = []
  let clusterEnd = -1
  let colEnds: number[] = []

  const flush = () => {
    const columns = colEnds.length
    for (const b of cluster) b.columns = columns
    out.push(...cluster)
    cluster = []
    colEnds = []
  }

  for (const { event, m } of items) {
    if (m.startMin >= clusterEnd && cluster.length) flush()
    let column = colEnds.findIndex((end) => end <= m.startMin)
    if (column === -1) {
      column = colEnds.length
      colEnds.push(m.endMin)
    } else {
      colEnds[column] = m.endMin
    }
    cluster.push({ event, startMin: m.startMin, endMin: m.endMin, column, columns: 1 })
    clusterEnd = Math.max(clusterEnd, m.endMin)
  }
  if (cluster.length) flush()
  return out
}

/** Maandag t/m zondag van de week van `now`, elk om lokale middernacht. */
export function weekDays(now: Date): Date[] {
  const today = startOfDay(now)
  const offset = (today.getDay() + 6) % 7 // maandag = 0
  return Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset + i))
}

/** Vaste kleur (0–5) per afspraaktitel, zodat "Sportschool" altijd dezelfde kleur heeft. */
export function colorIndex(title: string): number {
  let h = 0
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 6
}
