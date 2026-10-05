import { describe, expect, it } from 'vitest'
import { canStep, step } from './agendaNav'

const at = (s: string) => new Date(s)
const now = at('2026-10-07T12:00') // woensdag; bereik ma 5 okt t/m zo 8 nov

describe('canStep', () => {
  it('blijft per dag binnen de 5 weken', () => {
    expect(canStep('day', at('2026-10-05T00:00'), -1, now)).toBe(false)
    expect(canStep('day', at('2026-11-08T00:00'), 1, now)).toBe(false)
    expect(canStep('day', at('2026-10-07T00:00'), 1, now)).toBe(true)
    expect(canStep('day', at('2026-10-07T00:00'), -1, now)).toBe(true)
  })
  it('blijft per week binnen de 5 weken', () => {
    expect(canStep('week', at('2026-10-05T00:00'), -1, now)).toBe(false)
    expect(canStep('week', at('2026-11-02T00:00'), 1, now)).toBe(false)
    expect(canStep('week', at('2026-10-26T00:00'), 1, now)).toBe(true)
  })
})

describe('step', () => {
  it('gaat een dag of een week verder, op lokale middernacht', () => {
    expect(step('day', at('2026-10-07T00:00'), 1)).toEqual(at('2026-10-08T00:00'))
    expect(step('week', at('2026-10-05T00:00'), 1)).toEqual(at('2026-10-12T00:00'))
    expect(step('day', at('2026-10-05T00:00'), -1)).toEqual(at('2026-10-04T00:00'))
  })
  it('klopt over de wintertijd heen', () => {
    expect(step('day', at('2026-10-24T00:00'), 1)).toEqual(at('2026-10-25T00:00'))
    expect(step('day', at('2026-10-25T00:00'), 1)).toEqual(at('2026-10-26T00:00'))
  })
})
