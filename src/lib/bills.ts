import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Financiën: vaste lasten (abonnementen, huur, verzekeringen) met bedrag, frequentie en volgende betaaldatum.

export type Cadence = 'week' | 'maand' | 'kwartaal' | 'jaar' | 'eenmalig'
export const CADENCES: Cadence[] = ['week', 'maand', 'kwartaal', 'jaar', 'eenmalig']
export const CATEGORIES = ['Wonen', 'Abonnementen', 'Verzekering', 'Overig'] as const

export type Bill = {
  id: string
  name: string
  amount: number
  cadence: Cadence
  /** Volgende betaaldatum, "YYYY-MM-DD". */
  next_due: string
  /** Gewenste dag van de maand (1–31), zodat 31 na februari weer 31 wordt. */
  due_day: number
  category: string
  active: boolean
  created_at: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const daysIn = (y: number, monthIndex: number) => new Date(y, monthIndex + 1, 0).getDate()

/** Volgende betaaldatum na `date`: week +7 dagen; maand/kwartaal/jaar op `dueDay` (of de laatste dag). */
export function nextDueAfter(date: string, cadence: Cadence, dueDay: number): string {
  const d = parse(date)
  if (cadence === 'week') return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))
  const months = cadence === 'maand' ? 1 : cadence === 'kwartaal' ? 3 : 12
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const day = Math.min(dueDay, daysIn(target.getFullYear(), target.getMonth()))
  return iso(new Date(target.getFullYear(), target.getMonth(), day))
}

const endOfMonth = (now: Date) => iso(new Date(now.getFullYear(), now.getMonth() + 1, 0))

/** Wat deze kalendermaand nog vervalt (elke keer dat het vervalt, ook wat te laat is). */
export function openThisMonth(bills: Bill[], now: Date): number {
  const end = endOfMonth(now)
  let total = 0
  for (const b of bills) {
    if (!b.active) continue
    let due = b.next_due
    for (let i = 0; due <= end && i < 60; i++) {
      total += b.amount
      if (b.cadence === 'eenmalig') break
      due = nextDueAfter(due, b.cadence, b.due_day)
    }
  }
  return Math.round(total * 100) / 100
}

const PER_MONTH: Record<Cadence, number> = { week: 52 / 12, maand: 1, kwartaal: 1 / 3, jaar: 1 / 12, eenmalig: 0 }

/** Alle actieve vaste lasten omgerekend naar per maand (eenmalige betalingen tellen niet mee). */
export function monthlyTotal(bills: Bill[]): number {
  return Math.round(bills.filter((b) => b.active).reduce((sum, b) => sum + b.amount * PER_MONTH[b.cadence], 0) * 100) / 100
}

/** Actieve vaste lasten die binnen `days` dagen vervallen (of al te laat zijn), op datum. */
export function dueSoon(bills: Bill[], now: Date, days: number): Bill[] {
  const limit = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
  return bills.filter((b) => b.active && b.next_due <= limit).sort((a, b) => a.next_due.localeCompare(b.next_due))
}

/** "11,99", "€ 5,00", "1.234,50", "12.5" → getal; ongeldig of negatief → null. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[€\s]/g, '')
  if (!/^\d[\d.,]*$/.test(s)) return null
  let normalized: string
  if (s.includes(',')) normalized = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) normalized = s.replace(/\./g, '')
  else normalized = s
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
export const formatEuro = (n: number) => euro.format(n)

/** Dagen tot de vervaldatum (negatief = te laat). */
export function daysUntil(date: string, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parse(date).getTime() - today.getTime()) / 86_400_000)
}

/**
 * Vaste dag van de maand bij opslaan: de dag van de gekozen datum, maar de bestaande vaste dag blijft
 * als de datum niet verandert of op de laatste dag van een kortere maand valt (31 → 30 nov → weer 31).
 */
export function dueDayFor(date: string, existing?: Pick<Bill, 'next_due' | 'due_day'>): number {
  const day = Number(date.slice(8, 10))
  if (!existing) return day
  if (date === existing.next_due) return existing.due_day
  const [y, m] = date.split('-').map(Number)
  return day === daysIn(y, m - 1) && existing.due_day > day ? existing.due_day : day
}

export type DueTone ='late' | 'today' | 'soon'

/** Label voor betalingen die te laat zijn of binnen 7 dagen vallen; anders null. */
export function dueLabel(date: string, now: Date): { text: string; tone: DueTone } | null {
  const days = daysUntil(date, now)
  if (days < 0) return { text: 'Te laat', tone: 'late' }
  if (days === 0) return { text: 'Vandaag', tone: 'today' }
  if (days === 1) return { text: 'Morgen', tone: 'soon' }
  if (days <= 7) return { text: `Over ${days} dagen`, tone: 'soon' }
  return null
}

// ---------- Opslag: Supabase (met login) of localStorage (lokale testmodus) ----------

export type BillInput = Omit<Bill, 'created_at'>

export interface BillsStore {
  list(): Promise<Bill[]>
  save(bill: Bill): Promise<void>
  remove(id: string): Promise<void>
}

const COLUMNS = 'id, name, amount, cadence, next_due, due_day, category, active, created_at'

function createSupabaseBills(db: SupabaseClient): BillsStore {
  const bills = () => db.from('bills')
  return {
    async list() {
      const { data, error } = await bills().select(COLUMNS).order('next_due', { ascending: true })
      if (error) throw error
      return (data as Bill[]).map((b) => ({ ...b, amount: Number(b.amount) }))
    },
    async save(bill) {
      const { error } = await bills().upsert(bill)
      if (error) throw error
    },
    async remove(id) {
      const { error } = await bills().delete().eq('id', id)
      if (error) throw error
    },
  }
}

const LOCAL_KEY = 'financien.v1'
const readLocal = (): Bill[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Bill[]
  } catch {
    return []
  }
}
const writeLocal = (bills: Bill[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(bills))
  } catch {
    // opslag vol of geblokkeerd
  }
}

const localBills: BillsStore = {
  async list() {
    return readLocal().sort((a, b) => a.next_due.localeCompare(b.next_due))
  },
  async save(bill) {
    writeLocal([bill, ...readLocal().filter((b) => b.id !== bill.id)])
  },
  async remove(id) {
    writeLocal(readLocal().filter((b) => b.id !== id))
  },
}

export const billsStore: BillsStore = supabase ? createSupabaseBills(supabase) : localBills
