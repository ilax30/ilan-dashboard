import { describe, expect, it } from 'vitest'
import { dayPart, dayProgress } from './dayPart'

const at = (s: string) => new Date(s)

describe('dayPart', () => {
  // 5 oktober: zon op 07:30, onder 19:00
  const op = at('2026-10-05T07:30')
  const onder = at('2026-10-05T19:00')
  it.each([
    ['2026-10-05T06:44', 'nacht'],
    ['2026-10-05T06:45', 'ochtend'],
    ['2026-10-05T09:00', 'ochtend'],
    ['2026-10-05T09:01', 'dag'],
    ['2026-10-05T17:30', 'avond'],
    ['2026-10-05T19:45', 'avond'],
    ['2026-10-05T19:46', 'nacht'],
  ])('%s → %s', (t, part) => {
    expect(dayPart(at(t), op, onder)).toBe(part)
  })

  it('is in december al vroeg avond en nacht', () => {
    const decOp = at('2026-12-15T08:45')
    const decOnder = at('2026-12-15T16:30')
    expect(dayPart(at('2026-12-15T17:00'), decOp, decOnder)).toBe('avond')
    expect(dayPart(at('2026-12-15T18:00'), decOp, decOnder)).toBe('nacht')
  })

  it('valt zonder zonnetijden terug op 07:00 en 19:00', () => {
    expect(dayPart(at('2026-10-05T06:30'), null, null)).toBe('ochtend')
    expect(dayPart(at('2026-10-05T12:00'), null, null)).toBe('dag')
    expect(dayPart(at('2026-10-05T18:00'), null, null)).toBe('avond')
    expect(dayPart(at('2026-10-05T23:00'), null, null)).toBe('nacht')
  })
})

describe('dayProgress', () => {
  it('meet de hele dag, van 00:00 tot 24:00 (afgerond naar beneden, dus pas 100% om middernacht)', () => {
    expect(dayProgress(at('2026-10-05T00:00'))).toBe(0)
    expect(dayProgress(at('2026-10-05T06:00'))).toBe(25)
    expect(dayProgress(at('2026-10-05T12:00'))).toBe(50)
    expect(dayProgress(at('2026-10-05T23:03'))).toBe(96)
    expect(dayProgress(at('2026-10-05T23:59'))).toBe(99)
  })
})
