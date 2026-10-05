import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CalendarStatus } from '../lib/calendar'
import type { CalEvent } from '../lib/calendarTypes'
import { colorIndex, dayWindow, layoutDay, nextDayStart, weekDays, type DayBlock } from '../lib/dayMath'
import { useNow } from '../lib/relativeTime'

type View = 'day' | 'week'
type Props = {
  events: CalEvent[]
  status: CalendarStatus
  onConnect: () => void
  onRetry: () => void
  /** In een tegel: zonder eigen kaartrand. */
  embedded?: boolean
}

const VIEW_KEY = 'dashboard.view'
const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const weekdayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()
const hhmm = (iso: string) => timeFmt.format(new Date(iso))
/** Minuten → afstand in het raster; de schaal (--ppm) staat in de CSS. */
const px = (min: number) => `calc(${min} * var(--ppm))`

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'week' ? 'week' : 'day'
  } catch {
    return 'day'
  }
}

/** Hele-dag-afspraken die (een deel van) deze dag beslaan. */
function allDayOn(events: CalEvent[], day: Date) {
  const start = startOfDay(day).getTime()
  const end = nextDayStart(day).getTime()
  return events.filter((e) => e.allDay && new Date(e.start).getTime() < end && new Date(e.end).getTime() > start)
}

function Block({ block, windowStart, compact, now }: { block: DayBlock; windowStart: number; compact: boolean; now: number }) {
  const { event, startMin, endMin, column, columns } = block
  const short = endMin - startMin < 45
  const style = {
    top: px(startMin - windowStart),
    height: `calc(${px(endMin - startMin)} - 3px)`,
    left: `calc(${(column / columns) * 100}% + 2px)`,
    width: `calc(${100 / columns}% - 4px)`,
  } as CSSProperties
  return (
    <div
      className="tl-block"
      data-tint={colorIndex(event.title)}
      data-past={new Date(event.end).getTime() <= now || undefined}
      data-short={short || undefined}
      style={style}
      title={`${hhmm(event.start)}–${hhmm(event.end)} · ${event.title}${event.location ? ` · ${event.location}` : ''}`}
    >
      {!compact && <span className="tl-block-time">{hhmm(event.start)}</span>}
      <span className="tl-block-title">{event.title}</span>
      {!compact && !short && event.location && <span className="tl-block-place">{event.location}</span>}
    </div>
  )
}

function NowLine({ now, windowStart, windowEnd, label }: { now: Date; windowStart: number; windowEnd: number; label: boolean }) {
  const min = minutesOf(now)
  if (min < windowStart || min > windowEnd) return null
  return (
    <div className="tl-now" style={{ top: px(min - windowStart) }} aria-hidden="true">
      {label && <span className="tl-now-label">NU {timeFmt.format(now)}</span>}
    </div>
  )
}

