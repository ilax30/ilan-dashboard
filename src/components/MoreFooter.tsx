import { useState } from 'react'
import type { PageProps } from '../pages/TodoPage'

/** "Meer…" onderaan een pagina: vergrendelen, pincode wijzigen en (weggestopt) uitloggen. */
export function MoreFooter({ onLock, onSetPin, onLogout }: PageProps) {
  const [confirmLogout, setConfirmLogout] = useState(false)
  if (!onLogout) return null
  return (
    <footer className="footer">
      {/* Uitloggen is zelden nodig: weggestopt, zodat je er niet per ongeluk op drukt. */}
      <details className="footer-more">
        <summary>Meer…</summary>
        <div className="footer-more-items">
          {onLock && (
            <button className="link" type="button" onClick={onLock}>
              Vergrendelen
            </button>
          )}
          <button className="link" type="button" onClick={onSetPin}>
            Pincode wijzigen
          </button>
          <button
            className="link"
            type="button"
            onClick={() => {
              if (confirmLogout) return onLogout()
              setConfirmLogout(true)
              setTimeout(() => setConfirmLogout(false), 4000)
            }}
          >
            {confirmLogout ? 'Zeker? Klik nogmaals om uit te loggen' : 'Uitloggen'}
          </button>
        </div>
      </details>
    </footer>
  )
}
