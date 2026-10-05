// Ilan's To-Do lijst — dashboard-agenda.
// Gedeployed als Supabase Edge Function "dashboard-calendar" (verify_jwt aan + eigen getUser-check:
// alleen ingelogde gebruikers; de publieke sleutel alleen is niet genoeg).
//
// POST {}                 -> { events: CalEvent[], fetchedAt }   (vandaag t/m +8 dagen, Amsterdamse tijd)
// POST { testUrl }        -> { ok: true, count } | { ok: false, error }   (link testen zonder op te slaan)
// Fouten: { error: 'no_calendar' | 'fetch_failed' | 'parse_failed' }
//
// De geheime iCal-link staat in public.dashboard_settings (RLS: alleen de eigenaar); we lezen hem met de
// JWT van de gebruiker, zodat RLS bepaalt wat zichtbaar is.
import ICAL from 'npm:ical.js@2'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { amsterdamDayStart, expandEvents } from './expand.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const DAY = 24 * 60 * 60 * 1000

async function fetchIcs(url: string): Promise<string> {
  const normalized = url.trim().replace(/^webcal:\/\//i, 'https://')
  if (!/^https:\/\//i.test(normalized)) throw new Error('fetch_failed')
  const res = await fetch(normalized, { signal: AbortSignal.timeout(8000), headers: { Accept: 'text/calendar' } })
  if (!res.ok) throw new Error('fetch_failed')
  return await res.text()
}

function load(ics: string) {
  const start = amsterdamDayStart(new Date())
  const end = new Date(start.getTime() + 8 * DAY)
  return expandEvents(ICAL, ics, start, end)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let body: { testUrl?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  // Alleen voor ingelogde gebruikers: een publieke sleutel alleen is niet genoeg (anders open proxy).
  const authHeader = req.headers.get('Authorization') ?? ''
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: auth } = await db.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
  if (!auth.user) return json({ error: 'unauthorized' }, 401)

  // Link testen (vóór opslaan in de instellingen).
  if (typeof body.testUrl === 'string') {
    try {
      const events = load(await fetchIcs(body.testUrl))
      return json({ ok: true, count: events.length })
    } catch (e) {
      const error = e instanceof Error && e.message === 'parse_failed' ? 'parse_failed' : 'fetch_failed'
      return json({ ok: false, error })
    }
  }

  const { data: settings } = await db.from('dashboard_settings').select('ical_url').maybeSingle()
  if (!settings?.ical_url) return json({ error: 'no_calendar' }, 400)

  try {
    const events = load(await fetchIcs(settings.ical_url))
    return json({ events, fetchedAt: new Date().toISOString() })
  } catch (e) {
    const error = e instanceof Error && e.message === 'parse_failed' ? 'parse_failed' : 'fetch_failed'
    return json({ error }, 502)
  }
})