/** Agenda-tijdlijn: dag (uurraster) of week (7 kolommen), met meelopende NU-lijn. */
export function Timeline({ events, status, onConnect, onRetry, embedded }: Props) {
  const [view, setView] = useState<View>(readView)
  const nowMs = useNow(30_000)
  const now = new Date(nowMs)
  const today = startOfDay(now)
  const scrollRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => (view === 'week' ? weekDays(new Date(today)) : [today]), [view, today.getTime()])
  const window_ = useMemo(() => {
    let startMin = 24 * 60
    let endMin = 0
    for (const d of days) {
      const w = dayWindow(events, d)
      startMin = Math.min(startMin, w.startMin)
      endMin = Math.max(endMin, w.endMin)
    }
    return { startMin, endMin }
  }, [days, events])
  const columns = useMemo(
    () => days.map((d) => ({ day: d, blocks: layoutDay(events, d), allDay: allDayOn(events, d) })),
    [days, events],
  )

  function choose(v: View) {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // alleen een voorkeur
    }
  }

  // Bij openen en bij wisselen van weergave: "nu" in beeld, op een derde van de hoogte.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ppm = parseFloat(getComputedStyle(el).getPropertyValue('--ppm')) || 0.6
    const y = (minutesOf(new Date()) - window_.startMin) * ppm
    el.scrollTop = Math.max(0, y - el.clientHeight / 3)
  }, [view, window_.startMin])

  // Scrollbalk-ruimte meenemen zodat de dagkoppen in de week boven hun kolom staan.
  const [gutter, setGutter] = useState(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setGutter(el.offsetWidth - el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hours: number[] = []
  for (let m = Math.ceil(window_.startMin / 60) * 60; m <= window_.endMin; m += 60) hours.push(m)

  const hasTimed = columns.some((c) => c.blocks.length > 0)
  const hasAny = hasTimed || columns.some((c) => c.allDay.length > 0)
  let message: ReactNode = null
  if (status === 'none') {
    message = (
      <button className="today-link" type="button" onClick={onConnect}>
        Koppel je agenda →
      </button>
    )
  } else if (status === 'error') {
    message = (
      <>
        Agenda ophalen lukte niet ·{' '}
        <button className="today-link" type="button" onClick={onRetry}>
          Opnieuw proberen
        </button>
      </>
    )
  } else if (status === 'loading' && !hasAny) {
    message = 'Agenda laden…'
  } else if (!hasTimed) {
    message = view === 'week' ? 'Niks in je agenda deze week' : 'Niks in je agenda vandaag'
  }

  const week = view === 'week'
  const showAllDayRow = columns.some((c) => c.allDay.length > 0)

  return (
    <section className={embedded ? "timeline" : "timeline dash-card"} data-embedded={embedded || undefined} data-view={view} aria-label="Agenda" style={{ '--cols': days.length } as CSSProperties}>
      <header className="tl-head">
        <h2 className="tl-title">{week ? 'Deze week' : 'Vandaag'}</h2>
        {status === 'stale' && <span className="stale-label">niet bijgewerkt</span>}
        <div className="tl-switch" role="group" aria-label="Weergave">
          <button type="button" aria-pressed={!week} onClick={() => choose('day')}>
            Dag
          </button>
          <button type="button" aria-pressed={week} onClick={() => choose('week')}>
            Week
          </button>
        </div>
      </header>

      {(week || showAllDayRow) && (
        <div className="tl-top" style={{ paddingRight: gutter }}>
          <div className="tl-gutter" />
          {columns.map(({ day, allDay }) => (
            <div key={day.getTime()} className="tl-top-col" data-today={sameDay(day, now) || undefined}>
              {week && (
                <span className="tl-dayname">
                  {weekdayFmt.format(day).replace('.', '')} <strong>{day.getDate()}</strong>
                </span>
              )}
              {allDay.map((e) => (
                <span key={e.id} className="tl-allday" data-tint={colorIndex(e.title)} title={e.title}>
                  {e.title}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="tl-body">
        <div className="tl-scroll" ref={scrollRef}>
          <div className="tl-grid" style={{ height: px(window_.endMin - window_.startMin) }}>
            <div className="tl-gutter">
              {hours.map((m) => (
                <span key={m} className="tl-hour" style={{ top: px(m - window_.startMin) }}>
                  {String(Math.floor(m / 60) % 24).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            {hours.map((m) => (
              <div key={m} className="tl-line" style={{ top: px(m - window_.startMin) }} />
            ))}
            {columns.map(({ day, blocks }) => {
              const isToday = sameDay(day, now)
              return (
                <div key={day.getTime()} className="tl-col" data-today={(week && isToday) || undefined}>
                  {blocks.map((b) => (
                    <Block key={b.event.id} block={b} windowStart={window_.startMin} compact={week} now={nowMs} />
                  ))}
                  {isToday && <NowLine now={now} windowStart={window_.startMin} windowEnd={window_.endMin} label={!week} />}
                </div>
              )
            })}
          </div>
        </div>
        {message && <p className="tl-message">{message}</p>}
      </div>
    </section>
  )
}
