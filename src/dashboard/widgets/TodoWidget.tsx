import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../../components/icons'
import { emit, useAppEvent } from '../../lib/appEvents'
import { store } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { compareTodos, type Todo } from '../../lib/types'
import { WidgetCard, type WidgetProps } from './WidgetCard'

const SHOWN = { klein: 1, middel: 5, groot: 10 } as const
const UNDO_MS = 5000

/** Open taken, live bijgewerkt (realtime, terugkomen in de app, snel toevoegen in de zijbalk). */
function useOpenTodos() {
  const [todos, setTodos] = useState<Todo[] | null>(null)
  const [failed, setFailed] = useState(false)
  const load = useCallback(() => {
    store
      .list()
      .then((list) => {
        setTodos([...list].sort(compareTodos))
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
    const onVisible = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', load)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', load)
    }
  }, [load])
  useAppEvent('todos-changed', load)

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
        .channel(`todos-widget-${uid}`)
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

  return { todos, setTodos, failed, load }
}

const Star = () => (
  <svg className="widget-star" viewBox="0 0 24 24" width="15" height="15" aria-label="favoriet">
    <path d="M12 3.4l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z" fill="currentColor" />
  </svg>
)

/** To-do-tegel: klein = aantal + bovenste taak, middel = 5 taken met vinkje, groot = 10 + toevoegen. */
export function TodoWidget({ size, onOpen }: WidgetProps) {
  const { todos, setTodos, failed, load } = useOpenTodos()
  const [undo, setUndo] = useState<Todo | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const timers = useRef({ undo: 0, note: 0 })
  useEffect(() => () => (window.clearTimeout(timers.current.undo), window.clearTimeout(timers.current.note)), [])

  function flash(text: string) {
    setNote(text)
    window.clearTimeout(timers.current.note)
    timers.current.note = window.setTimeout(() => setNote(null), 3000)
  }

  // Mislukt opslaan (bijv. offline): eerst lokaal terugdraaien, want opnieuw laden lukt dan meestal ook niet.
  const putBack = (todo: Todo) =>
    setTodos((list) => list && [...list.filter((t) => t.id !== todo.id), todo].sort(compareTodos))
  const takeOut = (id: string) => setTodos((list) => list && list.filter((t) => t.id !== id))

  function complete(todo: Todo) {
    setTodos((list) => list && list.filter((t) => t.id !== todo.id))
    setUndo(todo)
    window.clearTimeout(timers.current.undo)
    timers.current.undo = window.setTimeout(() => setUndo(null), UNDO_MS)
    store
      .update(todo.id, { done_at: new Date().toISOString() })
      .then(() => emit('todos-changed'))
      .catch(() => {
        setUndo(null)
        putBack(todo)
        load()
        flash('Opslaan mislukt. Probeer het nog eens.')
      })
  }

  function undoComplete() {
    const todo = undo
    if (!todo) return
    setUndo(null)
    setTodos((list) => list && [...list, todo].sort(compareTodos))
    store
      .update(todo.id, { done_at: null })
      .then(() => emit('todos-changed'))
      .catch(() => {
        takeOut(todo.id)
        load()
        flash('Opslaan mislukt. Probeer het nog eens.')
      })
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const text = title.trim()
    if (!text || !todos) return
    const todo: Todo = {
      id: crypto.randomUUID(),
      title: text,
      position: todos.length ? Math.min(...todos.map((t) => t.position)) - 1 : 0,
      created_at: new Date().toISOString(),
      done_at: null,
      starred: false,
      notes: '',
    }
    setTitle('')
    setTodos([todo, ...todos].sort(compareTodos))
    store
      .create(todo)
      .then(() => emit('todos-changed'))
      .catch(() => {
        takeOut(todo.id)
        setTitle(text)
        load()
        flash('Opslaan mislukt. Probeer het nog eens.')
      })
  }

  const list = todos ?? []
  const count = list.length
  const shown = list.slice(0, SHOWN[size])

  return (
    <WidgetCard title="To-do" icon={<Icon name="todo" size={24} weight="fill" />} size={size} onOpen={onOpen} className="widget-todo">
      {todos === null ? (
        <p className="widget-muted">{failed ? 'Taken konden niet laden' : 'Laden…'}</p>
      ) : size === 'klein' ? (
        <div className="widget-todo-small">
          <span className="widget-big">{count} open</span>
          {shown[0] ? (
            <span className="widget-line">
              {shown[0].starred && <Star />}
              <span className="widget-clip">{shown[0].title}</span>
            </span>
          ) : (
            <span className="widget-muted">Alles gedaan!</span>
          )}
        </div>
      ) : (
        <>
          <p className="widget-count">{count} open</p>
          {shown.length ? (
            <ul className="widget-tasks">
              {shown.map((t) => (
                <li key={t.id}>
                  <button className="widget-check" type="button" aria-label={`"${t.title}" afronden`} onClick={() => complete(t)} />
                  {t.starred && <Star />}
                  <span className="widget-clip">{t.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="widget-muted">Alles gedaan!</p>
          )}
          {size === 'groot' && (
            <form className="widget-add" onSubmit={add}>
              <input
                className="settings-input"
                type="text"
                autoComplete="off"
                maxLength={500}
                placeholder="Nieuwe taak…"
                aria-label="Nieuwe taak"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button className="settings-button" type="submit" disabled={!title.trim()}>
                Toevoegen
              </button>
            </form>
          )}
        </>
      )}
      {undo && (
        <p className="widget-undo" role="status">
          <span className="widget-clip">"{undo.title}" afgerond</span>
          <button className="today-link" type="button" onClick={undoComplete}>
            Ongedaan maken
          </button>
        </p>
      )}
      {note && (
        <p className="widget-muted" role="status">
          {note}
        </p>
      )}
    </WidgetCard>
  )
}
