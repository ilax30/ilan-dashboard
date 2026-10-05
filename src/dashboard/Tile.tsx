import type { ReactNode } from 'react'

type Props = { icon: ReactNode; title: string; value: string; line?: string; onOpen: () => void }

/** Onderwerp-tegel van het dashboard: grote illustratie, titel, kerngetal en één korte regel. Hele tegel klikbaar. */
export function Tile({ icon, title, value, line, onOpen }: Props) {
  return (
    <button className="tile dash-card" type="button" onClick={onOpen}>
      <span className="tile-art" aria-hidden="true">
        {icon}
      </span>
      <span className="tile-body">
        <span className="tile-title">{title}</span>
        <span className="tile-value">{value}</span>
        {line && <span className="tile-line">{line}</span>}
      </span>
      <span className="tile-cta">Bekijk alles →</span>
    </button>
  )
}
