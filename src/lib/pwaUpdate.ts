import { registerSW } from 'virtual:pwa-register'

const HOUR = 60 * 60 * 1000

/** Bezig met typen of slepen? Dan nog niet herladen, anders raak je dat kwijt. */
function busy() {
  const el = document.activeElement
  const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
  return typing || document.querySelector('.card-overlay') !== null
}

function reloadWhenSafe() {
  if (!busy()) return window.location.reload()
  const retry = window.setInterval(() => {
    if (busy()) return
    window.clearInterval(retry)
    window.location.reload()
  }, 2000)
}

/**
 * Nieuwe versie van de app direct gebruiken op alle apparaten.
 * De service worker neemt een nieuwe versie meteen in gebruik (skipWaiting + clientsClaim);
 * deze pagina herlaadt dan zodra je niet aan het typen of slepen bent.
 * Er wordt gecheckt bij openen, bij terugkomen in de app en elk uur.
 */
export function setupUpdates() {
  registerSW({
    immediate: true,
    // Wordt alleen aangeroepen bij een nieuwe versie (niet bij de eerste installatie).
    onNeedReload: reloadWhenSafe,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => void registration.update(), HOUR)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void registration.update()
      })
    },
  })
}
