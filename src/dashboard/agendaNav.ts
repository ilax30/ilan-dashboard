import { weekDays } from '../lib/dayMath'

// Bladeren in de agenda: per dag, week of maand, altijd binnen het opgehaalde bereik.

export type AgendaView = 'day' | 'week' | 'month'
export type Bounds = { first: Date; last: Date }

/** Een dag, week of maand verder/terug (maand → de 1e van die maand), op lokale middernacht. */
export function step(view: AgendaView, anchor: Date, dir: -1 | 1): Date {
  if (view === 'month') return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)
  const days = view === 'day' ? 1 : 7
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + dir * days)
}

/** Mag je die kant op bladeren? Dag/week: het doel ligt in het bereik. Maand: de maand raakt het bereik. */
export function canStep(view: AgendaView, anchor: Date, dir: -1 | 1, bounds: Bounds): boolean {
  const first = bounds.first.getTime()
  const last = bounds.last.getTime()
  if (view === 'month') {
    const start = step('month', anchor, dir)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return end.getTime() >= first && start.getTime() <= last
  }
  const from = view === 'week' ? weekDays(anchor)[0] : anchor
  const target = step(view, from, dir).getTime()
  return target >= first && target <= last
}

/** Een dag binnen het opgehaalde bereik houden (bijv. na terugbladeren naar de 1e van de maand). */
export function clampDay(day: Date, bounds: Bounds): Date {
  if (day < bounds.first) return bounds.first
  if (day > bounds.last) return bounds.last
  return day
}
