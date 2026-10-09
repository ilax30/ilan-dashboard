// Slot op de Tennis-pagina: een eigen 4-cijferige code, los van de pincode van de app.
// Je blijft ontgrendeld zolang de app (het tabblad of venster) openstaat; na sluiten en opnieuw openen moet je de code weer invullen.
//
// Let op: dit is een scherm-slot tegen meekijken, geen versleuteling. De code staat als hash in de app,
// en 4 cijfers zijn te raden voor wie de code van de pagina leest. De echte beveiliging is de login van de app zelf.

const SALT = 'ilan-dashboard.tennis:'
const TENNIS_HASH = '0f166207593102077a81be5c3fb91c62853dfe96f5e94a4d1bce0888428f399d'
const KEY = 'tennis.unlocked'

export async function hashCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + code)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyCode(code: string, expected: string = TENNIS_HASH): Promise<boolean> {
  return (await hashCode(code)) === expected
}

/** sessionStorage verdwijnt zodra het tabblad of de app-venster sluit: dan is de pagina weer op slot. */
export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function unlock() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // geen sessie-opslag: dan geldt het alleen tot je de pagina verlaat
  }
}

export function lock() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // niets om te wissen
  }
}
