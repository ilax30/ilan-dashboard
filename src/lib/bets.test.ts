import { describe, expect, it, vi } from 'vitest'
import { bankroll, betPage, betProfit, bookmakerStats, parseOdds, totals, type Bet, type Bookmaker } from './bets'

// Geen echte database in tests.
vi.mock('./supabase', () => ({ supabase: null }))

const bet = (id: string, over: Partial<Bet> = {}): Bet => ({
  id,
  bookmaker_id: 'toto',
  category: 'ATP',
  match: '',
  stake: 100,
  odds: 1.9,
  placed_on: '2026-10-05',
  result: 'open',
  created_at: '2026-10-05T10:00:00Z',
  ...over,
})
const toto: Bookmaker = { id: 'toto', name: 'Toto', start_bankroll: 300, created_at: '2026-10-01T10:00:00Z' }
const bet365: Bookmaker = { id: 'b365', name: 'Bet365', start_bankroll: 500, created_at: '2026-10-01T10:00:00Z' }

describe('betProfit', () => {
  it('winst = inzet × (odds − 1), verlies = − inzet, open = 0', () => {
    expect(betProfit(bet('a', { result: 'won' }))).toBe(90)
    expect(betProfit(bet('a', { result: 'lost' }))).toBe(-100)
    expect(betProfit(bet('a'))).toBe(0)
  })
  it('rondt af op centen', () => {
    expect(betProfit(bet('a', { result: 'won', stake: 33.33, odds: 1.85 }))).toBe(28.33)
  })
})

describe('bankroll', () => {
  it('is startbankroll plus alle afgesloten resultaten van die bookmaker', () => {
    const bets = [
      bet('a', { result: 'won' }),
      bet('b', { result: 'lost', stake: 40 }),
      bet('c', { result: 'won', bookmaker_id: 'b365', stake: 50, odds: 2 }),
    ]
    expect(bankroll(toto, bets)).toBe(350)
    expect(bankroll(bet365, bets)).toBe(550)
  })
  it('verandert niet door een open weddenschap', () => {
    expect(bankroll(toto, [bet('a', { stake: 250 })])).toBe(300)
  })
})

describe('totals', () => {
  it('telt winst, gewonnen-percentage en rendement over afgesloten weddenschappen', () => {
    const t = totals([
      bet('a', { result: 'won' }),
      bet('b', { result: 'lost' }),
      bet('c', { result: 'lost' }),
      bet('d', { result: 'won', stake: 50, odds: 2 }),
      bet('open'),
    ])
    expect(t.profit).toBe(-60)
    expect(t.settled).toBe(4)
    expect(t.won).toBe(2)
    expect(t.winPct).toBe(50)
    expect(t.staked).toBe(350)
    expect(t.roi).toBeCloseTo(-17.14, 1)
    expect(t.open).toBe(1)
  })
  it('geeft null bij niets afgesloten', () => {
    const t = totals([bet('open')])
    expect(t.winPct).toBeNull()
    expect(t.roi).toBeNull()
    expect(t.profit).toBe(0)
  })
})

describe('bookmakerStats', () => {
  it('geeft per bookmaker bankroll, resultaat en aantal', () => {
    const s = bookmakerStats([toto, bet365], [bet('a', { result: 'won' }), bet('b')])
    expect(s.map((x) => [x.bookmaker.name, x.bankroll, x.profit, x.count])).toEqual([
      ['Toto', 390, 90, 2],
      ['Bet365', 500, 0, 0],
    ])
  })
})

describe('betPage', () => {
  const many = Array.from({ length: 23 }, (_, i) => bet(`b${i}`, { placed_on: `2026-09-${String(i + 1).padStart(2, '0')}` }))
  it('toont nieuwste eerst, 10 per pagina', () => {
    const p = betPage(many, 1)
    expect(p.items).toHaveLength(10)
    expect(p.items[0].id).toBe('b22')
    expect(p.pages).toBe(3)
    expect(betPage(many, 3).items).toHaveLength(3)
  })
  it('houdt de pagina binnen het bereik', () => {
    expect(betPage(many, 99).page).toBe(3)
    expect(betPage(many, 0).page).toBe(1)
    expect(betPage([], 1)).toMatchObject({ items: [], pages: 1, page: 1 })
  })
  it('zet bij dezelfde dag de laatst geplaatste eerst', () => {
    const p = betPage([bet('x', { created_at: '2026-10-05T09:00:00Z' }), bet('y', { created_at: '2026-10-05T11:00:00Z' })], 1)
    expect(p.items.map((b) => b.id)).toEqual(['y', 'x'])
  })
})

describe('parseOdds', () => {
  it('leest komma en punt, minimaal 1,01', () => {
    expect(parseOdds('1,90')).toBe(1.9)
    expect(parseOdds('2.25')).toBe(2.25)
    expect(parseOdds('1')).toBeNull()
    expect(parseOdds('abc')).toBeNull()
    expect(parseOdds('')).toBeNull()
  })
})
