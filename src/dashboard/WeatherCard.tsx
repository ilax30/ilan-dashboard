import { useNow } from '../lib/relativeTime'
import { describeWeather, type Weather } from '../lib/weather'
import { WeatherIcon } from './WeatherIcon'

const hourFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit' })

type Props = { weather: Weather | null; stale: boolean; hasCity: boolean; onOpenSettings: () => void }

/** Weerkaart rechts naast de kop: icoon, temperatuur, omschrijving, max/min en 4 uur vooruit. */
export function WeatherCard({ weather, stale, hasCity, onOpenSettings }: Props) {
  const now = useNow(60_000)
  if (!hasCity) {
    return (
      <section className="weather-card dash-card" aria-label="Weer">
        <button className="today-link" type="button" onClick={onOpenSettings}>
          Stel je woonplaats in
        </button>
      </section>
    )
  }
  if (!weather) return null // ophalen mislukt en niets in de cache: weer verbergen
  const { text, icon } = describeWeather(weather.code)
  const upcoming = weather.hourly.filter((h) => new Date(h.time).getTime() > now).slice(0, 4)
  return (
    <section className="weather-card dash-card" aria-label="Weer">
      <div className="today-weather-main">
        <WeatherIcon icon={icon} />
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
    </section>
  )
}
