import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type IconWeight,
} from '@phosphor-icons/react'
import type { WeatherIcon as IconKind } from '../lib/weather'

const DAY = { sun: Sun, partly: CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning }
const NIGHT = { ...DAY, sun: Moon, partly: CloudMoon }

/** Weericoon (Phosphor); 's nachts maan i.p.v. zon. */
export function WeatherIcon({ icon, size = 40, night = false, weight = 'regular' }: { icon: IconKind; size?: number; night?: boolean; weight?: IconWeight }) {
  const Component = (night ? NIGHT : DAY)[icon]
  return <Component className="weather-icon" data-icon={icon} size={size} weight={weight} aria-hidden="true" />
}
