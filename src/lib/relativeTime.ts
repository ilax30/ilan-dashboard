import { useEffect, useState } from 'react'

const MIN = 60
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** "net", "12 min", "3 uur", "2 dagen", "5 weken", "4 maanden", "1 jaar" */
export function sinceLabel(iso: string, now: number): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < MIN) return 'net'
  if (s < HOUR) return `${Math.floor(s / MIN)} min`
  if (s < DAY) return `${Math.floor(s / HOUR)} uur`
  if (s < WEEK) return plural(Math.floor(s / DAY), 'dag', 'dagen')
  if (s < MONTH) return plural(Math.floor(s / WEEK), 'week', 'weken')
  if (s < YEAR) return plural(Math.floor(s / MONTH), 'maand', 'maanden')
  return plural(Math.floor(s / YEAR), 'jaar', 'jaar')
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })
}

/** Huidige tijd, ververst elke 30 seconden zodat labels meelopen. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
