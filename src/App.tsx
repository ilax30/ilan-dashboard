import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DropAnimation,
  type Modifier,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS, getEventCoordinates } from '@dnd-kit/utilities'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AddTodo } from './components/AddTodo'
import { Blobs, Heart, Sparks, Sprig } from './components/Decor'
import { CalendarDialog } from './components/CalendarDialog'
import { DoneZone } from './components/DoneZone'
import { HistoryDrawer, HistoryPanel } from './components/HistoryDrawer'
import { ImportBanner } from './components/ImportBanner'
import { OldestTask, WeekChart } from './components/Insights'
import { PinLogin } from './components/PinLogin'
import { PinPad } from './components/PinPad'
import { ThemeToggle } from './components/ThemeToggle'
import { TodoCard, TodoCardView } from './components/TodoCard'
import { Toast, type ToastData } from './components/Toast'
import { burst } from './lib/effects'
import { SteadyMouseSensor, SteadyTouchSensor } from './lib/sensors'
import { startOfToday, useNow } from './lib/relativeTime'
import {
  checkPin,
  clearPin,
  consumeUnlockedByLogin,
  failures,
  forgetActive,
  hasPin,
  MAX_TRIES,
  recentlyActive,
  savePin,
  syncPinFromAccount,
  touchActive,
} from './lib/pin'
import { store, usingSupabase } from './lib/store'
import { supabase } from './lib/supabase'
import { useMediaQuery } from './lib/useMediaQuery'
import { usePhoneAutoScroll } from './lib/usePhoneAutoScroll'
import { compareTodos, type Todo, type TodoPatch } from './lib/types'

const DONE = 'done'
const LEAVE_MS = 320
const HISTORY_MS = 72 * 3600 * 1000
const WEEK_MS = 7 * 24 * 3600 * 1000
const WIDE = '(min-width: 1280px)'

const insertSorted = (list: Todo[], todo: Todo) => [...list.filter((t) => t.id !== todo.id), todo].sort(compareTodos)

/** Bij een drop in "Gedaan" telt alleen die zone; anders sorteren we binnen de lijst. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const done = hits.filter((h) => h.id === DONE)
  if (done.length) return done
  return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.id !== DONE) })
}

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.35' } } }),
}

/** In "Gedaan" gedropt: de kaart krimpt en vervaagt ter plekke (de confetti doet de rest). */
const doneDropAnimation: DropAnimation = {
  duration: 280,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
  keyframes: ({ transform: { initial } }) => [
    { transform: CSS.Transform.toString(initial), opacity: 1 },
    { transform: `${CSS.Transform.toString({ ...initial, scaleX: 0.4, scaleY: 0.4 })} rotate(-8deg)`, opacity: 0 },
  ],
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } }),
}

// Tijdens het slepen is de kaart compact, zodat je ziet waar hij heen gaat.
const overlayWidth = () => Math.min(380, window.innerWidth - 48)

/** Houdt de muis binnen de (smallere) sleepkaart, ook als je een brede kaart rechts oppakt. */
const keepGrabInCard: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  const pointer = activatorEvent && getEventCoordinates(activatorEvent)
  if (!pointer || !draggingNodeRect) return transform
  const grabX = pointer.x - draggingNodeRect.left
  const inCard = Math.min(grabX, overlayWidth() - 40)
  return { ...transform, x: transform.x + grabX - inCard }
}

export default function App() {
  return (
    <>
      <ThemeToggle />
      <Gate />
    </>
  )
}

/** Zonder Supabase direct het bord; met Supabase eerst inloggen. */
function Gate() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Board />
  if (session === undefined) return <Blobs />
  if (!session) return <PinLogin />
  return <PinGate uid={session.user.id} onLogout={() => supabase?.auth.signOut()} />
}

const AUTO_LOCK_MS = 10 * 60 * 1000

/**
 * Pincode-slot rond het bord. Ingelogd blijf je via Supabase; de pincode is een snel slot
 * per apparaat. Hij komt pas na 10 minuten niet gebruiken (ook bij openen/refresh), of via "Vergrendelen".
 */
