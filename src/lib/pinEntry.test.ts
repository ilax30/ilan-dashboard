import { describe, expect, it } from 'vitest'
import { createPinEntry } from './pinEntry'

// Testcode, niet de echte pincode.
describe('pincode invoeren', () => {
  it('mist geen cijfer als je snel achter elkaar tikt (elke toets ziet de vorige meteen)', () => {
    const entry = createPinEntry(4)
    const results = ['4', '7', '1', '1'].map((k) => entry.press(k))
    expect(results.map((r) => r.value)).toEqual(['4', '47', '471', '4711'])
    expect(results[3].complete).toBe('4711')
    expect(results.slice(0, 3).every((r) => r.complete === null)).toBe(true)
  })
  it('negeert extra cijfers terwijl de code gecontroleerd wordt, en begint daarna opnieuw', () => {
    const entry = createPinEntry(4)
    for (const k of '1234') entry.press(k)
    expect(entry.press('5').value).toBe('1234')
    entry.reset()
    expect(entry.press('8')).toEqual({ value: '8', complete: null })
  })
  it('wist het laatste cijfer en negeert andere toetsen', () => {
    const entry = createPinEntry(4)
    entry.press('1')
    entry.press('2')
    expect(entry.press('⌫').value).toBe('1')
    expect(entry.press('a').value).toBe('1')
  })
})
