import { ICONS } from '../../components/icons'
import type { CalendarStatus } from '../../lib/calendar'
import type { CalEvent } from '../../lib/calendarTypes'
import { formatCountdown, headline, upcoming } from '../../lib/dayMath'
import { useNow } from '../../lib/relativeTime'
import { Timeline } from '../Timeline'
import { DayStrip } from './DayStrip'
import { WidgetCard, type WidgetProps } from './WidgetCard'

type Props = WidgetProps & { events: CalEvent[]; status: CalendarStatus; onConnect: () => void; onRetry: () => void }

const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const hhmm = (iso: string) => timeFmt.format(new Date(iso))

/** Melding bij geen agenda / laden / fout; null als er gewoon afspraken getoond kunnen worden. */
function StatusMessage({ status, hasEvents, onConnect, onRetry }: { status: CalendarStatus; hasEvents: boolean; onConnect: () => void; onRetry: () => void }) {
  if (status === 'none')
    return (
      <button className="today-link" type="button" onClick={onConnect}>
        Koppel je agenda →
      </button>
    )
  if (status === 'loading' && !hasEvents) return <p className="widget-muted">Agenda laden…</p>
  if (status === 'error' && !hasEvents)
    return (
      <p className="widget-muted">
        Agenda niet bereikbaar ·{' '}
        <button className="today-link" type="button" onClick={onRetry}>
          Opnieuw proberen
        </button>
      </p>
    )
  return null
}

function NextLine({ events, now }: { events: CalEvent[]; now: Date }) {
  const head = headline(events, now)
  if (head.kind === 'next' && head.event)
    return (
      <p className="widget-line">
        <strong>{hhmm(head.event.start)}</strong> <span className="widget-clip">{head.event.title}</span>{' '}
        <span className="today-countdown">{formatCountdown(new Date(head.event.start).getTime() - now.getTime())}</span>
      </p>
    )
  if (head.kind === 'ongoing' && head.event)
    return (
      <p className="widget-line">
        <span className="widget-tag">nu</span> <span className="widget-clip">{head.event.title}</span> tot {hhmm(head.event.end)}
      </p>
    )
  return <p className="widget-muted">Geen afspraken meer vandaag</p>
}

function TodayList({ events, now }: { events: CalEvent[]; now: Date }) {
  const { today, tomorrow } = upcoming(events, now, 6)
  if (today.length)
    return (
      <ul className="widget-list">
        {today.map((e) => (
          <li key={e.id}>
            <span className="widget-time">{hhmm(e.start)}</span>
            <span className="widget-clip">{e.title}</span>
            {new Date(e.start) <= now && <span className="widget-tag">nu</span>}
          </li>
        ))}
      </ul>
    )
  if (tomorrow)
    return (
      <p className="widget-muted">
        Niets meer vandaag · Morgen {hhmm(tomorrow.start)} <span className="widget-clip">{tomorrow.title}</span>
      </p>
    )
  return <p className="widget-muted">Vrije dag 🌿</p>
}

/** Agenda-tegel: klein = volgende afspraak + dagbalk, middel = + lijstje, groot = uurrooster. */
export function AgendaWidget({ size, onOpen, events, status, onConnect, onRetry }: Props) {
  const now = new Date(useNow(30_000))
  // Geen hooks in StatusMessage, dus als functie aanroepen om te weten of er een melding is.
  const message = StatusMessage({ status, hasEvents: events.length > 0, onConnect, onRetry })
  return (
    <WidgetCard title="Agenda" icon={ICONS.agenda} size={size} onOpen={onOpen} openLabel="Openen" className="widget-agenda">
      {size === 'groot' ? (
        <Timeline events={events} status={status} onConnect={onConnect} onRetry={onRetry} embedded />
      ) : (
        message ?? (
          <>
            {size === 'klein' && <NextLine events={events} now={now} />}
            <DayStrip events={events} now={now} />
            {size === 'middel' && <TodayList events={events} now={now} />}
            {status === 'stale' && <span className="stale-label">niet bijgewerkt</span>}
          </>
        )
      )}
    </WidgetCard>
  )
}
