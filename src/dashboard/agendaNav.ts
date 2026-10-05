import { monthGrid, weekDays } from '../lib/dayMath'

// Bladeren in het agendavenster: per dag of per week, altijd binnen de opgehaalde 5 weken.

export type AgendaView = 'day' | 'week' | 'month'

/** Een dag of week verder/terug, op lokale middernacht (ook over zomer-/wintertijd). */
export function step(view: 'day' | 'week', anchor: Date, dir: -1 | 1): Date {
  const days = view === 'day' ? 1 : 7
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + dir * days)
}

/** Mag je die kant op bladeren zonder buiten de 5 weken (maandag van deze week + 34 dagen) te komen? */
export function canStep(view: 'day' | 'week', anchor: Date, dir: -1 | 1, now: Date): boolean {
  const grid = monthGrid(now)
  const first = grid[0].getTime()
  const last = grid[grid.length - 1].getTime()
  const from = view === 'week' ? weekDays(anchor)[0] : anchor
  const target = step(view, from, dir).getTime()
  return target >= first && target <= last
}
