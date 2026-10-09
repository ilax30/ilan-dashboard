import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Tennisweddenschappen: per bookmaker een bankroll die meegroeit met gewonnen en verloren weddenschappen.

export const BET_CATEGORIES = ['ATP', 'Challenger', 'ITF'] as const
export type BetCategory = (typeof BET_CATEGORIES)[number]
export type BetResult = 'open' | 'won' | 'lost'

export type Bookmaker = {
  id: string
  name: string
  start_bankroll: number
  created_at: string
}

export type Bet = {
  id: string
  bookmaker_id: string
  category: BetCategory
  /** Live geplaatst (tijdens de wedstrijd); anders pre-match. Oude weddenschappen zonder veld zijn pre-match. */
  live: boolean
  /** Vrij veld: wedstrijd of speler, mag leeg. */
  match: string
  stake: number
  /** Decimale odds, bijv. 1.9. */
  odds: number
  /** Datum van plaatsen, YYYY-MM-DD. */
  placed_on: string
  result: BetResult
  created_at: string
}

export const PAGE_SIZE = 10

const cents = (n: number) => Math.round(n * 100) / 100

/** Resultaat in euro: winst = inzet × (odds − 1), verlies = − inzet, open = 0. */
export function betProfit(b: Bet): number {
  if (b.result === 'won') return cents(b.stake * (b.odds - 1))
  if (b.result === 'lost') return -b.stake
  return 0
}

const profitOf = (bets: Bet[]) => cents(bets.reduce((sum, b) => sum + betProfit(b), 0))

/** Bankroll bij een bookmaker: startbedrag plus alle afgesloten resultaten. Open weddenschappen tellen niet mee. */
export function bankroll(bm: Bookmaker, bets: Bet[]): number {
  return cents(bm.start_bankroll + profitOf(bets.filter((b) => b.bookmaker_id === bm.id)))
}

export type Totals = {
  profit: number
  settled: number
  won: number
  open: number
  staked: number
  /** Percentage gewonnen van de afgesloten weddenschappen; null zonder afgesloten. */
  winPct: number | null
  /** Winst als percentage van de totale inzet (afgesloten); null zonder afgesloten. */
  roi: number | null
}

export function totals(bets: Bet[]): Totals {
  const settled = bets.filter((b) => b.result !== 'open')
  const won = settled.filter((b) => b.result === 'won').length
  const staked = cents(settled.reduce((sum, b) => sum + b.stake, 0))
  const profit = profitOf(bets)
  return {
    profit,
    settled: settled.length,
    won,
    open: bets.length - settled.length,
    staked,
    winPct: settled.length ? Math.round((won / settled.length) * 100) : null,
    roi: staked > 0 ? (profit / staked) * 100 : null,
  }
}

export type BookmakerStat = { bookmaker: Bookmaker; bankroll: number; profit: number; count: number }

/** Per bookmaker: bankroll, resultaat en aantal weddenschappen, op volgorde van toevoegen. */
export function bookmakerStats(bookmakers: Bookmaker[], bets: Bet[]): BookmakerStat[] {
  return [...bookmakers]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((bookmaker) => {
      const own = bets.filter((b) => b.bookmaker_id === bookmaker.id)
      return { bookmaker, bankroll: bankroll(bookmaker, bets), profit: profitOf(own), count: own.length }
    })
}

export type CategoryStat = Totals & { category: BetCategory; count: number }

/** Per categorie (ATP, Challenger, ITF) de totalen; een categorie zonder weddenschappen staat er ook bij. */
export function categoryStats(bets: Bet[]): CategoryStat[] {
  return BET_CATEGORIES.map((category) => {
    const own = bets.filter((b) => b.category === category)
    return { category, count: own.length, ...totals(own) }
  })
}

export type LiveStat = Totals & { count: number }

