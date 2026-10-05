import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Verlanglijstje op de Financiën-pagina: titel, prijs, link en een optionele groep (bijv. "Computer").

export type Wish = {
  id: string
  title: string
  /** Link naar het product (http/https) of leeg. */
  url: string
  price: number
  /** Optionele groep voor een subtotaal; leeg = "Overig". */
  group: string
  /** Wanneer je hem als gekocht hebt afgevinkt; na 24 uur verdwijnt hij. */
  bought_at: string | null
  created_at: string
}

const KEEP_MS = 24 * 60 * 60 * 1000
export const OTHER_GROUP = 'Overig'

const isExpired = (w: Wish, now: Date) => w.bought_at !== null && now.getTime() - new Date(w.bought_at).getTime() >= KEEP_MS

/** Wat je ziet: eerst wat nog open is (op volgorde van toevoegen), daaronder wat in de afgelopen 24 uur gekocht is. */
export function visibleWishes(items: Wish[], now: Date): Wish[] {
  const open = items.filter((w) => !w.bought_at).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const bought = items.filter((w) => w.bought_at && !isExpired(w, now)).sort((a, b) => b.bought_at!.localeCompare(a.bought_at!))
  return [...open, ...bought]
}

/** Gekochte wensen ouder dan 24 uur: die worden opgeruimd. */
export function expiredWishes(items: Wish[], now: Date): Wish[] {
  return items.filter((w) => isExpired(w, now))
}

/** Totaal van alles wat nog niet gekocht is. */
export function wishTotal(items: Wish[]): number {
  return Math.round(items.filter((w) => !w.bought_at).reduce((sum, w) => sum + w.price, 0) * 100) / 100
}

const groupKey = (g: string) => g.trim().toLowerCase()

/** Per groep (hoofdletters/spaties maken niet uit) met subtotaal van wat nog open is; "Overig" als laatste. */
export function wishGroups(items: Wish[]): { name: string; items: Wish[]; total: number }[] {
  const map = new Map<string, { name: string; items: Wish[] }>()
  for (const w of items) {
    const key = groupKey(w.group) || groupKey(OTHER_GROUP)
    const entry = map.get(key) ?? { name: w.group.trim() || OTHER_GROUP, items: [] }
    entry.items.push(w)
    map.set(key, entry)
  }
  const other = groupKey(OTHER_GROUP)
  return [...map.entries()]
    .sort(([a], [b]) => Number(a === other) - Number(b === other) || a.localeCompare(b))
    .map(([, g]) => ({ ...g, total: wishTotal(g.items) }))
}

/** "www.winkel.nl/x" → "https://www.winkel.nl/x"; alleen http(s), anders null. */
export function safeUrl(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

// ---------- Opslag: Supabase (met login) of localStorage (lokale testmodus) ----------

export interface WishlistStore {
  list(): Promise<Wish[]>
  save(wish: Wish): Promise<void>
  remove(id: string): Promise<void>
}

const COLUMNS = 'id, title, url, price, group:group_name, bought_at, created_at'

function createSupabaseWishlist(db: SupabaseClient): WishlistStore {
  const table = () => db.from('wishlist')
  return {
    async list() {
      const { data, error } = await table().select(COLUMNS).order('created_at', { ascending: true })
      if (error) throw error
      return (data as unknown as Wish[]).map((w) => ({ ...w, price: Number(w.price) }))
    },
    async save(w) {
      const { error } = await table().upsert({
        id: w.id,
        title: w.title,
        url: w.url,
        price: w.price,
        group_name: w.group,
        bought_at: w.bought_at,
        created_at: w.created_at,
      })
      if (error) throw error
    },
    async remove(id) {
      const { error } = await table().delete().eq('id', id)
      if (error) throw error
    },
  }
}

const LOCAL_KEY = 'verlanglijst.v1'
const readLocal = (): Wish[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Wish[]
  } catch {
    return []
  }
}
const writeLocal = (items: Wish[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
  } catch {
    // opslag vol of geblokkeerd
  }
}

const localWishlist: WishlistStore = {
  async list() {
    return readLocal()
  },
  async save(w) {
    writeLocal([...readLocal().filter((x) => x.id !== w.id), w])
  },
  async remove(id) {
    writeLocal(readLocal().filter((x) => x.id !== id))
  },
}

export const wishlistStore: WishlistStore = supabase ? createSupabaseWishlist(supabase) : localWishlist
