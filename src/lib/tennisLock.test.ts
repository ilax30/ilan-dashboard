import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashCode, isUnlocked, lock, unlock, verifyCode } from './tennisLock'

describe('verifyCode', () => {
  it('accepteert de juiste code en weigert een foute', async () => {
    const hash = await hashCode('1234')
    expect(await verifyCode('1234', hash)).toBe(true)
    expect(await verifyCode('1235', hash)).toBe(false)
    expect(await verifyCode('', hash)).toBe(false)
  })
  it('de ingebouwde code is niet triviaal te raden', async () => {
    for (const guess of ['0000', '1111', '1234', '1212', '4321']) expect(await verifyCode(guess)).toBe(false)
  })
})

describe('ontgrendeld blijven', () => {
  // De testomgeving heeft geen browser-opslag: een eenvoudige vervanger.
  beforeEach(() => {
    const data = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    })
  })

  it('begint op slot, en blijft open zolang de sessie (de app) openstaat', () => {
    expect(isUnlocked()).toBe(false)
    unlock()
    expect(isUnlocked()).toBe(true)
  })
  it('lock() zet hem weer op slot', () => {
    unlock()
    lock()
    expect(isUnlocked()).toBe(false)
  })
})
