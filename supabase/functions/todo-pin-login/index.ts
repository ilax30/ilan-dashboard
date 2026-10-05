// Ilan Dashboard: inloggen met alleen een pincode.
// Gedeployed als Supabase Edge Function "todo-pin-login" (verify_jwt uit; eigen controle hieronder).
//
// POST { pin }                 -> { token_hash }  (client ruilt die in voor een sessie via verifyOtp)
// POST { action: 'change', newPin } met Authorization: Bearer <sessie-JWT van de eigenaar>
//
// Bescherming tegen raden: na elke 5 foute pogingen een slot dat steeds verdubbelt
// (15 min, 30 min, 1 uur, ... max 24 uur). De pincode staat alleen gehasht in public.todo_pin,
// die tabel is niet bereikbaar voor de app zelf (alleen deze functie met de service role).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const TRIES_PER_LOCK = 5
const BASE_LOCK_MIN = 15
const MAX_LOCK_MIN = 24 * 60

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Vergelijken zonder vroegtijdig te stoppen (geen timing-lek).
function same(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const validPin = (p: unknown): p is string => typeof p === 'string' && /^\d{4}$/.test(p)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let body: { action?: string; pin?: unknown; newPin?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: row, error: rowError } = await admin.from('todo_pin').select('*').eq('id', 1).single()
  if (rowError || !row) return json({ error: 'not_configured' }, 500)

  // Pincode wijzigen: alleen de ingelogde eigenaar.
  if (body.action === 'change') {
    const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData.user || userData.user.id !== row.user_id) return json({ error: 'unauthorized' }, 401)
    if (!validPin(body.newPin)) return json({ error: 'invalid_pin' }, 400)
    const salt = crypto.randomUUID()
    const hash = await sha256(salt + body.newPin)
    await admin.from('todo_pin').update({ salt, hash, failed: 0, locked_until: null }).eq('id', 1)
    return json({ ok: true })
  }

  // Inloggen.
  const now = Date.now()
  if (row.locked_until && new Date(row.locked_until).getTime() > now) {
    const retryAfter = Math.ceil((new Date(row.locked_until).getTime() - now) / 1000)
    return json({ error: 'locked', retry_after_s: retryAfter }, 429)
  }
  if (!validPin(body.pin)) return json({ error: 'invalid_pin' }, 400)

  const ok = same(await sha256(row.salt + body.pin), row.hash)
  if (!ok) {
    const failed = row.failed + 1
    let locked_until: string | null = null
    let remaining = TRIES_PER_LOCK - (failed % TRIES_PER_LOCK)
    if (failed % TRIES_PER_LOCK === 0) {
      const minutes = Math.min(MAX_LOCK_MIN, BASE_LOCK_MIN * 2 ** (failed / TRIES_PER_LOCK - 1))
      locked_until = new Date(now + minutes * 60_000).toISOString()
      remaining = 0
    }
    await admin.from('todo_pin').update({ failed, locked_until }).eq('id', 1)
    if (locked_until) {
      return json({ error: 'locked', retry_after_s: Math.ceil((new Date(locked_until).getTime() - now) / 1000) }, 429)
    }
    return json({ error: 'wrong', remaining }, 401)
  }

  await admin.from('todo_pin').update({ failed: 0, locked_until: null }).eq('id', 1)

  // Sessie aanmaken zonder mail: een eenmalige inlog-token die de app direct inwisselt.
  const { data: owner } = await admin.auth.admin.getUserById(row.user_id)
  const email = owner.user?.email
  if (!email) return json({ error: 'not_configured' }, 500)
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !link.properties?.hashed_token) return json({ error: 'link_failed' }, 500)
  return json({ token_hash: link.properties.hashed_token })
})
