import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TOPICS } from '../dashboard/topics'
import { emit } from '../lib/appEvents'
import { navigate, type Route } from '../lib/router'
import { store } from '../lib/store'
import type { Todo } from '../lib/types'
import { Icon, type IconName } from './icons'
import { MoreFooter } from './MoreFooter'
import type { PageControls } from './PinGate'
import { ThemeToggle } from './ThemeToggle'

type Props = { route: Route; controls?: PageControls }

/** Zijbalk op elke pagina: navigatie, snel een taak toevoegen, dag/nacht, instellingen en meer. */
export function Sidebar({ route, controls }: Props) {
  const [open, setOpen] = useState(false) // alleen op smalle schermen (laag over de pagina)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef(0)

  useEffect(() => setOpen(false), [route])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => () => window.clearTimeout(noteTimer.current), [])

  function flash(text: string) {
    setNote(text)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(null), 2500)
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const text = title.trim()
    if (!text) return
    setTitle('')
    try {
      const list = await store.list()
      const todo: Todo = {
        id: crypto.randomUUID(),
        title: text,
        // Bovenaan de niet-gesterde taken, net als op de to-do pagina.
        position: list.length ? Math.min(...list.map((t) => t.position)) - 1 : 0,
        created_at: new Date().toISOString(),
        done_at: null,
        starred: false,
        notes: '',
      }
      await store.create(todo)
      emit('todos-changed')
      flash('Toegevoegd ✓')
    } catch {
      setTitle(text)
      flash('Opslaan mislukt. Probeer het nog eens.')
    }
  }

  const item = (key: IconName, label: string, active: boolean, onClick: () => void, later = false) => (
    <li key={label}>
      <button className="side-link" type="button" data-active={active || undefined} data-later={later || undefined} aria-current={active ? 'page' : undefined} onClick={onClick} title={label}>
        <Icon name={key} weight={active ? 'fill' : 'regular'} />
        <span className="side-label">{label}</span>
      </button>
    </li>
  )

  return (
    <>
      <button className="side-menu-button" type="button" aria-label="Menu openen" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="menu" />
      </button>
      {open && <div className="side-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <nav className="sidebar" data-open={open || undefined} aria-label="Hoofdmenu">
        <div className="side-brand">
          <span className="side-logo" aria-hidden="true">
            <Icon name="logo" size={20} weight="bold" />
          </span>
          <span className="side-label side-title">Ilan Dashboard</span>
        </div>

        <ul className="side-nav">
          {item('home', 'Home', route === '/', () => navigate('/'))}
          {item('todo', 'Taken', route === '/todo', () => navigate('/todo'))}
          {item('agenda', 'Agenda', false, () => emit('open-agenda'))}
          {TOPICS.map((t) => item(t.id, t.title, route === t.route, () => navigate(t.route), t.later))}
        </ul>

        <div className="side-bottom">
          <form className="side-quick" onSubmit={add}>
            <label className="side-quick-label" htmlFor="side-quick-input">
              <Icon name="quick" size={18} weight="fill" className="side-quick-icon" />
              Snel toevoegen
            </label>
            <input
              id="side-quick-input"
              className="side-quick-input"
              type="text"
              autoComplete="off"
              maxLength={500}
              placeholder="Nieuwe taak…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {note && (
              <span className="side-quick-note" role="status">
                {note}
              </span>
            )}
          </form>
          <div className="side-theme">
            <ThemeToggle />
          </div>
          <ul className="side-nav">{item('settings', 'Instellingen', false, () => emit('open-settings'))}</ul>
          <div className="side-more">
            <MoreFooter onLock={controls?.onLock} onSetPin={controls?.onSetPin ?? (() => {})} onLogout={controls?.onLogout} />
          </div>
          {/* Icoonbalk (iPad): uitklappen voor snel toevoegen en Meer…. */}
          {!open && (
            <button className="side-expand" type="button" aria-label="Menu uitklappen" title="Meer" onClick={() => setOpen(true)}>
              <Icon name="more" weight="bold" />
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
