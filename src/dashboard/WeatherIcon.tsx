import type { WeatherIcon as Icon } from '../lib/weather'

const CLOUD = 'M17 38h26a9 9 0 0 0 0-18 13 13 0 0 0-25-2 10 10 0 0 0-1 20z'

/** Zachte, cozy weer-iconen (inline SVG). */
export function WeatherIcon({ icon, size = 56 }: { icon: Icon; size?: number }) {
  return (
    <svg className="weather-icon" viewBox="0 0 60 60" width={size} height={size} aria-hidden="true">
      {(icon === 'sun' || icon === 'partly') && (
        <g className="wi-sun" transform={icon === 'partly' ? 'translate(-7 -7) scale(0.85)' : undefined}>
          <circle cx="30" cy="30" r="11" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="30" y1="10" x2="30" y2="5" transform={`rotate(${i * 45} 30 30)`} />
          ))}
        </g>
      )}
      {icon !== 'sun' && (
        <path className="wi-cloud" d={CLOUD} transform={icon === 'partly' ? 'translate(4 8)' : undefined} />
      )}
      {icon === 'rain' &&
        [20, 30, 40].map((x) => <line key={x} className="wi-rain" x1={x} y1="44" x2={x - 3} y2="52" />)}
      {icon === 'snow' && [20, 30, 40].map((x, i) => <circle key={x} className="wi-snow" cx={x} cy={i % 2 ? 50 : 46} r="2.4" />)}
      {icon === 'storm' && <path className="wi-bolt" d="M32 38l-7 10h6l-3 9 9-12h-6l4-7z" />}
      {icon === 'fog' && [44, 50].map((y) => <line key={y} className="wi-fog" x1="14" y1={y} x2="46" y2={y} />)}
    </svg>
  )
}
