import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { navigate } from '../lib/router'
import { store } from '../lib/store'
import { supabase } from '../lib/supabase'
import { compareTodos, type Todo } from '../lib/types'
import { Tile } from './Tile'

/** Klembord met vinkjes, in de cozy kleuren. */
function TodoArt() {
  return (
    <svg viewBox="0 0 96 96" width="96" height="96">
      <rect x="18" y="14" width="60" height="74" rx="12" className="art-board" />
      <rect x="34" y="8" width="28" height="14" rx="6" className="art-clip" />
      {[36, 52, 68].map((y, i) => (
        <g key={y}>
          <rect x="28" y={y - 6} width="12" height="12" rx="4" className="art-box" />
          {i < 2 && <path d={`M30.5 ${y}l3 3 5-6`} className="art-check" />}
          <rect x="46" y={y - 3} width={i === 2 ? 18 : 24} height="6" rx="3" className="art-line" />
        </g>
      ))}
      <path d="M74 70c5-6 13-2 9 5-2 4-9 8-9 8s-7-4-9-8c-4-7 4-11 9-5z" className="art-heart" />
    </svg>
  )
}

/** To-do op het dashboard: aantal open taken, bovenste (favoriete) taak en snel een taak toevoegen. */
export function TodoSummaryCard() {
  const [todos, setTodos] = useState<Todo[] | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef(0)

  const load = useCallback(() => {
    store
      .list()
      .then((list) => setTodos([...list].sort(compareTodos)))
      .catch(() => setTodos((t) => t ?? []))
  }, [])

  useEffect(() => {
    load()
    const onVisible = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  // Live bijwerken als er op een ander apparaat iets verandert.
  useEffect(() => {
    const db = supabase
    if (!db) return
    let channel: ReturnType<typeof db.channel> | null = null
    let timer = 0
    let cancelled = false
    db.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      if (!uid || cancelled) return
      channel = db
        .channel(`todos-dashboard-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${uid}` }, () => {
          window.clearTimeout(timer)
          timer = window.setTimeout(load, 400)
        })
        .subscribe()
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (channel) void db.removeChannel(channel)
    }
  }, [load])

  useEffect(() => () => window.clearTimeout(noteTimer.current), [])

  function flash(text: string) {
    setNote(text)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(null), 2500)
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const text = title.trim()
    if (!text) return
    const list = todos ?? []
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
    setTitle('')
    setTodos([todo, ...list].sort(compareTodos))
    store
      .create(todo)
      .then(() => flash('Toegevoegd ✓'))
      .catch(() => {
        flash('Opslaan mislukt. Probeer het nog eens.')
        load()
      })
  }

  const top = todos?.[0]
  const count = todos?.length ?? 0
  return (
    <>
      <Tile
        icon={<TodoArt />}
        title="To-do"
        value={todos === null ? '…' : `${count} open`}
        line={todos === null ? undefined : top ? `${top.starred ? '★ ' : ''}${top.title}` : 'Alles gedaan!'}
        onOpen={() => navigate('/todo')}
      />
      <form className="quick-add dash-card" onSubmit={add}>
        <label className="quick-add-label" htmlFor="quick-add-input">
          Snel toevoegen
        </label>
        <div className="quick-add-row">
          <input
            id="quick-add-input"
            className="settings-input"
            type="text"
            autoComplete="off"
            maxLength={500}
            placeholder="Nieuwe taak…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="settings-button" type="submit" disabled={!title.trim()}>
            Toevoegen
          </button>
        </div>
        {note && (
          <p className="quick-add-note" role="status">
            {note}
          </p>
        )}
      </form>
    </>
  )
}