function PinGate({ uid, onLogout }: { uid: string; onLogout: () => void }) {
  const [mode, setMode] = useState<'checking' | 'locked' | 'setup' | 'confirm' | 'open'>('checking')

  // De pincode van je account geldt op elk apparaat (offline: de laatst bekende op dit apparaat).
  useEffect(() => {
    if (mode !== 'checking') return
    syncPinFromAccount(uid)
      .catch(() => hasPin(uid))
      .then((found) => {
        const justLoggedIn = consumeUnlockedByLogin()
        const unlocked = !found || justLoggedIn || recentlyActive(AUTO_LOCK_MS)
        if (unlocked) touchActive()
        setMode(unlocked ? 'open' : 'locked')
      })
  }, [mode, uid])
  const [first, setFirst] = useState('')
  const [error, setError] = useState('')

  // Bijhouden wanneer je de app gebruikt; na 10 minuten niets doen gaat hij op slot.
  useEffect(() => {
    if (mode !== 'open') return
    let last = 0
    const active = () => {
      if (Date.now() - last < 15_000) return
      last = Date.now()
      touchActive()
    }
    const onVis = () => {
      if (document.hidden) return touchActive()
      if (hasPin(uid) && !recentlyActive(AUTO_LOCK_MS)) setMode('locked')
      else active()
    }
    const check = setInterval(() => {
      if (!document.hidden && hasPin(uid) && !recentlyActive(AUTO_LOCK_MS)) setMode('locked')
    }, 30_000)
    window.addEventListener('pointerdown', active, { passive: true })
    window.addEventListener('keydown', active)
    window.addEventListener('scroll', active, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(check)
      window.removeEventListener('pointerdown', active)
      window.removeEventListener('keydown', active)
      window.removeEventListener('scroll', active)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [mode, uid])

  function logout() {
    clearPin(uid)
    onLogout()
  }

  if (mode === 'checking') return <Blobs />

  if (mode === 'locked') {
    return (
      <>
        <Blobs />
        <PinPad
          title="Welkom terug"
          hint="Vul je pincode in."
          error={error}
          onComplete={async (pin) => {
            if (await checkPin(uid, pin)) {
              setError('')
              touchActive()
              setMode('open')
              return true
            }
            const left = MAX_TRIES - failures(uid)
            if (left <= 0) {
              logout()
              return false
            }
            setError(`Onjuiste pincode. Nog ${left} ${left === 1 ? 'poging' : 'pogingen'}.`)
            return false
          }}
          footer={
            <button className="link" type="button" onClick={logout}>
              Pincode vergeten? Log opnieuw in via e-mail
            </button>
          }
        />
      </>
    )
  }

  if (mode === 'setup' || mode === 'confirm') {
    return (
      <>
        <Blobs />
        <PinPad
          title={mode === 'setup' ? 'Nieuwe pincode' : 'Nog een keer'}
          hint={
            mode === 'setup'
              ? 'Kies 4 cijfers. Daarmee log je op al je apparaten in.'
              : 'Vul dezelfde 4 cijfers nog eens in.'
          }
          error={error}
          onComplete={async (pin) => {
            if (mode === 'setup') {
              setFirst(pin)
              setError('')
              setMode('confirm')
              return true
            }
            if (pin !== first) {
              setError('Die codes waren niet hetzelfde. Begin opnieuw.')
              setMode('setup')
              return false
            }
            if (!(await savePin(uid, pin))) {
              setError('Opslaan lukte niet (geen verbinding?). Je oude pincode blijft geldig.')
              setMode('open')
              return false
            }
            setError('')
            setMode('open')
            return true
          }}
          footer={
            <button
              className="link"
              type="button"
              onClick={() => {
                setError('')
                setMode('open')
              }}
            >
              Annuleren
            </button>
          }
        />
      </>
    )
  }

  return (
    <Board
      onLock={
        hasPin(uid)
          ? () => {
              forgetActive()
              setMode('locked')
            }
          : undefined
      }
      onSetPin={() => setMode('setup')}
      onLogout={logout}
    />
  )
}

type BoardProps = { onLock?: () => void; onSetPin?: () => void; onLogout?: () => void }

function Board({ onLock, onSetPin, onLogout }: BoardProps) {
  const [confirmLogout, setConfirmLogout] = useState(false)
  const now = useNow()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loaded, setLoaded] = useState(false)
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  // Ids die nog uitfaden; ongedaan maken haalt ze hieruit zodat de timeout ze niet alsnog weghaalt.
  const leavingRef = useRef(new Set<string>())
  // Taken die in deze sessie zijn toegevoegd krijgen bij het verschijnen een animatie.
  const freshRef = useRef(new Set<string>())
  const [doneToday, setDoneToday] = useState(0)
  const [pop, setPop] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overDone, setOverDone] = useState(false)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  // Afgerond in de laatste 7 dagen (voor de lade én de weekgrafiek). null = nog niet geladen.
  // Wordt bij afronden/terugzetten lokaal bijgewerkt.
  const [history, setHistory] = useState<Todo[] | null>(null)
  const wide = useMediaQuery(WIDE)
  const phone = useMediaQuery('(max-width: 720px)')
  // Touchscreen: slepen gaat via de greep (direct, zonder vasthouden); de rest van de kaart scrollt/veegt.
  const coarse = useMediaQuery('(pointer: coarse)')
  const [dragStartY, setDragStartY] = useState<number | null>(null)
  // Telefoon: eigen scroll-logica tijdens slepen (zie usePhoneAutoScroll), zodat Gedaan bereikbaar blijft.
  usePhoneAutoScroll(phone && activeId !== null, dragStartY, '.done')

  const sensors = useSensors(
    useSensor(SteadyMouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: even vasthouden om te slepen; snel horizontaal bewegen is vegen (zie TodoCard).
    useSensor(SteadyTouchSensor, {
      activationConstraint: coarse ? { distance: 4 } : { delay: 230, tolerance: 8 },
    }),
    // Enter is voor open/dichtklappen van notities; spatie pakt een taak op.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const showToast = useCallback((message: string, undo?: () => void) => {
    setToast({ id: Date.now(), message, undo })
  }, [])
  const closeToast = useCallback(() => setToast(null), [])

  const load = useCallback(async () => {
    try {
      const [list, count, done] = await Promise.all([
        store.list(),
        store.countDoneSince(startOfToday()),
        store.listDoneSince(new Date(Date.now() - WEEK_MS).toISOString()),
      ])
      setTodos(list)
      setDoneToday(count)
      setHistory(done)
    } catch {
      showToast('Laden mislukt. Ververs de pagina even.')
    } finally {
      setLoaded(true)
    }
  }, [showToast])

  useEffect(() => {
    load()
  }, [load])

  // Gesynchroniseerd tussen apparaten: ververs zodra de app weer in beeld komt.
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  /** Optimistisch: UI is al bijgewerkt; bij een fout halen we de echte stand opnieuw op. */
  function persist(p: Promise<unknown>) {
    p.catch(() => {
      showToast('Opslaan mislukt. Probeer het nog eens.')
      load()
    })
  }

  const closeHistory = useCallback(() => setHistoryOpen(false), [])
  const openCalendar = () => {
    setHistoryOpen(false)
    setCalendarOpen(true)
  }

  function restoreFromHistory(todo: Todo) {
    setHistory((h) => h && h.filter((t) => t.id !== todo.id))
    setTodos((list) => insertSorted(list, { ...todo, done_at: null }))
    if (todo.done_at && todo.done_at >= startOfToday()) setDoneToday((n) => Math.max(0, n - 1))
    persist(store.update(todo.id, { done_at: null }))
    showToast('Teruggezet in To do')
  }

  function patch(id: string, changes: TodoPatch) {
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, ...changes } : t)).sort(compareTodos))
    persist(store.update(id, changes))
  }

  function add(title: string) {
    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      // Bovenaan de niet-gesterde taken; sterren blijven erboven.
      position: todos.length ? Math.min(...todos.map((t) => t.position)) - 1 : 0,
      created_at: new Date().toISOString(),
      done_at: null,
      starred: false,
      notes: '',
    }
    freshRef.current.add(todo.id)
    setTodos((list) => [todo, ...list].sort(compareTodos))
    persist(store.create(todo))
  }

  function complete(todo: Todo) {
    // Even laten staan (uitfaden), zodat de drop-animatie zijn kaart nog kan vinden.
    leavingRef.current.add(todo.id)
    setLeaving((s) => new Set(s).add(todo.id))
    setTimeout(() => {
      if (leavingRef.current.delete(todo.id)) setTodos((list) => list.filter((t) => t.id !== todo.id))
      setLeaving((s) => {
        const next = new Set(s)
        next.delete(todo.id)
        return next
      })
    }, LEAVE_MS)
    setDoneToday((n) => n + 1)
    setPop((n) => n + 1)
    const doneAt = new Date().toISOString()
    setHistory((h) => h && [{ ...todo, done_at: doneAt }, ...h])
    persist(store.update(todo.id, { done_at: doneAt }))
    showToast('Afgerond', () => {
      setHistory((h) => h && h.filter((t) => t.id !== todo.id))
      leavingRef.current.delete(todo.id)
      setLeaving((s) => {
        const next = new Set(s)
        next.delete(todo.id)
        return next
      })
      setTodos((list) => insertSorted(list, todo))
      setDoneToday((n) => Math.max(0, n - 1))
      persist(store.update(todo.id, { done_at: null }))
    })
  }

  function remove(todo: Todo) {
    setTodos((list) => list.filter((t) => t.id !== todo.id))
    persist(store.remove(todo.id))
    showToast('Verwijderd', () => {
      setTodos((list) => insertSorted(list, todo))
      persist(store.create(todo))
    })
  }

  function onDragEnd({ active, over, activatorEvent, delta }: DragEndEvent) {
    // overDone pas bij de volgende sleep resetten: de drop-animatie leest hem nog.
    setActiveId(null)
    if (!over) return
    const todo = todos.find((t) => t.id === active.id)
    if (!todo) return
    if (over.id === DONE) {
      const start = getEventCoordinates(activatorEvent)
      if (start) burst(start.x + delta.x, start.y + delta.y)
      return complete(todo)
    }
    if (over.id === active.id) return

    const from = todos.findIndex((t) => t.id === active.id)
    const to = todos.findIndex((t) => t.id === over.id)
    const moved = arrayMove(todos, from, to)
    const prev = moved[to - 1]
    const next = moved[to + 1]
    const position =
      prev && next ? (prev.position + next.position) / 2 : prev ? prev.position + 1 : next ? next.position - 1 : 0
    moved[to] = { ...todo, position }
    // Over de grens tussen sterren en de rest slepen? Dan schuift hij terug naar zijn eigen groep.
    setTodos(moved.sort(compareTodos))
    persist(store.update(todo.id, { position }))
  }

  const since72 = new Date(now - HISTORY_MS).toISOString()
  const recent72 = history && history.filter((t) => t.done_at! >= since72)
  const active = activeId ? todos.find((t) => t.id === activeId) : undefined
  const titleOf = (id: string | number) => todos.find((t) => t.id === id)?.title ?? 'taak'
  const announcements: Announcements = {
    onDragStart: ({ active }) => `"${titleOf(active.id)}" opgepakt.`,
    onDragOver: ({ active, over }) =>
      over ? `"${titleOf(active.id)}" boven ${over.id === DONE ? 'Gedaan' : `"${titleOf(over.id)}"`}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over?.id === DONE ? `"${titleOf(active.id)}" afgerond.` : `"${titleOf(active.id)}" neergezet.`,
    onDragCancel: ({ active }) => `Slepen van "${titleOf(active.id)}" geannuleerd.`,
  }

  return (
    <>
      <Blobs />
      {!wide && (
        <button className="history-button" type="button" onClick={() => setHistoryOpen(true)} aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M3 4.5v4h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="history-label">Afgerond</span>
        </button>
      )}
      <div className="app">
        <header className="header">
          <h1 className="title">
            <Sparks className="spark spark-l" />
            Ilan's To-Do lijst
            <Sparks className="spark spark-r" />
          </h1>
          <Sprig className="sprig" />
          <AddTodo onAdd={add} />
        </header>

        {usingSupabase && <ImportBanner onImported={load} />}

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                'Spatie pakt de taak op; pijltjes verplaatsen, spatie laat los, Escape annuleert. Enter klapt notities open, X rondt de taak af.',
            },
          }}
          autoScroll={!phone}
          onDragStart={({ active, activatorEvent }) => {
            setDragStartY(getEventCoordinates(activatorEvent)?.y ?? null)
            setActiveId(String(active.id))
            setOverDone(false)
          }}
          onDragOver={({ over }) => setOverDone(over?.id === DONE)}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveId(null)
            setOverDone(false)
          }}
        >
          <main className="board">
            {wide && <HistoryPanel items={recent72} now={now} onRestore={restoreFromHistory} />}

            <section className="todo-col" aria-labelledby="todo-heading">
              <h2 className="col-title" id="todo-heading">
                To do {todos.length > 0 && <span className="badge">{todos.length}</span>}
              </h2>
              {todos.length > 0 && (
                <p className="swipe-hint">Sleep aan ⋮⋮ om te verplaatsen of naar Gedaan te brengen. Veeg → om af te ronden, ← om te verwijderen.</p>
              )}

              {loaded && todos.length === 0 ? (
                <div className="empty">
                  <Heart className="empty-heart" size={34} />
                  <p className="empty-title">Niks te doen</p>
                  <p className="empty-text">Lekker bezig. Typ hierboven iets nieuws.</p>
                </div>
              ) : (
                <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="list">
                    {todos.map((todo) => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        now={now}
                        leaving={leaving.has(todo.id)}
                        fresh={freshRef.current.has(todo.id)}
                        onComplete={complete}
                        onRename={(t, title) => patch(t.id, { title })}
                        onSaveNotes={(t, notes) => patch(t.id, { notes })}
                        onToggleStar={(t) => patch(t.id, { starred: !t.starred })}
                        onDelete={remove}
                      />
                    ))}
                  </ul>
                </SortableContext>
              )}
            </section>

            <div className="side">
              <DoneZone doneToday={doneToday} pop={pop} dragging={activeId !== null} />
              {wide && history && <WeekChart done={history} now={now} onOpenCalendar={openCalendar} />}
              {wide && <OldestTask todos={todos} now={now} />}
            </div>
          </main>

          <DragOverlay
            dropAnimation={overDone ? doneDropAnimation : dropAnimation}
            className={overDone ? 'drag-over-done' : undefined}
            modifiers={[keepGrabInCard]}
            style={{ width: overlayWidth(), height: 'auto' }}
          >
            {active ? <TodoCardView todo={active} now={now} overlay showGrip={coarse} /> : null}
          </DragOverlay>
        </DndContext>

        {onLogout && (
          <footer className="footer">
            {/* Uitloggen is zelden nodig: weggestopt, zodat je er niet per ongeluk op drukt. */}
            <details className="footer-more">
              <summary>Meer…</summary>
              <div className="footer-more-items">
                {onLock && (
                  <button className="link" type="button" onClick={onLock}>
                    Vergrendelen
                  </button>
                )}
                <button className="link" type="button" onClick={onSetPin}>
                  Pincode wijzigen
                </button>
                <button
                  className="link"
                  type="button"
                  onClick={() => {
                    if (confirmLogout) return onLogout()
                    setConfirmLogout(true)
                    setTimeout(() => setConfirmLogout(false), 4000)
                  }}
                >
                  {confirmLogout ? 'Zeker? Daarna moet je weer via e-mail inloggen. Klik nogmaals' : 'Uitloggen'}
                </button>
              </div>
            </details>
          </footer>
        )}
      </div>

      {!wide && (
        <HistoryDrawer
          open={historyOpen}
          items={recent72}
          now={now}
          onClose={closeHistory}
          onOpenCalendar={openCalendar}
          onRestore={restoreFromHistory}
        />
      )}

      <CalendarDialog open={calendarOpen} now={now} onClose={() => setCalendarOpen(false)} />

      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}
