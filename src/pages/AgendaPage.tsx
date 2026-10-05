import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useState } from 'react'
import { canStep, clampDay, step, type AgendaView } from '../dashboard/agendaNav'
import { MonthView } from '../dashboard/MonthView'
import { Timeline } from '../dashboard/Timeline'
import { emit } from '../lib/appEvents'
import { agendaList, monthMatrix, rangeBounds } from '../lib/agendaPage'
import { useSharedCalendar } from '../lib/calendar'
import { colorIndex, eventsOnDay, weekDays } from '../lib/dayMath'
import { useNow } from '../lib/relativeTime'

const VIEW_KEY = 'agenda.view'
const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const short = (d: Date) => shortFmt.format(d).replace('.', '')

function readView(): AgendaView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'day' || v === 'month' ? v : 'week'
  } catch {
    return 'week'
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

function dayLabel(day: Date, now: Date) {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (sameDay(day, now)) return `Vandaag · ${short(day)}`
  if (sameDay(day, tomorrow)) return `Morgen · ${short(day)}`
  return capitalize(dayFmt.format(day))
}

/** Agendapagina (#/agenda): links mini-maand en de komende dagen, rechts Dag / Week / Maand. */
export function AgendaPage() {
  const { events, status, refresh } = useSharedCalendar()
  const now = new Date(useNow(30_000))
  const bounds = rangeBounds(now)
  const [view, setView] = useState<AgendaView>(readView)
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [miniMonth, setMiniMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  function choose(v: AgendaView) {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // alleen een voorkeur
    }
  }

  function goTo(day: Date) {
    // Binnen het opgehaalde bereik blijven: daarbuiten weten we niet of je vrij bent.
    setAnchor(clampDay(startOfDay(day), bounds))
    setMiniMonth(new Date(day.getFullYear(), day.getMonth(), 1))
  }

  const week = weekDays(anchor)
  const title =
    view === 'day'
      ? capitalize(dayFmt.format(anchor))
      : view === 'week'
        ? `Week ${isoWeek(anchor)} · ${short(week[0])} – ${short(week[6])}`
        : capitalize(monthFmt.format(anchor))

  const list = agendaList(events, now, 14)
  const mini = monthMatrix(miniMonth)
  const inSelection = (d: Date) =>
    view === 'day' ? sameDay(d, anchor) : view === 'week' ? d >= week[0] && d <= week[6] : d.getMonth() === anchor.getMonth()

  return (
    <main className="agenda-page">
      <aside className="agenda-side dash-card" aria-label="Overzicht">
        <div className="mini-head">
          <h2 className="mini-title">{capitalize(monthFmt.format(miniMonth))}</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Vorige maand"
            disabled={!canStep('month', miniMonth, -1, bounds)}
            onClick={() => setMiniMonth(step('month', miniMonth, -1))}
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Volgende maand"
            disabled={!canStep('month', miniMonth, 1, bounds)}
            onClick={() => setMiniMonth(step('month', miniMonth, 1))}
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
        <div className="mini-grid" role="grid" aria-label={monthFmt.format(miniMonth)}>
          {WEEKDAYS.map((w) => (
            <span key={w} className="mini-weekday">
              {w}
            </span>
          ))}
          {mini.map((d) => {
            const inRange = d >= bounds.first && d <= bounds.last
            const busy = inRange && eventsOnDay(events, d).length > 0
            return (
              <button
                key={d.getTime()}
                type="button"
                className="mini-day"
                data-outside={d.getMonth() !== miniMonth.getMonth() || undefined}
                data-today={sameDay(d, now) || undefined}
                data-selected={inSelection(d) || undefined}
                disabled={!inRange}
                onClick={() => goTo(d)}
                aria-label={dayFmt.format(d)}
              >
                {d.getDate()}
                {busy && <span className="mini-dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <div className="agenda-list">
          {status === 'none' ? (
            <button className="today-link" type="button" onClick={() => emit('open-settings')}>
              Koppel je agenda →
            </button>
          ) : list.length === 0 ? (
            <p className="widget-muted">Niks in je agenda de komende twee weken.</p>
          ) : (
            list.map(({ day, allDay, timed }) => (
              <section key={day.getTime()} className="agenda-list-day">
                <h3 className="agenda-list-head" data-today={sameDay(day, now) || undefined}>
                  <button type="button" onClick={() => goTo(day)}>
                    {dayLabel(day, now)}
                  </button>
                </h3>
                {allDay.map((e) => (
                  <span key={e.id} className="agenda-list-allday" data-tint={colorIndex(e.title)}>
                    {e.title}
                  </span>
                ))}
                {timed.map((e) => (
                  <div key={e.id} className="agenda-list-item" data-past={new Date(e.end) <= now || undefined}>
                    <span className="mv-dot" data-tint={colorIndex(e.title)} aria-hidden="true" />
                    <span className="agenda-list-title">{e.title}</span>
                    <span className="agenda-list-time">
                      {timeFmt.format(new Date(e.start))} – {timeFmt.format(new Date(e.end))}
                    </span>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </aside>

      <section className="agenda-main dash-card" aria-label="Agenda">
        <header className="agenda-head">
          <div className="agenda-nav">
            <button
              className="icon-button"
              type="button"
              aria-label="Terug"
              disabled={!canStep(view, anchor, -1, bounds)}
              onClick={() => goTo(step(view, anchor, -1))}
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button className="settings-button" data-variant="ghost" type="button" onClick={() => goTo(new Date())}>
              Vandaag
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Verder"
              disabled={!canStep(view, anchor, 1, bounds)}
              onClick={() => goTo(step(view, anchor, 1))}
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
          <h1 className="agenda-title">{title}</h1>
          {status === 'stale' && <span className="stale-label">niet bijgewerkt</span>}
          <div className="tl-switch" role="group" aria-label="Weergave">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => choose(v)}>
                {v === 'day' ? 'Dag' : v === 'week' ? 'Week' : 'Maand'}
              </button>
            ))}
          </div>
        </header>
        <div className="agenda-body">
          {view === 'month' ? (
            <MonthView
              events={events}
              now={now}
              days={monthMatrix(anchor)}
              month={anchor.getMonth()}
              bounds={bounds}
              onPickDay={(d) => {
                goTo(d)
                choose('day')
              }}
            />
          ) : (
            <Timeline
              events={events}
              status={status}
              onConnect={() => emit('open-settings')}
              onRetry={refresh}
              view={view}
              anchor={anchor}
              embedded
              hideHeader
            />
          )}
        </div>
      </section>
    </main>
  )
}
