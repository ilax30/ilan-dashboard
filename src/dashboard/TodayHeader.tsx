import { useEffect, useState } from 'react'
import type { CalendarStatus } from '../lib/calendar'
import type { CalEvent } from '../lib/calendarTypes'
import { formatCountdown, greeting, headline, nextEvent } from '../lib/dayMath'
import { dayProgress } from '../lib/dayPart'
import { daysUntil, dueLabel, dueSoon, formatEuro } from '../lib/bills'
import { navigate } from '../lib/router'
import { useBills } from '../lib/useBills'
import { Icon } from '../components/icons'

type Props = {
  events: CalEvent[]
  calendarStatus: CalendarStatus
  onOpenSettings: () => void
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

const shortDayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })

/** 'Vandaag', 'Morgen' of 'do 8 okt'. */
function dayLabel(d: Date, now: Date): string {
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const days = daysUntil(iso, now)
  if (days === 0) return 'Vandaag'
  if (days === 1) return 'Morgen'
  return capitalize(shortDayFmt.format(d).replace(/\./g, ''))
}

/** Rechts in de kop: de eerstvolgende afspraak en betaling, ook als die pas over een paar dagen zijn. */
function NextUp({ events, status, now }: { events: CalEvent[]; status: CalendarStatus; now: Date }) {
  const { bills } = useBills()
  const event = status === 'none' ? null : nextEvent(events, now)
  const bill = bills ? dueSoon(bills, now, 3650)[0] : undefined
  const due = bill ? dueLabel(bill.next_due, now) : null
  const [y, m, d] = bill ? bill.next_due.split('-').map(Number) : [0, 0, 0]
  return (
    <div className="today-next">
      <button className="today-next-item" type="button" onClick={() => navigate('/agenda')}>
        <span className="today-next-icon" aria-hidden="true">
          <Icon name="agenda" size={20} weight="duotone" />
        </span>
        <span className="today-next-text">
          <span className="today-next-label">Volgende afspraak</span>
          {event ? (
            <>
              <span className="today-next-title">{event.title}</span>
              <span className="today-next-meta">
                {dayLabel(new Date(event.start), now)} · {event.allDay ? 'hele dag' : hhmm(event.start)}
              </span>
            </>
          ) : (
            <span className="today-next-meta">
              {status === 'none' ? 'Agenda niet gekoppeld' : status === 'loading' ? 'Laden…' : status === 'error' ? 'Agenda niet bereikbaar' : 'Niets gepland'}
            </span>
          )}
        </span>
      </button>
      <button className="today-next-item" type="button" onClick={() => navigate('/financien')}>
        <span className="today-next-icon" aria-hidden="true">
          <Icon name="financien" size={20} weight="duotone" />
        </span>
        <span className="today-next-text">
          <span className="today-next-label">Volgende betaling</span>
          {bill ? (
            <>
              <span className="today-next-title">
                {bill.name} · {formatEuro(bill.amount)}
              </span>
              <span className="today-next-meta">
                {dayLabel(new Date(y, m - 1, d), now)}
                {due && due.tone !== 'soon' && (
                  <span className="fin-badge" data-tone={due.tone}>
                    {due.text}
                  </span>
                )}
              </span>
            </>
          ) : (
            <span className="today-next-meta">{bills === null ? 'Laden…' : 'Nog geen vaste lasten'}</span>
          )}
        </span>
      </button>
    </div>
  )
}

/** Bovenste kaart van het dashboard: klok, begroeting, volgende afspraak en hoeveel van de dag voorbij is. */
export function TodayHeader({ events, calendarStatus, onOpenSettings }: Props) {
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
      <NextUp events={events} status={calendarStatus} now={now} />
    </section>
  )
}
