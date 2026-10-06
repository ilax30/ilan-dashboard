import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPinEntry } from '../lib/pinEntry'
import { Sprig } from './Decor'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
const LENGTH = 4

type Props = {
  title: string
  hint: string
  error?: string
  /** Wordt aangeroepen zodra er 4 cijfers zijn; geef false terug bij een foute code. */
  onComplete: (pin: string) => Promise<boolean> | boolean
  footer?: ReactNode
}

/** Cijfertoetsenbord met 4 bolletjes; werkt met vinger, muis en toetsenbord. */
export function PinPad({ title, hint, error, onComplete, footer }: Props) {
  // Wat er is ingetikt staat buiten de React-state: bij snel tikken ziet elke toets meteen de vorige.
  const entry = useRef(createPinEntry(LENGTH)).current
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(0)

  async function press(k: string) {
    const { value, complete } = entry.press(k)
    setPin(value)
    if (!complete) return
    const ok = await onComplete(complete)
    if (!ok) {
      setShake((n) => n + 1)
      navigator.vibrate?.(60)
      setTimeout(() => {
        entry.reset()
        setPin('')
      }, 260)
    } else {
      entry.reset()
      setPin('')
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      if (e.key === 'Backspace') press('⌫')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main className="login pin">
      <h1 className="title">Ilan Dashboard</h1>
      <Sprig className="sprig" />
      <p className="pin-title">{title}</p>
      <p className="login-text">{hint}</p>

      <div className="pin-dots" key={shake} data-shake={shake > 0 || undefined} aria-live="polite" aria-label={`${pin.length} van ${LENGTH} cijfers ingevuld`}>
        {Array.from({ length: LENGTH }, (_, i) => (
          <span key={i} className="pin-dot" data-on={i < pin.length || undefined} />
        ))}
      </div>
      {error && <p className="login-text error">{error}</p>}

      <div className="pin-pad">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className="pin-key"
              onClick={() => press(k)}
              aria-label={k === '⌫' ? 'Wis laatste cijfer' : k}
            >
              {k}
            </button>
          ),
        )}
      </div>

      {footer && <div className="pin-footer">{footer}</div>}
    </main>
  )
}
