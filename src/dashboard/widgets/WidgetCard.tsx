import type { MouseEvent, ReactNode } from 'react'
import type { SlotSize } from '../../lib/layout'

export type WidgetProps = { size: SlotSize; onOpen: () => void }

type Props = {
  title: string
  icon: ReactNode
  size: SlotSize
  onOpen: () => void
  /** Tekst van de open-knop rechtsboven. */
  openLabel?: string
  className?: string
  children: ReactNode
}

/** Klik op een knop, link of invoerveld in de tegel opent de tegel niet. */
const fromControl = (e: MouseEvent) => Boolean((e.target as HTMLElement).closest('button, a, input, textarea, label'))

/** Gemeenschappelijke tegel: kop met icoon en titel, "Bekijk alles →", en klik op de tegel = openen. */
export function WidgetCard({ title, icon, size, onOpen, openLabel = 'Bekijk alles', className, children }: Props) {
  return (
    <article
      className={`widget dash-card${className ? ` ${className}` : ''}`}
      data-size={size}
      onClick={(e) => {
        if (!fromControl(e)) onOpen()
      }}
    >
      <header className="widget-head">
        <span className="widget-icon" aria-hidden="true">
          {icon}
        </span>
        <h2 className="widget-title">{title}</h2>
        <button className="widget-open" type="button" onClick={onOpen}>
          {openLabel} <span aria-hidden="true">→</span>
        </button>
      </header>
      <div className="widget-body">{children}</div>
    </article>
  )
}
