import { describe, expect, it } from 'vitest'
import { lockPolicy } from './lockPolicy'

describe('lockPolicy', () => {
  it('desktop: nooit op slot zolang de app openstaat, pas na 2 uur weg', () => {
    expect(lockPolicy(true)).toEqual({ lockAfterMs: 2 * 60 * 60 * 1000, lockWhileOpen: false })
  })
  it('telefoon/tablet: na 10 minuten niets doen op slot, ook terwijl de app openstaat', () => {
    expect(lockPolicy(false)).toEqual({ lockAfterMs: 10 * 60 * 1000, lockWhileOpen: true })
  })
})
