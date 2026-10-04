import { useEffect, useRef } from 'react'
import { fullDate, sinceLabel } from '../lib/relativeTime'
import type { Todo } from '../lib/types'
import { LinkifiedText } from './LinkifiedText'

function dayLabel(iso: string, now: number) {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((day(new Date(now)) - day(new Date(iso))) / 864e5)
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Gisteren'
  if (diff === 2) return 'Eergisteren'
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

type ListProps = { items: Todo[] | null; now: number; onRestore: (todo: Todo) => void }

/** Afgeronde taken, gegroepeerd per dag. Gebruikt in de lade én als vaste kolom op brede schermen. */
export function HistoryList({ items, now, onRestore }: ListProps) {
  if (items === null) return <p className="drawer-empty">Even laden…</p>
  if (items.length === 0) return <p className="drawer-empty">Nog niks afgerond in de laatste 72 uur.</p>

  const groups = new Map<string, Todo[]>()
  for (const todo of items) {
    const label = dayLabel(todo.done_at!, now)
    groups.set(label, [...(groups.get(label) ?? []), todo])
  }

  return (
    <>
      {[...groups].map(([label, todos]) => (
        <section key={label} className="drawer-group">
          <h3 className="drawer-day">{label}</h3>
          <ul className="drawer-list">
            {todos.map((todo) => {
              const ago = sinceLabel(todo.done_at!, now)
              return (
                <li key={todo.id} className="done-item">
                  <svg className="done-item-check" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <circle cx="12" cy="12" r="11" fill="currentColor" />
                    <path d="M7 12.5l3.3 3.3L17 9" fill="none" stroke="var(--card)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="done-item-text">
                    <span className="done-item-title">
                      <LinkifiedText text={todo.title} />
                    </span>
                    <time className="done-item-time" dateTime={todo.done_at!} title={fullDate(todo.done_at!)}>
                      {ago === 'net' ? 'zojuist' : `${ago} geleden`}
                    </time>
                  </div>
                  <button className="restore" type="button" onClick={() => onRestore(todo)}>
                    Terugzetten
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}

function HistoryHeading({ id }: { id?: string }) {
  return (
    <div>
      <h2 className="drawer-title" id={id}>
        Afgerond
      </h2>
      <p className="drawer-sub">De laatste 72 uur</p>
    </div>
  )
}

/** Vaste kolom links op brede schermen. */
export function HistoryPanel(props: ListProps) {
  return (
    <aside className="history-panel" aria-label="Afgerond, de laatste 72 uur">
      <div className="drawer-head">
        <HistoryHeading />
      </div>
      <div className="drawer-body">
        <HistoryList {...props} />
      </div>
    </aside>
  )
}

type DrawerProps = ListProps & { open: boolean; onClose: () => void; onOpenCalendar: () => void }

/** Uitschuiflade op kleinere schermen. */
export function HistoryDrawer({ open, onClose, onOpenCalendar, ...list }: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className="scrim" data-open={open || undefined} onClick={onClose} aria-hidden="true" />
      <aside
        className="drawer"
        data-open={open || undefined}
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer-head">
          <HistoryHeading id="drawer-title" />
          <button className="icon-button drawer-cal" type="button" onClick={onOpenCalendar} aria-label="Overzicht van eerdere weken en maanden">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8.5" cy="14.5" r="1.3" fill="currentColor" />
              <circle cx="12" cy="14.5" r="1.3" fill="currentColor" />
            </svg>
          </button>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Sluiten">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="drawer-body">
          <HistoryList {...list} />
        </div>
      </aside>
    </>
  )
}
