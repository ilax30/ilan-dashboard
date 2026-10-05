import type { ReactNode } from 'react'

type Props = { icon: ReactNode; title: string; value: string; line?: string; onOpen: () => void; /** Rustig kerngetal, bijv. "Binnenkort". */ muted?: boolean }

/** Onderwerp-tegel van het dashboard: grote illustratie, titel, kerngetal en één korte regel. Hele tegel klikbaar. */
export function Tile({ icon, title, value, line, onOpen, muted }: Props) {
  return (
    <button className="tile dash-card" type="button" onClick={onOpen}>
      <span className="tile-art" aria-hidden="true">
        {icon}
      </span>
      <span className="tile-body">
        <span className="tile-title">{title}</span>
        <span className="tile-value" data-muted={muted || undefined}>
          {value}
        </span>
        {line && <span className="tile-line">{line}</span>}
      </span>
      <span className="tile-cta">Bekijk alles →</span>
    </button>
  )
}
