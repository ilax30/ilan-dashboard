import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Dashboard-instellingen: geheime iCal-link en woonplaats.
// Met Supabase in public.dashboard_settings (RLS: alleen de eigenaar); in de lokale testmodus in localStorage
// (zonder agenda, want die loopt via de Edge Function).

export type DashboardSettings = {
  icalUrl: string | null
  cityName: string | null
  latitude: number | null
  longitude: number | null
}

const EMPTY: DashboardSettings = { icalUrl: null, cityName: null, latitude: null, longitude: null }
const LOCAL_KEY = 'dashboard.settings'

function readLocal(): DashboardSettings {
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Partial<DashboardSettings>) }
  } catch {
    return EMPTY
  }
}

export type Place = Pick<DashboardSettings, 'cityName' | 'latitude' | 'longitude'>
const PLACE_KEY = 'dashboard.place'

/** Woonplaats (niet geheim) op het apparaat onthouden, zodat het weer ook offline meteen kan tonen. */
export function rememberPlace(s: DashboardSettings, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    const place: Place = { cityName: s.cityName, latitude: s.latitude, longitude: s.longitude }
    storage.setItem(PLACE_KEY, JSON.stringify(place))
  } catch {
    // alleen een gemak
  }
}

export function rememberedPlace(storage: Pick<Storage, 'getItem'> = localStorage): Place | null {
  try {
    const place = JSON.parse(storage.getItem(PLACE_KEY) ?? 'null') as Place | null
    return place && typeof place.latitude === 'number' && typeof place.longitude === 'number' ? place : null
  } catch {
    return null
  }
}

export async function getSettings(): Promise<DashboardSettings> {
  if (!supabase) return readLocal()
  const { data, error } = await supabase
    .from('dashboard_settings')
    .select('ical_url, city_name, latitude, longitude')
    .maybeSingle()
  if (error) throw error
  const settings = data
    ? { icalUrl: data.ical_url, cityName: data.city_name, latitude: data.latitude, longitude: data.longitude }
    : EMPTY
  rememberPlace(settings)
  return settings
}

export async function saveSettings(patch: Partial<DashboardSettings>): Promise<void> {
  if (!supabase) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...readLocal(), ...patch, icalUrl: null }))
    return
  }
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('not_signed_in')
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  if ('icalUrl' in patch) row.ical_url = patch.icalUrl
  if ('cityName' in patch) row.city_name = patch.cityName
  if ('latitude' in patch) row.latitude = patch.latitude
  if ('longitude' in patch) row.longitude = patch.longitude
  const { error } = await supabase.from('dashboard_settings').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

/** Leest de JSON-foutcode uit een niet-2xx-antwoord van de Edge Function. */
export async function functionErrorCode(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await (error.context as Response).json()) as { error?: unknown }
      if (typeof body.error === 'string') return body.error
    } catch {
      // geen JSON
    }
  }
  return 'fetch_failed'
}

/** Test een iCal-link via de Edge Function, zonder hem op te slaan. */
export async function testCalendarUrl(url: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'no_backend' }
  const { data, error } = await supabase.functions.invoke('dashboard-calendar', { body: { testUrl: url } })
  if (error) return { ok: false, error: await functionErrorCode(error) }
  if (data?.ok === true && typeof data.count === 'number') return { ok: true, count: data.count }
  return { ok: false, error: typeof data?.error === 'string' ? data.error : 'fetch_failed' }
}
