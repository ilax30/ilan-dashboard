import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { TOPICS, type Topic } from '../dashboard/topics'
import { emit } from '../lib/appEvents'
import { navigate, type Route } from '../lib/router'
import { store } from '../lib/store'
import type { Todo } from '../lib/types'
import { MoreFooter } from './MoreFooter'
import type { PageControls } from './PinGate'
import { ThemeToggle } from './ThemeToggle'

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

const ICONS: Record<'home' | 'agenda' | 'todo' | Topic['id'] | 'settings' | 'menu', ReactNode> = {
  home: icon(<path d="M4 11l8-6.5 8 6.5M6 9.5V19h12V9.5" />),
  agenda: icon(<><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>),
  todo: icon(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></>),
  doelen: icon(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>),
  financien: icon(<><rect x="3.5" y="6.5" width="17" height="12" rx="3" /><path d="M3.5 10.5h17M16 14.5h1.5" /></>),
  notities: icon(<><path d="M6 3.5h9l3.5 3.5v13.5H6z" /><path d="M9 11h6M9 14.5h6M9 18h3.5" /></>),
  projecten: icon(<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />),
  settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4L5.6 5.6" /></>),
  menu: icon(<path d="M4 7h16M4 12h16M4 17h16" />),
}

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

  const item = (key: keyof typeof ICONS, label: string, active: boolean, onClick: () => void) => (
    <li key={label}>
      <button className="side-link" type="button" data-active={active || undefined} aria-current={active ? 'page' : undefined} onClick={onClick} title={label}>
        {ICONS[key]}
        <span className="side-label">{label}</span>
      </button>
    </li>
  )

  return (
    <>
      <button className="side-menu-button" type="button" aria-label="Menu openen" aria-expanded={open} onClick={() => setOpen(true)}>
        {ICONS.menu}
      </button>
      {open && <div className="side-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <nav className="sidebar" data-open={open || undefined} aria-label="Hoofdmenu">
        <div className="side-brand">
          <span className="side-logo" aria-hidden="true">
            {icon(<path d="M3 18l5.5-8 4 5 3-4 5.5 7" />)}
          </span>
          <span className="side-label side-title">Ilan's dashboard</span>
        </div>

        <ul className="side-nav">
          {item('home', 'Home', route === '/', () => navigate('/'))}
          {/* Het agendavenster komt in taak 10; tot dan naar het dashboard (daar staat de agenda). */}
          {item('agenda', 'Agenda', false, () => navigate('/'))}
          {item('todo', 'Taken', route === '/todo', () => navigate('/todo'))}
          {TOPICS.map((t) => item(t.id, t.title, route === t.route, () => navigate(t.route)))}
        </ul>

        <div className="side-bottom">
          <form className="side-quick" onSubmit={add}>
            <label className="side-quick-label" htmlFor="side-quick-input">
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
        </div>
      </nav>
    </>
  )
}
