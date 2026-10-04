/**
 * Pincode-slot per apparaat. Het account zelf blijft ingelogd (Supabase-sessie);
 * de pincode is een snel slot op dit apparaat, opgeslagen als gezouten hash.
 */
import { supabase } from './supabase'

type Stored = { salt: string; hash: string }

const key = (uid: string) => `notitie.pin.${uid}`
const skipKey = (uid: string) => `notitie.pin.skip.${uid}`
const failKey = (uid: string) => `notitie.pin.fails.${uid}`

export const MAX_TRIES = 5

async function sha256(text: string) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function get(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}

function set(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* geen opslag beschikbaar */
  }
}

export function hasPin(uid: string) {
  return get(key(uid)) !== null
}

export function pinSkipped(uid: string) {
  return get(skipKey(uid)) === '1'
}

export function skipPin(uid: string) {
  set(skipKey(uid), '1')
}

/** Pincode alleen op dit apparaat onthouden (voor het slot, ook offline). */
export async function savePinLocal(uid: string, pin: string) {
  const salt = crypto.randomUUID()
  const stored: Stored = { salt, hash: await sha256(salt + pin) }
  set(key(uid), JSON.stringify(stored))
  set(skipKey(uid), null)
  set(failKey(uid), null)
  return stored
}

/**
 * Pincode wijzigen: op de server (waar inloggen mee gebeurt), in je account (voor je andere
 * apparaten) en op dit apparaat. Geeft false als de server weigert.
 */
export async function savePin(uid: string, pin: string) {
  if (supabase) {
    const { error } = await supabase.functions.invoke('todo-pin-login', { body: { action: 'change', newPin: pin } })
    if (error) return false
  }
  const stored = await savePinLocal(uid, pin)
  await supabase?.auth.updateUser({ data: { pin: stored } })
  return true
}

/**
 * Pincode uit je account (ingesteld op een ander apparaat) overnemen op dit apparaat.
 * Geeft true als er nu een pincode is.
 */
export async function syncPinFromAccount(uid: string) {
  if (!supabase) return hasPin(uid)
  const { data } = await supabase.auth.getUser()
  const stored = data.user?.user_metadata?.pin as Stored | undefined
  if (stored?.salt && stored?.hash) {
    set(key(uid), JSON.stringify(stored))
    return true
  }
  return hasPin(uid)
}

export function clearPin(uid: string) {
  set(key(uid), null)
  set(failKey(uid), null)
}

/** Geeft true bij de juiste pincode; telt foute pogingen bij. */
export async function checkPin(uid: string, pin: string) {
  const raw = get(key(uid))
  if (!raw) return true
  const stored = JSON.parse(raw) as Stored
  const ok = (await sha256(stored.salt + pin)) === stored.hash
  set(failKey(uid), ok ? null : String(failures(uid) + 1))
  return ok
}

export function failures(uid: string) {
  return Number(get(failKey(uid)) ?? 0)
}
