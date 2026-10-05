import { describe, expect, it, vi } from 'vitest'
import { safeUrl, visibleWishes, wishGroups, wishTotal, expiredWishes, type Wish } from './wishlist'

// Geen echte database in tests.
vi.mock('./supabase', () => ({ supabase: null }))

const wish = (id: string, over: Partial<Wish> = {}): Wish => ({
  id,
  title: id,
  url: '',
  price: 10,
  group: '',
  bought_at: null,
  created_at: '2026-10-01T10:00:00Z',
  ...over,
})

const now = new Date('2026-10-05T12:00:00Z')

describe('verlanglijstje', () => {
  it('telt alles op wat nog niet gekocht is', () => {
    expect(wishTotal([wish('a', { price: 99.99 }), wish('b', { price: 250 }), wish('c', { price: 40, bought_at: '2026-10-05T10:00:00Z' })])).toBeCloseTo(349.99, 2)
  })
  it('laat gekochte wensen 24 uur staan (onderaan), daarna niet meer', () => {
    const list = [
      wish('oud gekocht', { bought_at: '2026-10-04T11:00:00Z' }),
      wish('net gekocht', { bought_at: '2026-10-05T09:00:00Z' }),
      wish('open'),
    ]
    expect(visibleWishes(list, now).map((w) => w.id)).toEqual(['open', 'net gekocht'])
    expect(expiredWishes(list, now).map((w) => w.id)).toEqual(['oud gekocht'])
  })
  it('groepeert met subtotaal; zonder groep onder "Overig", die als laatste', () => {
    const groups = wishGroups([
      wish('ssd', { group: 'Computer', price: 120 }),
      wish('boek', { price: 20 }),
      wish('gpu', { group: 'computer ', price: 600 }),
      wish('muis', { group: 'Computer', price: 50, bought_at: '2026-10-05T10:00:00Z' }),
    ])
    expect(groups.map((g) => [g.name, g.items.map((w) => w.id), g.total])).toEqual([
      ['Computer', ['ssd', 'gpu', 'muis'], 720],
      ['Overig', ['boek'], 20],
    ])
  })
  it('maakt van een link een veilige http(s)-link, of null', () => {
    expect(safeUrl('www.coolblue.nl/product/1')).toBe('https://www.coolblue.nl/product/1')
    expect(safeUrl(' https://tweakers.net/x ')).toBe('https://tweakers.net/x')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('')).toBeNull()
  })
})
