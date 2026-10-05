import { useEffect, useState } from 'react'
import type { CalendarStatus } from '../lib/calendar'
import type { CalEvent } from '../lib/calendarTypes'
import { formatCountdown, greeting, headline } from '../lib/dayMath'
import { describeWeather, type Weather } from '../lib/weather'
import { WeatherIcon } from './WeatherIcon'

type Props = {
  events: CalEvent[]
  calendarStatus: CalendarStatus
  weather: Weather | null
  weatherStale: boolean
  hasCity: boolean
  onOpenSettings: () => void
}

const dateFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const hourFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit' })

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

function WeatherBlock({ weather, stale, hasCity, now, onOpenSettings }: { weather: Weather | null; stale: boolean; hasCity: boolean; now: Date; onOpenSettings: () => void }) {
  if (!hasCity) {
    return (
      <button className="today-link today-weather-empty" type="button" onClick={onOpenSettings}>
        Stel je woonplaats in
      </button>
    )
  }
  if (!weather) return null // ophalen mislukt en niets in de cache: weer verbergen
  const { text, icon } = describeWeather(weather.code)
  const upcoming = weather.hourly.filter((h) => new Date(h.time).getTime() > now.getTime()).slice(0, 4)
  return (
    <div className="today-weather">
      <WeatherIcon icon={icon} />
      <div className="today-weather-main">
        <span className="today-temp">{Math.round(weather.temp)}°</span>
        <span className="today-weather-text">
          {text}
          <span className="today-minmax">
            {Math.round(weather.max)}° / {Math.round(weather.min)}°
          </span>
          {stale && <span className="stale-label">niet bijgewerkt</span>}
        </span>
      </div>
      {upcoming.length > 0 && (
        <ol className="today-hours" aria-label="De komende uren">
          {upcoming.map((h) => (
            <li key={h.time}>
              <span className="today-hour">{hourFmt.format(new Date(h.time))}u</span>
              <span className="today-hour-temp">{Math.round(h.temp)}°</span>
              {h.rainChance >= 20 && <span className="today-hour-rain">{h.rainChance}%</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Bovenste kaart van het dashboard: klok, begroeting, volgende afspraak en het weer. */
export function TodayHeader({ events, calendarStatus, weather, weatherStale, hasCity, onOpenSettings }: Props) {
  const now = useClock()
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
      </div>
      <WeatherBlock weather={weather} stale={weatherStale} hasCity={hasCity} now={now} onOpenSettings={onOpenSettings} />
      <button className="icon-button today-gear" type="button" onClick={onOpenSettings} aria-label="Instellingen">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </section>
  )
}
