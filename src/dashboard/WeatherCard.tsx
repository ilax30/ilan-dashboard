import type { CSSProperties } from 'react'
import { todayAt } from '../lib/dayPart'
import { useNow } from '../lib/relativeTime'
import { describeWeather, type Weather, type WeatherIcon as IconKind } from '../lib/weather'
import { WeatherIcon } from './WeatherIcon'

const hourFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit' })

/** Foto per weertype (public/weer, zie public/landschap/BRONNEN.md); 's nachts bij helder weer de nachtfoto. */
const PHOTO: Record<IconKind, string> = {
  sun: 'weer/zon.webp',
  partly: 'weer/halfbewolkt.webp',
  cloud: 'weer/bewolkt.webp',
  fog: 'weer/mist.webp',
  rain: 'weer/regen.webp',
  snow: 'weer/sneeuw.webp',
  storm: 'weer/onweer.webp',
}

function photoFor(icon: IconKind, night: boolean) {
  const file = night && (icon === 'sun' || icon === 'partly') ? 'landschap/nacht.webp' : PHOTO[icon]
  return `${import.meta.env.BASE_URL}${file}`
}

type Props = { weather: Weather | null; stale: boolean; hasCity: boolean; onOpenSettings: () => void }

/** Weerkaart rechts naast de kop: foto bij het weer, temperatuur, max/min, regen en 4 uur vooruit. */
export function WeatherCard({ weather, stale, hasCity, onOpenSettings }: Props) {
  const nowMs = useNow(60_000)
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

  const now = new Date(nowMs)
  const sunrise = todayAt(weather.sunrise ?? null, now)
  const sunset = todayAt(weather.sunset ?? null, now)
  const isNight = (t: Date) => {
    const h = t.getHours() * 60 + t.getMinutes()
    const up = sunrise ? sunrise.getHours() * 60 + sunrise.getMinutes() : 7 * 60
    const down = sunset ? sunset.getHours() * 60 + sunset.getMinutes() : 19 * 60
    return h < up || h >= down
  }
  const { text, icon } = describeWeather(weather.code)
  const night = isNight(now)
  const upcoming = weather.hourly.filter((h) => new Date(h.time).getTime() > nowMs).slice(0, 4)
  const rainFrom = weather.hourly.find((h) => new Date(h.time).getTime() > nowMs && h.rainChance >= 50)
  const details = [
    `Max ${Math.round(weather.max)}°`,
    `Min ${Math.round(weather.min)}°`,
    rainFrom && new Date(rainFrom.time).getDate() === now.getDate() ? `Regen vanaf ${hourFmt.format(new Date(rainFrom.time))}:00` : null,
  ].filter(Boolean)

  return (
    <section
      className="weather-card dash-card"
      data-photo
      aria-label="Weer"
      style={{ '--weather-photo': `url("${photoFor(icon, night)}")` } as CSSProperties}
    >
      <div className="weather-now">
        <WeatherIcon icon={icon} night={night} size={44} />
        <span className="today-temp">{Math.round(weather.temp)}°</span>
        <span className="weather-text">{text}</span>
        {stale && <span className="stale-label">niet bijgewerkt</span>}
      </div>
      <p className="weather-details">{details.join(' · ')}</p>
      {upcoming.length > 0 && (
        <ol className="weather-hours" aria-label="De komende uren">
          {upcoming.map((h) => {
            const t = new Date(h.time)
            return (
              <li key={h.time}>
                <WeatherIcon icon={describeWeather(h.code ?? weather.code).icon} night={isNight(t)} size={22} />
                <span className="weather-hour">
                  <span className="weather-hour-label">{hourFmt.format(t)}u</span>
                  <span className="weather-hour-temp">{Math.round(h.temp)}°</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
