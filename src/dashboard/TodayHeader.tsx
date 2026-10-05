import { useEffect, useState } from 'react'
import type { CalendarStatus } from '../lib/calendar'
import type { CalEvent } from '../lib/calendarTypes'
import { formatCountdown, greeting, headline } from '../lib/dayMath'
import { dayProgress } from '../lib/dayPart'

type Props = {
  events: CalEvent[]
  calendarStatus: CalendarStatus
  onOpenSettings: () => void
  /** Aanpas-stand van de tegels. */
  editing: boolean
  onToggleEditing: () => void
}

const dateFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const hhmm = (iso: string) => timeFmt.format(new Date(iso))

/** Tikt elke seconde, gelijk met de echte klok. */
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const tick = () => {
      setNow(new Date())
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    return () => window.clearTimeout(timer)
  }, [])
  return now
}

function AgendaLine({ events, status, now, onOpenSettings }: { events: CalEvent[]; status: CalendarStatus; now: Date; onOpenSettings: () => void }) {
  if (status === 'none') {
    return (
      <button className="today-link" type="button" onClick={onOpenSettings}>
        Koppel je agenda →
      </button>
    )
  }
  if (status === 'loading') return <span className="today-muted">Agenda laden…</span>
  if (status === 'error') return <span className="today-muted">Agenda is nu niet bereikbaar</span>

  const head = headline(events, now)
  if (head.kind === 'next' && head.event) {
    return (
      <>
        <span className="today-label">Volgende afspraak:</span> {hhmm(head.event.start)} · {head.event.title} ·{' '}
        <span className="today-countdown">{formatCountdown(new Date(head.event.start).getTime() - now.getTime())}</span>
      </>
    )
  }
  if (head.kind === 'ongoing' && head.event) {
    return (
      <>
        <span className="today-label">Nu bezig:</span> {head.event.title} tot {hhmm(head.event.end)}
      </>
    )
  }
  return <span className="today-muted">Geen afspraken meer vandaag</span>
}

/** Bovenste kaart van het dashboard: klok, begroeting, volgende afspraak en hoeveel van de dag voorbij is. */
export function TodayHeader({ events, calendarStatus, onOpenSettings, editing, onToggleEditing }: Props) {
  const now = useClock()
  const progress = dayProgress(now)
  return (
    <section className="today dash-card" aria-label="Vandaag">
      <div className="today-main">
        <p className="today-date">
          {capitalize(dateFmt.format(now))} · <time className="today-clock">{timeFmt.format(now)}</time>
        </p>
        <h1 className="today-greeting">{greeting(now)}!</h1>
        <p className="today-agenda">
          <AgendaLine events={events} status={calendarStatus} now={now} onOpenSettings={onOpenSettings} />
          {calendarStatus === 'stale' && <span className="stale-label">niet bijgewerkt</span>}
        </p>
        <div className="today-progress">
          <div
            className="today-progress-bar"
            role="progressbar"
            aria-label="Hoeveel van je dag voorbij is"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="today-progress-label">{progress}% van je dag</span>
        </div>
      </div>
      <button className="layout-edit" type="button" aria-pressed={editing} onClick={onToggleEditing}>
        {editing ? 'Klaar' : 'Indeling aanpassen'}
      </button>
    </section>
  )
}
