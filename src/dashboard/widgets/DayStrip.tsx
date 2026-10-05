import type { CSSProperties } from 'react'
import type { CalEvent } from '../../lib/calendarTypes'
import { colorIndex, dayWindow, layoutDay, stripPosition } from '../../lib/dayMath'

const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const LABEL_HOURS = [9, 12, 15, 18, 21]

/** Liggende dagbalk (07–23, uitgebreid als nodig) met afspraken als blokjes en een NU-streepje. */
export function DayStrip({ events, now }: { events: CalEvent[]; now: Date }) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const window = dayWindow(events, day)
  const blocks = layoutDay(events, day)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowPos = stripPosition(nowMin, window)
  const pastPos = nowMin <= window.startMin ? 0 : nowMin >= window.endMin ? 100 : nowPos
  return (
    <div className="daystrip" aria-hidden="true">
      <div className="daystrip-track">
        {pastPos !== null && pastPos > 0 && <span className="daystrip-past" style={{ width: `${pastPos}%` }} />}
        {blocks.map((b) => {
          const left = stripPosition(b.startMin, window) ?? 0
          const right = stripPosition(b.endMin, window) ?? 100
          const rows = Math.min(b.columns, 3)
          const row = Math.min(b.column, 2)
          return (
            <span
              key={b.event.id}
              className="daystrip-block"
              data-tint={colorIndex(b.event.title)}
              title={`${timeFmt.format(new Date(b.event.start))} ${b.event.title}`}
              style={
                {
                  left: `${left}%`,
                  width: `${Math.max(right - left, 1.2)}%`,
                  top: `${(row / rows) * 100}%`,
                  height: `${100 / rows}%`,
                } as CSSProperties
              }
            />
          )
        })}
        {nowPos !== null && <span className="daystrip-now" style={{ left: `${nowPos}%` }} />}
      </div>
      <div className="daystrip-hours">
        {LABEL_HOURS.map((h) => {
          const pos = stripPosition(h * 60, window)
          return pos === null ? null : (
            <span key={h} style={{ left: `${pos}%` }}>
              {String(h).padStart(2, '0')}
            </span>
          )
        })}
      </div>
    </div>
  )
}
