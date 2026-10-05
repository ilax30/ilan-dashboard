import type { CalEvent } from '../lib/calendarTypes'
import { colorIndex, eventsOnDay, monthGrid } from '../lib/dayMath'

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const monthFmt = new Intl.DateTimeFormat('nl-NL', { month: 'short' })
const longFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const SHOWN = 3

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Maandweergave: 5 weken vanaf maandag van deze week; klik op een dag opent die dag. */
export function MonthView({ events, now, onPickDay }: { events: CalEvent[]; now: Date; onPickDay: (day: Date) => void }) {
  const grid = monthGrid(now)
  const today = startOfDay(now).getTime()
  return (
    <div className="month-view">
      {WEEKDAYS.map((w) => (
        <span key={w} className="mv-weekday" aria-hidden="true">
          {w}
        </span>
      ))}
      {grid.map((day, i) => {
        const list = eventsOnDay(events, day)
        const showMonth = i === 0 || day.getDate() === 1
        return (
          <button
            key={day.getTime()}
            type="button"
            className="mv-day"
            data-today={day.getTime() === today || undefined}
            data-past={day.getTime() < today || undefined}
            onClick={() => onPickDay(day)}
            aria-label={`${longFmt.format(day)}: ${list.length} ${list.length === 1 ? 'afspraak' : 'afspraken'}`}
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
