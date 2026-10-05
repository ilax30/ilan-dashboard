import { describe, expect, it } from 'vitest'
import { dueSoon, formatEuro, monthlyTotal, nextDueAfter, openThisMonth, parseAmount, type Bill } from './bills'

const bill = (id: string, over: Partial<Bill> = {}): Bill => ({
  id,
  name: id,
  amount: 10,
  cadence: 'maand',
  next_due: '2026-10-08',
  due_day: 8,
  category: 'Abonnementen',
  active: true,
  created_at: '2026-10-01T10:00:00Z',
  ...over,
})

describe('nextDueAfter', () => {
  it('maandelijks: zelfde dag, of de laatste dag van een kortere maand', () => {
    expect(nextDueAfter('2026-01-31', 'maand', 31)).toBe('2026-02-28')
    expect(nextDueAfter('2028-01-31', 'maand', 31)).toBe('2028-02-29')
    expect(nextDueAfter('2026-02-28', 'maand', 31)).toBe('2026-03-31')
    expect(nextDueAfter('2026-10-08', 'maand', 8)).toBe('2026-11-08')
  })
  it('wekelijks, per kwartaal en jaarlijks', () => {
    expect(nextDueAfter('2026-12-28', 'week', 28)).toBe('2027-01-04')
    expect(nextDueAfter('2026-11-30', 'kwartaal', 30)).toBe('2027-02-28')
    expect(nextDueAfter('2028-02-29', 'jaar', 29)).toBe('2029-02-28')
  })
})

describe('bedragen', () => {
  it('leest Nederlandse invoer', () => {
    expect(parseAmount('11,99')).toBe(11.99)
    expect(parseAmount('€ 5,00')).toBe(5)
    expect(parseAmount('1.234,50')).toBe(1234.5)
    expect(parseAmount('12')).toBe(12)
    expect(parseAmount('12.5')).toBe(12.5)
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('-3')).toBeNull()
  })
  it('toont euro’s met komma', () => {
    expect(formatEuro(11.99).replace(/\s/g, ' ')).toBe('€ 11,99')
    expect(formatEuro(1234.5).replace(/\s/g, ' ')).toBe('€ 1.234,50')
  })
})

describe('overzicht', () => {
  const now = new Date('2026-10-05T12:00')
  const bills = [
    bill('Netflix', { amount: 11.99, next_due: '2026-10-08' }),
    bill('Ziggo', { amount: 52, next_due: '2026-10-15' }),
    bill('Verzekering', { amount: 120, cadence: 'jaar', next_due: '2027-03-01' }),
    bill('Te laat', { amount: 5, next_due: '2026-09-30' }),
    bill('Gestopt', { amount: 99, active: false, next_due: '2026-10-10' }),
    bill('Sport', { amount: 7.5, cadence: 'week', next_due: '2026-10-31' }),
  ]
  it('telt op wat deze maand nog vervalt, elke keer dat het vervalt (te laat 30 sep + 30 okt), niet wat gestopt is', () => {
    expect(openThisMonth(bills, now)).toBeCloseTo(11.99 + 52 + 5 * 2 + 7.5, 2)
  })
  it('rekent vaste lasten om naar per maand', () => {
    // 11,99 + 52 + 120/12 + 5 + 7,50 × 52/12 (gestopt telt niet mee)
    expect(monthlyTotal(bills)).toBeCloseTo(11.99 + 52 + 10 + 5 + (7.5 * 52) / 12, 2)
  })
  it('geeft wat binnen 7 dagen vervalt, eerst wat te laat is', () => {
    expect(dueSoon(bills, now, 7).map((b) => b.name)).toEqual(['Te laat', 'Netflix'])
  })
})
