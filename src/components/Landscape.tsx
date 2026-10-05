import { useEffect, useState, type CSSProperties } from 'react'
import { dayPart, todayAt, type DayPart } from '../lib/dayPart'

const PARTS: DayPart[] = ['ochtend', 'dag', 'avond', 'nacht']
const FADE_MS = 4000

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

const photo = (part: DayPart) => ({ '--photo': `url("${import.meta.env.BASE_URL}landschap/${part}.webp")` }) as CSSProperties

/** Natuurfoto achter de hele app, per dagdeel (zie public/landschap/BRONNEN.md); vloeit over bij een nieuw dagdeel. */
export function Landscape() {
  const [part, setPart] = useState(currentPart)
  const [leaving, setLeaving] = useState<DayPart | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = currentPart()
      setPart((p) => {
        if (p !== next) setLeaving(p)
        return next
      })
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => setLeaving(null), FADE_MS + 200)
    return () => window.clearTimeout(t)
  }, [leaving])

  return (
    <div className="landscape" data-dagdeel={part} aria-hidden="true">
      {leaving && <div className="ls-photo" style={photo(leaving)} />}
      <div key={part} className="ls-photo" data-entering={leaving ? '' : undefined} style={photo(part)} />
    </div>
  )
}
