import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { store } from '../lib/store'
import type { Todo } from '../lib/types'
import { LinkifiedText } from './LinkifiedText'

const MONTHS_BACK = 12
const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const monthStart = (d: Date, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1)

type Props = { open: boolean; now: number; onClose: () => void }

/** Overzicht van afgeronde taken per maand en per dag. */
export function CalendarDialog({ open, now, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [done, setDone] = useState<Todo[] | null>(null)
  const [offset, setOffset] = useState(0) // 0 = deze maand, -1 = vorige, …
  const [selected, setSelected] = useState(() => dayKey(new Date(now)))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setOffset(0)
      setSelected(dayKey(new Date()))
      const since = monthStart(new Date(), -(MONTHS_BACK - 1))
      store
        .listDoneSince(since.toISOString())
        .then(setDone)
        .catch(() => setDone([]))
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const byDay = useMemo(() => {
    const map = new Map<string, Todo[]>()
    for (const t of done ?? []) {
      const key = dayKey(new Date(t.done_at!))
      map.set(key, [...(map.get(key) ?? []), t])
    }
    return map
  }, [done])

  const today = new Date(now)
  const month = monthStart(today, offset)
  const monthLabel = month.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const lead = (month.getDay() + 6) % 7 // maandag eerst

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(month.getFullYear(), month.getMonth(), i + 1)
    const key = dayKey(date)
    return { date, key, todos: byDay.get(key) ?? [], future: date > today }
  })
  const monthTotal = days.reduce((n, d) => n + d.todos.length, 0)
  const maxDay = Math.max(1, ...days.map((d) => d.todos.length))

  const months = Array.from({ length: MONTHS_BACK }, (_, i) => {
    const off = i - (MONTHS_BACK - 1)
    const m = monthStart(today, off)
    const count = (done ?? []).filter((t) => {
      const d = new Date(t.done_at!)
      return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()
    }).length
    return { off, count, label: m.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', ''), full: m.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }) }
  })
  const maxMonth = Math.max(1, ...months.map((m) => m.count))

  const selectedDay = days.find((d) => d.key === selected)
  const selectedTodos = (byDay.get(selected) ?? []).slice().sort((a, b) => a.done_at!.localeCompare(b.done_at!))
  const selectedLabel = selectedDay
    ? selectedDay.date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'Kies een dag'

  function goMonth(off: number) {
    setOffset(off)
    // Selecteer de laatste dag met taken in die maand (of de 1e), zodat de lijst niet leeg blijft.
    const m = monthStart(today, off)
    let pick = dayKey(m)
    for (let d = 1; d <= new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(); d++) {
      const key = dayKey(new Date(m.getFullYear(), m.getMonth(), d))
      if (byDay.has(key)) pick = key
    }
    setSelected(off === 0 ? dayKey(today) : pick)
  }

  return (
    <dialog
      ref={dialogRef}
      className="calendar"
      aria-labelledby="calendar-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="calendar-inner">
        <header className="calendar-head">
          <div>
            <h2 className="calendar-title" id="calendar-title">
              Overzicht
            </h2>
            <p className="drawer-sub">Wat je de afgelopen tijd hebt afgerond</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Sluiten">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <ol className="months" aria-label="Afgerond per maand">
          {months.map((m) => (
            <li key={m.off}>
              <button
                type="button"
                className="month"
                data-active={m.off === offset || undefined}
                onClick={() => goMonth(m.off)}
                title={`${m.full}: ${m.count} afgerond`}
                aria-label={`${m.full}: ${m.count} afgerond`}
                aria-pressed={m.off === offset}
              >
                <span className="month-track">
                  <span className="month-bar" style={{ height: m.count ? `${(m.count / maxMonth) * 100}%` : undefined }} />
                </span>
                <span className="month-label">{m.label}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="calendar-body">
          <section className="calendar-month">
            <div className="calendar-nav">
              <button
                className="icon-button"
                type="button"
                onClick={() => goMonth(offset - 1)}
                disabled={offset <= -(MONTHS_BACK - 1)}
                aria-label="Vorige maand"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="calendar-month-label">
                <span className="calendar-month-name">{monthLabel}</span>
                <span className="calendar-month-total">
                  {done === null ? 'Even laden…' : `${monthTotal} ${monthTotal === 1 ? 'taak' : 'taken'} afgerond`}
                </span>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => goMonth(offset + 1)}
                disabled={offset >= 0}
                aria-label="Volgende maand"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="cal-grid" role="grid" aria-label={monthLabel}>
              {WEEKDAYS.map((w) => (
                <span key={w} className="cal-weekday" role="columnheader">
                  {w}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`lead-${i}`} />
              ))}
              {days.map((d) => {
                const n = d.todos.length
                return (
                  <button
                    key={d.key}
                    type="button"
                    className="cal-day"
                    data-today={d.key === dayKey(today) || undefined}
                    data-selected={d.key === selected || undefined}
                    data-has={n > 0 || undefined}
                    disabled={d.future}
                    onClick={() => setSelected(d.key)}
                    style={n ? { '--level': `${25 + (n / maxDay) * 65}%` } as CSSProperties : undefined}
                    aria-label={`${d.date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}: ${n} afgerond`}
                    aria-pressed={d.key === selected}
                  >
                    <span className="cal-num">{d.date.getDate()}</span>
                    {n > 0 && <span className="cal-count">{n}</span>}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="calendar-day" aria-live="polite">
            <h3 className="calendar-day-title">{selectedLabel}</h3>
            {selectedTodos.length === 0 ? (
              <p className="drawer-empty">Niks afgerond op deze dag.</p>
            ) : (
              <ul className="drawer-list">
                {selectedTodos.map((t) => (
                  <li key={t.id} className="done-item">
                    <svg className="done-item-check" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <circle cx="12" cy="12" r="11" fill="currentColor" />
                      <path d="M7 12.5l3.3 3.3L17 9" fill="none" stroke="var(--card)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="done-item-text">
                      <span className="done-item-title">
                        <LinkifiedText text={t.title} />
                      </span>
                      <time className="done-item-time" dateTime={t.done_at!}>
                        om {new Date(t.done_at!).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </dialog>
  )
}