/** Live tegenover pre-match: zo zie je of live wedden winst oplevert. */
export function liveStats(bets: Bet[]): { live: LiveStat; prematch: LiveStat } {
  const live = bets.filter((b) => b.live === true)
  const prematch = bets.filter((b) => b.live !== true)
  return { live: { count: live.length, ...totals(live) }, prematch: { count: prematch.length, ...totals(prematch) } }
}

/** Eén pagina met de nieuwste weddenschappen eerst; de pagina blijft binnen het bereik. */
export function betPage(bets: Bet[], page: number, size = PAGE_SIZE): { items: Bet[]; page: number; pages: number } {
  const sorted = [...bets].sort((a, b) => b.placed_on.localeCompare(a.placed_on) || b.created_at.localeCompare(a.created_at))
  const pages = Math.max(1, Math.ceil(sorted.length / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return { items: sorted.slice((current - 1) * size, current * size), page: current, pages }
}

/** "1,90" of "2.25" → getal; minimaal 1,01, anders null. */
export function parseOdds(input: string): number | null {
  const s = input.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return n > 1 && Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null
}

export const formatOdds = (n: number) => n.toFixed(2).replace('.', ',')

// ---------- Opslag: Supabase (met login) of localStorage (lokale testmodus) ----------

export interface BetsStore {
  listBookmakers(): Promise<Bookmaker[]>
  saveBookmaker(b: Bookmaker): Promise<void>
  removeBookmaker(id: string): Promise<void>
  listBets(): Promise<Bet[]>
  saveBet(b: Bet): Promise<void>
  removeBet(id: string): Promise<void>
}

const BET_COLUMNS = 'id, bookmaker_id, category, live, match, stake, odds, placed_on, result, created_at'

const toBet = (r: Bet): Bet => ({ ...r, live: r.live === true, stake: Number(r.stake), odds: Number(r.odds) })

function createSupabaseBets(db: SupabaseClient): BetsStore {
  return {
    async listBookmakers() {
      const { data, error } = await db.from('bookmakers').select('id, name, start_bankroll, created_at').order('created_at', { ascending: true })
      if (error) throw error
      return (data as Bookmaker[]).map((b) => ({ ...b, start_bankroll: Number(b.start_bankroll) }))
    },
    async saveBookmaker(b) {
      const { error } = await db.from('bookmakers').upsert(b)
      if (error) throw error
    },
    async removeBookmaker(id) {
      const { error } = await db.from('bookmakers').delete().eq('id', id)
      if (error) throw error
    },
    async listBets() {
      const { data, error } = await db.from('bets').select(BET_COLUMNS).order('placed_on', { ascending: false })
      if (error) throw error
      return (data as Bet[]).map(toBet)
    },
    async saveBet(b) {
      const { error } = await db.from('bets').upsert(b)
      if (error) throw error
    },
    async removeBet(id) {
      const { error } = await db.from('bets').delete().eq('id', id)
      if (error) throw error
    },
  }
}

const readLocal = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}
const writeLocal = (key: string, items: unknown[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // opslag vol of geblokkeerd
  }
}

const BM_KEY = 'weddenschappen.bookmakers.v1'
const BET_KEY = 'weddenschappen.bets.v1'

const localBets: BetsStore = {
  async listBookmakers() {
    return readLocal<Bookmaker>(BM_KEY)
  },
  async saveBookmaker(b) {
    writeLocal(BM_KEY, [...readLocal<Bookmaker>(BM_KEY).filter((x) => x.id !== b.id), b])
  },
  async removeBookmaker(id) {
    writeLocal(BM_KEY, readLocal<Bookmaker>(BM_KEY).filter((x) => x.id !== id))
  },
  async listBets() {
    return readLocal<Bet>(BET_KEY)
  },
  async saveBet(b) {
    writeLocal(BET_KEY, [...readLocal<Bet>(BET_KEY).filter((x) => x.id !== b.id), b])
  },
  async removeBet(id) {
    writeLocal(BET_KEY, readLocal<Bet>(BET_KEY).filter((x) => x.id !== id))
  },
}

export const betsStore: BetsStore = supabase ? createSupabaseBets(supabase) : localBets
