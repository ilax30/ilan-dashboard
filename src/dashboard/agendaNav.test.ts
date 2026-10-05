import { describe, expect, it } from 'vitest'
import { canStep, step } from './agendaNav'

const at = (s: string) => new Date(s)
// Bereik zoals op de agendapagina: maandag 5 okt t/m zondag 3 jan.
const bounds = { first: at('2026-10-05T00:00'), last: at('2027-01-03T00:00') }

describe('canStep', () => {
  it('blijft per dag binnen het bereik', () => {
    expect(canStep('day', at('2026-10-05T00:00'), -1, bounds)).toBe(false)
    expect(canStep('day', at('2027-01-03T00:00'), 1, bounds)).toBe(false)
    expect(canStep('day', at('2026-10-07T00:00'), 1, bounds)).toBe(true)
  })
  it('blijft per week binnen het bereik', () => {
    expect(canStep('week', at('2026-10-07T00:00'), -1, bounds)).toBe(false)
    expect(canStep('week', at('2026-12-28T00:00'), 1, bounds)).toBe(false)
    expect(canStep('week', at('2026-12-21T00:00'), 1, bounds)).toBe(true)
  })
  it('bladert per maand zolang de maand het bereik raakt', () => {
    expect(canStep('month', at('2026-10-15T00:00'), -1, bounds)).toBe(false)
    expect(canStep('month', at('2026-12-15T00:00'), 1, bounds)).toBe(true) // januari raakt 1–3 jan
    expect(canStep('month', at('2027-01-02T00:00'), 1, bounds)).toBe(false)
  })
})

describe('step', () => {
  it('gaat een dag, week of maand verder op lokale middernacht', () => {
    expect(step('day', at('2026-10-07T00:00'), 1)).toEqual(at('2026-10-08T00:00'))
    expect(step('week', at('2026-10-05T00:00'), 1)).toEqual(at('2026-10-12T00:00'))
    expect(step('month', at('2026-10-15T00:00'), 1)).toEqual(at('2026-11-01T00:00'))
  })
  it('klopt over de wintertijd heen', () => {
    expect(step('day', at('2026-10-25T00:00'), 1)).toEqual(at('2026-10-26T00:00'))
  })
})
