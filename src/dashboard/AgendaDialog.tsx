import { useEffect, useRef, useState } from 'react'
import type { CalendarStatus } from '../lib/calendar'
import type { CalEvent } from '../lib/calendarTypes'
import { monthGrid, weekDays } from '../lib/dayMath'
import { useNow } from '../lib/relativeTime'
import { canStep, step, type AgendaView } from './agendaNav'
import { MonthView } from './MonthView'
import { Timeline } from './Timeline'

type Props = {
  open: boolean
  onClose: () => void
  events: CalEvent[]
  status: CalendarStatus
  onConnect: () => void
  onRetry: () => void
}

const VIEW_KEY = 'dashboard.view'
const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const short = (d: Date) => shortFmt.format(d).replace('.', '')

function readView(): AgendaView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'week' || v === 'month' ? v : 'day'
  } catch {
    return 'day'
  }
}

/** ISO-weeknummer (week begint op maandag; week 1 bevat de eerste donderdag). */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** Groot agendavenster met Dag / Week / Maand (5 weken vooruit). */
export function AgendaDialog({ open, onClose, events, status, onConnect, onRetry }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<AgendaView>(readView)
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const now = new Date(useNow(30_000))

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setAnchor(startOfDay(new Date()))
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  function choose(v: AgendaView) {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // alleen een voorkeur
    }
  }

  const grid = monthGrid(now)
  const week = weekDays(anchor)
  const title =
    view === 'day'
      ? capitalize(dayFmt.format(anchor))
      : view === 'week'
        ? `Week ${isoWeek(anchor)} · ${short(week[0])} – ${short(week[6])}`
        : `${short(grid[0])} – ${short(grid[grid.length - 1])}`

  return (
    <dialog
      ref={ref}
      className="agenda-dialog"
      aria-label="Agenda"
      onClose={onClose}
      // Esc: meteen bijwerken via "cancel" (het "close"-event kan later of niet komen).
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="agenda-inner">
        <header className="agenda-head">
          <h2 className="agenda-title">{title}</h2>
          {status === 'stale' && <span className="stale-label">niet bijgewerkt</span>}
          {view !== 'month' && (
            <div className="agenda-nav">
              <button
                className="icon-button"
                type="button"
                aria-label={view === 'day' ? 'Vorige dag' : 'Vorige week'}
                disabled={!canStep(view, anchor, -1, now)}
                onClick={() => setAnchor(step(view, anchor, -1))}
              >
                ‹
              </button>
              <button className="settings-button" data-variant="ghost" type="button" onClick={() => setAnchor(startOfDay(new Date()))}>
                Vandaag
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={view === 'day' ? 'Volgende dag' : 'Volgende week'}
                disabled={!canStep(view, anchor, 1, now)}
                onClick={() => setAnchor(step(view, anchor, 1))}
              >
                ›
              </button>
            </div>
          )}
          <div className="tl-switch" role="group" aria-label="Weergave">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => choose(v)}>
                {v === 'day' ? 'Dag' : v === 'week' ? 'Week' : 'Maand'}
              </button>
            ))}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Sluiten">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="agenda-body">
          {open &&
            (view === 'month' ? (
              <MonthView
                events={events}
                now={now}
                onPickDay={(day) => {
                  setAnchor(day)
                  choose('day')
                }}
              />
            ) : (
              <Timeline
                events={events}
                status={status}
                onConnect={onConnect}
                onRetry={onRetry}
                view={view}
                anchor={anchor}
                embedded
                hideHeader
              />
            ))}
        </div>
      </div>
    </dialog>
  )
}
