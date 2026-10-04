import { fullDate, sinceLabel } from '../lib/relativeTime'
import type { Todo } from '../lib/types'

const DAY = 864e5

/** Afgeronde taken per dag over de laatste 7 dagen, vandaag rechts. */
export function WeekChart({ done, now, onOpenCalendar }: { done: Todo[]; now: number; onOpenCalendar: () => void }) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = today.getTime() - (6 - i) * DAY
    const count = done.filter((t) => {
      const at = new Date(t.done_at!).getTime()
      return at >= start && at < start + DAY
    }).length
    const date = new Date(start)
    return {
      label: i === 6 ? 'nu' : date.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', ''),
      full: date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }),
      count,
      today: i === 6,
    }
  })
  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((n, d) => n + d.count, 0)

  return (
    <section className="insight">
      <div className="insight-head">
        <h3 className="insight-title">Deze week</h3>
        <button className="icon-button small" type="button" onClick={onOpenCalendar} aria-label="Overzicht van eerdere weken en maanden">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="8.5" cy="14.5" r="1.3" fill="currentColor" />
            <circle cx="12" cy="14.5" r="1.3" fill="currentColor" />
          </svg>
        </button>
      </div>
      <p className="insight-big">
        {total} <span>afgerond</span>
      </p>
      <ol className="week" aria-label="Afgeronde taken per dag">
        {days.map((d) => (
          <li
            key={d.full}
            className="week-day"
            data-today={d.today || undefined}
            title={`${d.full}: ${d.count} afgerond`}
            aria-label={`${d.full}: ${d.count} afgerond`}
          >
            <span className="week-count">{d.count > 0 ? d.count : ''}</span>
            <span className="week-track">
              <span className="week-bar" style={{ height: d.count ? `${(d.count / max) * 100}%` : undefined }} />
            </span>
            <span className="week-label">{d.label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** De taak die het langst op de lijst staat: een zacht duwtje. */
export function OldestTask({ todos, now }: { todos: Todo[]; now: number }) {
  if (todos.length === 0) return null
  const oldest = todos.reduce((a, b) => (a.created_at <= b.created_at ? a : b))
  if (now - new Date(oldest.created_at).getTime() < DAY) return null

  return (
    <section className="insight">
      <h3 className="insight-title">Staat het langst</h3>
      <p className="oldest-title">{oldest.title}</p>
      <p className="oldest-age" title={fullDate(oldest.created_at)}>
        al {sinceLabel(oldest.created_at, now)}
      </p>
    </section>
  )
}
