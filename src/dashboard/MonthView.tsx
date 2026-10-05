import type { CalEvent } from '../lib/calendarTypes'
import { colorIndex, eventsOnDay } from '../lib/dayMath'

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const monthFmt = new Intl.DateTimeFormat('nl-NL', { month: 'short' })
const longFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const SHOWN = 3

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

type Props = {
  events: CalEvent[]
  now: Date
  /** De dagen in het raster (hele weken, maandag eerst). */
  days: Date[]
  /** Maandnummer (0–11) van de getoonde maand: dagen daarbuiten worden vager. */
  month?: number
  /** Opgehaald bereik: dagen daarbuiten zijn niet geladen (niet klikbaar, niet als 'vrij' tonen). */
  bounds?: { first: Date; last: Date }
  onPickDay: (day: Date) => void
}

/** Maandweergave; klik op een dag opent die dag. */
export function MonthView({ events, now, days, month, bounds, onPickDay }: Props) {
  const grid = days
  const today = startOfDay(now).getTime()
  return (
    <div className="month-view" style={{ gridTemplateRows: `auto repeat(${grid.length / 7}, minmax(0, 1fr))` }}>
      {WEEKDAYS.map((w) => (
        <span key={w} className="mv-weekday" aria-hidden="true">
          {w}
        </span>
      ))}
      {grid.map((day, i) => {
        const unloaded = bounds !== undefined && (day < bounds.first || day > bounds.last)
        const list = unloaded ? [] : eventsOnDay(events, day)
        const showMonth = i === 0 || day.getDate() === 1
        return (
          <button
            key={day.getTime()}
            type="button"
            className="mv-day"
            data-today={day.getTime() === today || undefined}
            data-past={day.getTime() < today || undefined}
            data-outside={(month !== undefined && day.getMonth() !== month) || undefined}
            data-unloaded={unloaded || undefined}
            disabled={unloaded}
            onClick={() => onPickDay(day)}
            aria-label={
              unloaded
                ? `${longFmt.format(day)}: buiten het bereik van de agenda`
                : `${longFmt.format(day)}: ${list.length} ${list.length === 1 ? 'afspraak' : 'afspraken'}`
            }
          >
            <span className="mv-num">
              {day.getDate()}
              {showMonth && <span className="mv-month"> {monthFmt.format(day).replace('.', '')}</span>}
            </span>
            {list.slice(0, SHOWN).map((e) =>
              e.allDay ? (
                <span key={e.id} className="mv-allday" data-tint={colorIndex(e.title)}>
                  {e.title}
                </span>
              ) : (
                <span key={e.id} className="mv-event">
                  <span className="mv-dot" data-tint={colorIndex(e.title)} aria-hidden="true" />
                  <span className="mv-time">{timeFmt.format(new Date(e.start))}</span>
                  <span className="mv-title">{e.title}</span>
                </span>
              ),
            )}
            {list.length > SHOWN && <span className="mv-more">+{list.length - SHOWN} meer</span>}
          </button>
        )
      })}
    </div>
  )
}
