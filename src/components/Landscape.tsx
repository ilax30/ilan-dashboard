import { useEffect, useState } from 'react'
import { dayPart, todayAt, type DayPart } from '../lib/dayPart'

const PARTS: DayPart[] = ['ochtend', 'dag', 'avond', 'nacht']

/** Zonnetijden uit de weer-cache (gevuld door het dashboard); zonder: null → 07:00 / 19:00. */
function sunTimes(now: Date): { sunrise: Date | null; sunset: Date | null } {
  try {
    const cache = JSON.parse(localStorage.getItem('dashboard.weather') ?? 'null') as {
      weather?: { sunrise?: string | null; sunset?: string | null }
    } | null
    return { sunrise: todayAt(cache?.weather?.sunrise ?? null, now), sunset: todayAt(cache?.weather?.sunset ?? null, now) }
  } catch {
    return { sunrise: null, sunset: null }
  }
}

/** Alleen tijdens ontwikkelen: ?dagdeel=ochtend|dag|avond|nacht om een dagdeel te bekijken. */
function devOverride(): DayPart | null {
  if (!import.meta.env.DEV) return null
  const value = new URLSearchParams(window.location.search).get('dagdeel')
  return PARTS.includes(value as DayPart) ? (value as DayPart) : null
}

function currentPart(): DayPart {
  const now = new Date()
  const { sunrise, sunset } = sunTimes(now)
  return devOverride() ?? dayPart(now, sunrise, sunset)
}

const STARS = [
  [140, 90], [260, 160], [420, 70], [560, 140], [700, 60], [820, 180], [960, 100], [1080, 50],
  [1180, 210], [1320, 120], [1460, 70], [1540, 190], [360, 240], [640, 230], [1000, 250],
]

/** Getekend landschap achter de hele app; kleurt mee met het dagdeel. */
export function Landscape() {
  const [part, setPart] = useState(currentPart)
  useEffect(() => {
    const timer = window.setInterval(() => setPart(currentPart()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="landscape" data-dagdeel={part} aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="landscape-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="ls-sky-top" />
            <stop offset="1" className="ls-sky-bottom" />
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#landscape-sky)" />
        <g className="ls-stars">
          {STARS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={x % 3 ? 1.6 : 2.4} />
          ))}
        </g>
        <g className="ls-sun">
          <circle cx="0" cy="0" r="46" />
        </g>
        <g className="ls-moon">
          <circle cx="0" cy="0" r="34" />
          <circle cx="-9" cy="-6" r="6" className="ls-crater" />
          <circle cx="10" cy="9" r="4" className="ls-crater" />
        </g>
        <path className="ls-hill-1" d="M0 600 C220 520 420 540 640 580 S1080 500 1300 540 S1520 560 1600 530 V900 H0Z" />
        <path className="ls-hill-2" d="M0 690 C200 630 380 650 600 690 S980 640 1200 670 S1480 690 1600 660 V900 H0Z" />
        <g className="ls-trees">
          {[
            [180, 640, 1],
            [230, 650, 0.8],
            [1240, 650, 1.1],
            [1300, 660, 0.85],
            [760, 680, 0.7],
          ].map(([x, y, s]) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
              <rect x="-4" y="-6" width="8" height="34" rx="3" className="ls-trunk" />
              <ellipse cx="0" cy="-26" rx="26" ry="34" className="ls-canopy" />
            </g>
          ))}
        </g>
        <path className="ls-hill-3" d="M0 780 C260 720 520 750 780 780 S1240 740 1600 760 V900 H0Z" />
      </svg>
    </div>
  )
}
