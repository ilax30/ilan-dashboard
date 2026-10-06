// Pincode-invoer buiten React-state: elke toets ziet direct de vorige, ook als je sneller tikt dan React tekent.

export type PinPress = { value: string; complete: string | null }

export function createPinEntry(length: number) {
  let value = ''
  /** Vol: wacht op controle (reset) voordat er nieuwe cijfers bij mogen. */
  let full = false

  return {
    press(key: string): PinPress {
      if (full) return { value, complete: null }
      if (key === '⌫') value = value.slice(0, -1)
      else if (/^\d$/.test(key)) value += key
      if (value.length === length) {
        full = true
        return { value, complete: value }
      }
      return { value, complete: null }
    },
    reset() {
      value = ''
      full = false
    },
  }
}
