// Dagdeel (voor het landschap) en hoeveel van de dag er al voorbij is (voor de kop).

export type DayPart = 'ochtend' | 'dag' | 'avond' | 'nacht'

const MIN = 60_000
const DAY_START = 7 * 60 // 07:00
const DAY_END = 23 * 60 // 23:00

/**
 * Ochtend = zonsopkomst −45 … +90 min, avond = zonsondergang −90 … +45 min, daartussen dag, anders nacht.
 * Zonder zonnetijden: 07:00 en 19:00.
 */
export function dayPart(now: Date, sunrise: Date | null, sunset: Date | null): DayPart {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const op = (sunrise ?? new Date(y, m, d, 7)).getTime()
  const onder = (sunset ?? new Date(y, m, d, 19)).getTime()
  const t = now.getTime()
  if (t < op - 45 * MIN) return 'nacht'
  if (t <= op + 90 * MIN) return 'ochtend'
  if (t < onder - 90 * MIN) return 'dag'
  if (t <= onder + 45 * MIN) return 'avond'
  return 'nacht'
}

/** Percentage van de dag (07:00–23:00) dat voorbij is, 0–100. */
export function dayProgress(now: Date): number {
  const min = now.getHours() * 60 + now.getMinutes()
  return Math.round(Math.min(100, Math.max(0, ((min - DAY_START) / (DAY_END - DAY_START)) * 100)))
}

/** Kloktijd uit een (eventueel oude) tijdstempel "2026-10-05T07:58" toepassen op de dag van `now`. */
export function todayAt(stamp: string | null, now: Date): Date | null {
  const match = stamp?.match(/T(\d{2}):(\d{2})/)
  if (!match) return null
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(match[1]), Number(match[2]))
}
