import { useState } from 'react'

/**
 * Geforceerd verversen: oude opgeslagen app-bestanden weggooien en de nieuwste versie laden.
 * Handig op desktop, waar een geïnstalleerde app soms aan een oude versie blijft hangen.
 * Offline doen we alleen een gewone herlaad (anders is er niets om te laden).
 */
async function forceRefresh() {
  if (navigator.onLine && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {
      /* lukt het niet, dan in elk geval gewoon herladen */
    }
  }
  window.location.reload()
}

export function RefreshButton() {
  const [busy, setBusy] = useState(false)

  return (
    <button
      className="refresh-button"
      type="button"
      title="Ververs: nieuwste versie laden"
      aria-label="Ververs de app en laad de nieuwste versie"
      data-busy={busy || undefined}
      onClick={() => {
        setBusy(true)
        void forceRefresh()
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M20 11a8 8 0 1 0-2.3 5.7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M20.5 4.5V11h-6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
