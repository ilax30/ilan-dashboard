import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'

type Theme = 'light' | 'dark'
const KEY = 'notitie.theme'
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* geen opslag beschikbaar */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Hele pagina wisselt: de browser maakt een momentopname van het oude thema, en het nieuwe
 * thema wordt in een groeiende cirkel vanaf het schuifje onthuld.
 */
async function revealTheme(from: HTMLElement, swap: () => void) {
  const r = from.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const transition = document.startViewTransition(() => flushSync(swap))
  try {
    await transition.ready
  } catch {
    // Browser sloeg de overgang over (bijv. tabblad niet zichtbaar); het thema is al gewisseld.
    return
  }
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 700, easing: EASE_IN_OUT, pseudoElement: '::view-transition-new(root)' },
  )
  await transition.finished.catch(() => {})
}

/** Dag/nacht-schuifje. Zet data-theme op <html>; de keuze wordt onthouden. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const busy = useRef(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // Venster-/statusbalk van de app laten meekleuren met het thema.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', theme === 'dark' ? '#221D1B' : '#CBBFAE'))
  }, [theme])

  async function toggle(e: MouseEvent<HTMLButtonElement>) {
    if (busy.current) return
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* geen opslag beschikbaar */
    }

    const canReveal = 'startViewTransition' in document
    if (!canReveal || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Rustige variant: alleen de kleuren laten meeglijden.
      const root = document.documentElement
      root.classList.add('theme-anim')
      window.setTimeout(() => root.classList.remove('theme-anim'), 400)
      setTheme(next)
      return
    }

    busy.current = true
    try {
      await revealTheme(e.currentTarget, () => {
        document.documentElement.dataset.theme = next
        setTheme(next)
      })
    } finally {
      busy.current = false
    }
  }

  const night = theme === 'dark'

  return (
    <button
      className="theme-toggle"
      type="button"
      role="switch"
      aria-checked={night}
      aria-label="Nachtmodus"
      title={night ? 'Naar dag' : 'Naar nacht'}
      onClick={toggle}
      data-night={night || undefined}
    >
      <svg className="theme-icon theme-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.6" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M5.1 18.9l1.8-1.8M17.1 6.9l1.8-1.8" />
        </g>
      </svg>
      <svg className="theme-icon theme-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 3.2a8.8 8.8 0 1 0 5.3 15.1A7.4 7.4 0 0 1 15.5 3.2Z" fill="currentColor" />
      </svg>
      <span className="theme-knob" aria-hidden="true" />
    </button>
  )
}
