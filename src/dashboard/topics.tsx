import type { JSX } from 'react'
import type { Route } from '../lib/router'

// Onderwerpen van het dashboard. Een nieuw onderwerp = één regel hier (+ route in router.ts).

export type Topic = {
  id: 'doelen' | 'financien' | 'notities' | 'projecten'
  title: string
  route: Route
  /** Korte regel op de tegel. */
  line: string
  /** Tekst op de (nog) lege pagina. */
  empty: string
  Art: () => JSX.Element
}

/** Vlaggetje op een heuvel. */
function GoalArt() {
  return (
    <svg viewBox="0 0 96 96" width="96" height="96">
      <path d="M8 82c12-20 26-30 40-30s28 10 40 30z" className="art-hill" />
      <line x1="48" y1="54" x2="48" y2="16" className="art-pole" />
      <path d="M50 17c8-4 14 4 24 0v18c-10 4-16-4-24 0z" className="art-flag" />
      <circle cx="22" cy="24" r="5" className="art-sun" />
    </svg>
  )
}

/** Spaarvarken met muntjes. */
function MoneyArt() {
  return (
    <svg viewBox="0 0 96 96" width="96" height="96">
      <ellipse cx="46" cy="54" rx="28" ry="22" className="art-pig" />
      <circle cx="74" cy="52" r="8" className="art-pig" />
      <circle cx="76" cy="51" r="1.6" className="art-dot" />
      <circle cx="72" cy="51" r="1.6" className="art-dot" />
      <path d="M30 35l4-9 8 7" className="art-pig" />
      <rect x="32" y="72" width="7" height="9" rx="3" className="art-pig" />
      <rect x="52" y="72" width="7" height="9" rx="3" className="art-pig" />
      <rect x="40" y="33" width="14" height="4" rx="2" className="art-slot" />
      <circle cx="47" cy="20" r="8" className="art-coin" />
      <circle cx="18" cy="80" r="6" className="art-coin" />
      <circle cx="84" cy="80" r="5" className="art-coin" />
    </svg>
  )
}

/** Opengeslagen schriftje met potlood. */
function NotesArt() {
  return (
    <svg viewBox="0 0 96 96" width="96" height="96">
      <path d="M10 24c12-4 26-4 38 4v54c-12-8-26-8-38-4z" className="art-page" />
      <path d="M86 24c-12-4-26-4-38 4v54c12-8 26-8 38-4z" className="art-page" />
      {[38, 48, 58].map((y) => (
        <g key={y}>
          <line x1="18" y1={y} x2="40" y2={y + 2} className="art-ruling" />
          <line x1="56" y1={y + 2} x2="78" y2={y} className="art-ruling" />
        </g>
      ))}
      <g transform="rotate(35 70 30)">
        <rect x="66" y="6" width="9" height="40" rx="2" className="art-pencil" />
        <path d="M66 46h9l-4.5 9z" className="art-pencil-tip" />
      </g>
    </svg>
  )
}

/** Stapeltje mapjes. */
function ProjectsArt() {
  return (
    <svg viewBox="0 0 96 96" width="96" height="96">
      <path d="M14 30h22l6 6h40v40H14z" className="art-folder-back" />
      <path d="M10 42h24l6 6h46v32H10z" className="art-folder" />
      <rect x="20" y="58" width="30" height="5" rx="2.5" className="art-line" />
      <rect x="20" y="67" width="20" height="5" rx="2.5" className="art-line" />
      <circle cx="74" cy="66" r="7" className="art-sun" />
    </svg>
  )
}

export const TOPICS: Topic[] = [
  { id: 'doelen', title: 'Doelen', route: '/doelen', line: 'Je doelen voor deze week', empty: 'Hier komen straks je doelen.', Art: GoalArt },
  { id: 'financien', title: 'Financiën', route: '/financien', line: 'Overzicht van je geld', empty: 'Hier komt straks je geldoverzicht.', Art: MoneyArt },
  { id: 'notities', title: 'Notities', route: '/notities', line: 'Losse gedachten en lijstjes', empty: 'Hier komen straks je notities.', Art: NotesArt },
  { id: 'projecten', title: 'Projecten', route: '/projecten', line: 'Waar je aan werkt', empty: 'Hier komen straks je projecten.', Art: ProjectsArt },
]

export const topicFor = (route: Route) => TOPICS.find((t) => t.route === route)
