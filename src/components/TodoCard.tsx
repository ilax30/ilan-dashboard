import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  type SyntheticEvent,
} from 'react'
import { burstAt } from '../lib/effects'
import { useMediaQuery } from '../lib/useMediaQuery'
import { fullDate, sinceLabel } from '../lib/relativeTime'
import type { Todo } from '../lib/types'
import { LinkifiedText } from './LinkifiedText'

const stop = (e: SyntheticEvent) => e.stopPropagation()
const TEAR_MS = 650
// Vegen (touch): vanaf deze fractie van de kaartbreedte telt het als "doen".
const SWIPE_COMMIT = 0.32
const buzz = (ms: number) => navigator.vibrate?.(ms)
// Voorkomt dat klikken/selecteren in een veld een sleepactie start.
const noDrag = { onMouseDown: stop, onTouchStart: stop, onPointerDown: stop }

/** Laat de glans op de kaart de muis volgen (alleen op apparaten met een echte muis). */
function trackGlare(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== 'mouse') return
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}

type ViewProps = {
  todo: Todo
  now: number
  overlay?: boolean
  /** Niet-interactieve kopie (voor de scheur-animatie). */
  ghost?: boolean
  editing?: boolean
  expanded?: boolean
  shine?: number
  starRef?: Ref<HTMLButtonElement>
  /** Greep om te slepen (touchscreens). */
  grip?: { ref: (el: HTMLElement | null) => void; listeners: Record<string, unknown> | undefined }
  showGrip?: boolean
  onStartEdit?: () => void
  onStopEdit?: (title: string | null) => void
  onSaveNotes?: (notes: string) => void
  /** Kaart inklappen (knop "Klaar" op touchscreens). */
  onCollapse?: () => void
  onToggleStar?: () => void
  onDelete?: () => void
}

/** Puur visuele kaart; ook gebruikt (compact) in de DragOverlay. */
export function TodoCardView({
  todo,
  now,
  overlay,
  ghost,
  editing,
  expanded,
  shine = 0,
  starRef,
  grip,
  showGrip,
  onStartEdit,
  onStopEdit,
  onSaveNotes,
  onCollapse,
  onToggleStar,
  onDelete,
}: ViewProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation()
    // Enter slaat direct op (niet via blur: dat event komt niet altijd, bijv. als het venster geen focus heeft).
    if (e.key === 'Enter') onStopEdit?.(e.currentTarget.value)
    if (e.key === 'Escape') onStopEdit?.(null)
  }

  const firstLine = todo.notes.split('\n').find((l) => l.trim()) ?? ''
  const still = overlay || ghost

  return (
    <div
      className={overlay ? 'card card-overlay' : 'card'}
      data-starred={todo.starred || undefined}
      data-expanded={expanded || undefined}
      onPointerMove={still ? undefined : trackGlare}
    >
      {shine > 0 && <span className="card-shine" key={shine} aria-hidden="true" />}

      <div className="card-row">
        <button
          ref={starRef}
          className="fav"
          type="button"
          aria-label={todo.starred ? `"${todo.title}" is favoriet, ster weghalen` : `"${todo.title}" favoriet maken`}
          aria-pressed={todo.starred}
          onClick={onToggleStar}
          onKeyDown={stop}
          tabIndex={still ? -1 : 0}
        >
          <svg key={todo.starred ? 'on' : 'off'} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M12 3.4l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z"
              fill={todo.starred ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="card-main">
          {editing ? (
            <input
              ref={inputRef}
              className="card-edit"
              defaultValue={todo.title}
              maxLength={500}
              aria-label="Taak bewerken"
              onKeyDown={onKey}
              onBlur={(e) => onStopEdit?.(e.currentTarget.value)}
              {...noDrag}
            />
          ) : (
            <span className="card-title">
              <LinkifiedText text={todo.title} interactive={!still} />
            </span>
          )}
          {!expanded && !overlay && firstLine && (
            <span className="card-preview">
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <path d="M5 7h14M5 12h14M5 17h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <span className="card-preview-text">
                <LinkifiedText text={firstLine} />
              </span>
            </span>
          )}
        </div>

        <time className="card-age" dateTime={todo.created_at} title={`Toegevoegd op ${fullDate(todo.created_at)}`}>
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M12 7.5V12l2.8 1.8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          {sinceLabel(todo.created_at, now)}
        </time>

        {!still && !editing && (
          <button className="edit" type="button" aria-label={`"${todo.title}" bewerken`} onClick={onStartEdit} onKeyDown={stop}>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M14.5 5.5l4 4M4 20l1-5L15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {!still && (
          <button className="delete" type="button" aria-label={`"${todo.title}" verwijderen`} onClick={onDelete} onKeyDown={stop}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {showGrip && (
          <span
            ref={grip?.ref}
            className="grip"
            aria-hidden="true"
            {...(grip?.listeners as object | undefined)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <g fill="currentColor">
                <circle cx="9" cy="6" r="1.7" />
                <circle cx="15" cy="6" r="1.7" />
                <circle cx="9" cy="12" r="1.7" />
                <circle cx="15" cy="12" r="1.7" />
                <circle cx="9" cy="18" r="1.7" />
                <circle cx="15" cy="18" r="1.7" />
              </g>
            </svg>
          </span>
        )}
      </div>

      {expanded && !still && (
        <div className="card-expanded">
          <Notes notes={todo.notes} onSave={(n) => onSaveNotes?.(n)} onDone={onCollapse} onEditTitle={onStartEdit} />
        </div>
      )}
    </div>
  )
}

type NotesProps = {
  notes: string
  onSave: (notes: string) => void
  onDone?: () => void
  onEditTitle?: () => void
}

/** Notitieveld: leest als tekst met klikbare links, klik om te bewerken. */
function Notes({ notes, onSave, onDone, onEditTitle }: NotesProps) {
  const [writing, setWriting] = useState(notes === '')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!writing) return
    const el = areaRef.current
    el?.focus()
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [writing])

  function save(value: string) {
    const next = value.replace(/\s+$/, '')
    if (next !== notes) onSave(next)
    if (next) setWriting(false)
  }

  /** "Klaar": opslaan (niet wachten op blur, dat komt niet altijd) en inklappen. */
  function done() {
    if (writing && areaRef.current) save(areaRef.current.value)
    onDone?.()
  }

  return (
    <>
    <div className="card-notes" {...noDrag} onClick={stop} onKeyDown={stop}>
      {writing ? (
        <textarea
          ref={areaRef}
          className="notes-input"
          defaultValue={notes}
          placeholder="Notities, links, details…"
          aria-label="Notities"
          maxLength={5000}
          rows={3}
          onBlur={(e) => save(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
        />
      ) : (
        <div
          className="notes-text"
          role="button"
          tabIndex={0}
          aria-label="Notities bewerken"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('a')) setWriting(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target === e.currentTarget) setWriting(true)
          }}
        >
          <LinkifiedText text={notes} />
        </div>
      )}
    </div>
    {/* Touchscreens: duidelijke knoppen i.p.v. ernaast tikken (zie CSS: alleen bij pointer: coarse). */}
    <div className="notes-actions" {...noDrag} onClick={stop} onKeyDown={stop}>
      <button className="notes-title-edit" type="button" onClick={onEditTitle}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path
            d="M14.5 5.5l4 4M4 20l1-5L15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Titel aanpassen
      </button>
      <button
        className="notes-done"
        type="button"
        // Voorkom dat het tekstvak eerst focus verliest en de knop verspringt voordat de tik telt.
        onPointerDown={(e) => e.preventDefault()}
        onClick={done}
      >
        Klaar
      </button>
    </div>
    </>
  )
}

type Props = {
  todo: Todo
  now: number
  leaving?: boolean
  /** Net toegevoegd: speel de "kaart delen"-animatie. */
  fresh?: boolean
  onComplete: (todo: Todo) => void
  onRename: (todo: Todo, title: string) => void
  onSaveNotes: (todo: Todo, notes: string) => void
  onToggleStar: (todo: Todo) => void
  onDelete: (todo: Todo) => void
}

export function TodoCard({ todo, now, leaving, fresh, onComplete, onRename, onSaveNotes, onToggleStar, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [shine, setShine] = useState(fresh ? 1 : 0)
  const [tearing, setTearing] = useState(false)
  const starRef = useRef<HTMLButtonElement>(null)
  const itemRef = useRef<HTMLLIElement | null>(null)
  const sparkle = useRef(false)
  // Veeg-status buiten React om, zodat de kaart soepel met je vinger meebeweegt.
  const swipe = useRef<{ x: number; y: number; t: number; mode: 'idle' | 'swipe' | 'scroll'; armed: boolean; dx: number } | null>(null)
  const justSwiped = useRef(false)
  const coarse = useMediaQuery('(pointer: coarse)')
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: editing || leaving || tearing,
  })

  // Na een ster schuift de kaart naar boven; vonkjes pas tonen op de nieuwe plek.
  useLayoutEffect(() => {
    if (!sparkle.current || !todo.starred) return
    sparkle.current = false
    burstAt(starRef.current, 'star')
  }, [todo.starred])

  function toggleStar() {
    if (!todo.starred) {
      sparkle.current = true
      setShine((n) => n + 1)
    }
    onToggleStar(todo)
  }

  /** Kruisje: de kaart scheurt in twee stukken die wegvallen, daarna pas echt verwijderen. */
  function tear() {
    if (tearing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onDelete(todo)
    setExpanded(false)
    setTearing(true)
    setTimeout(() => onDelete(todo), TEAR_MS)
  }

  function complete() {
    burstAt(itemRef.current, 'done')
    onComplete(todo)
  }

  const cardEl = () => itemRef.current?.querySelector<HTMLElement>('.card') ?? null

  function setSwipeVisual(dx: number, width: number) {
    const li = itemRef.current
    const card = cardEl()
    if (!li || !card) return
    // Weerstand voorbij ~60% van de breedte.
    const limit = width * 0.6
    const eased = Math.abs(dx) > limit ? Math.sign(dx) * (limit + (Math.abs(dx) - limit) * 0.25) : dx
    card.style.transition = 'none'
    card.style.transform = `translateX(${eased}px) rotate(${eased / 60}deg)`
    li.dataset.swipe = dx > 0 ? 'right' : dx < 0 ? 'left' : ''
    li.style.setProperty('--swipe-p', String(Math.min(1, Math.abs(dx) / (width * SWIPE_COMMIT))))
  }

  function resetSwipe(animate = true) {
    const li = itemRef.current
    const card = cardEl()
    if (card) {
      card.style.transition = animate ? 'transform 320ms cubic-bezier(0.23, 1, 0.32, 1)' : ''
      card.style.transform = ''
    }
    if (li) {
      delete li.dataset.swipe
      delete li.dataset.armed
      li.style.removeProperty('--swipe-p')
    }
  }

  function onSwipeStart(e: PointerEvent<HTMLLIElement>) {
    if (e.pointerType !== 'touch' || editing || tearing || leaving) return
    if ((e.target as HTMLElement).closest('button, a, input, textarea, .card-notes, .grip')) return
    swipe.current = { x: e.clientX, y: e.clientY, t: performance.now(), mode: 'idle', armed: false, dx: 0 }
  }

  function onSwipeMove(e: PointerEvent<HTMLLIElement>) {
    const st = swipe.current
    if (!st || e.pointerType !== 'touch') return
    if (isDragging) {
      swipe.current = null
      return resetSwipe()
    }
    const dx = e.clientX - st.x
    const dy = e.clientY - st.y
    if (st.mode === 'idle') {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        st.mode = 'swipe'
        e.currentTarget.setPointerCapture(e.pointerId)
      } else if (Math.abs(dy) > 10) {
        st.mode = 'scroll'
      }
    }
    if (st.mode !== 'swipe') return
    st.dx = dx
    const width = e.currentTarget.getBoundingClientRect().width
    setSwipeVisual(dx, width)
    const armed = Math.abs(dx) > width * SWIPE_COMMIT
    if (armed !== st.armed) {
      st.armed = armed
      if (armed) {
        e.currentTarget.dataset.armed = ''
        buzz(10)
      } else {
        delete e.currentTarget.dataset.armed
      }
    }
  }

  function onSwipeEnd(e: PointerEvent<HTMLLIElement>) {
    const st = swipe.current
    swipe.current = null
    if (!st || st.mode !== 'swipe') return
    justSwiped.current = true
    setTimeout(() => (justSwiped.current = false), 50)
    const width = e.currentTarget.getBoundingClientRect().width
    const velocity = st.dx / Math.max(1, performance.now() - st.t)
    const commit = e.type !== 'pointercancel' && (st.armed || (Math.abs(velocity) > 0.6 && Math.abs(st.dx) > 40))
    if (!commit) return resetSwipe()

    buzz(18)
    if (st.dx > 0) {
      // Afronden: kaart vliegt naar rechts weg, confetti, dan uit de lijst.
      const card = cardEl()
      if (card) {
        card.style.transition = 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 260ms ease'
        card.style.transform = `translateX(${width * 1.1}px) rotate(8deg)`
        card.style.opacity = '0'
      }
      complete()
    } else {
      resetSwipe(false)
      tear()
    }
  }

  // Klik op de kaart zelf (niet op knoppen, links of velden) klapt de notities open/dicht.
  function onClick(e: MouseEvent) {
    if (tearing || justSwiped.current) return
    if ((e.target as HTMLElement).closest('button, a, input, textarea, [role="button"]:not(li)')) return
    setExpanded((x) => !x)
  }

  function onKeyDown(e: KeyboardEvent<HTMLLIElement>) {
    if (e.target === e.currentTarget && !isDragging) {
      if (e.key === 'Enter') {
        e.preventDefault()
        setExpanded((x) => !x)
        return
      }
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        complete()
        return
      }
    }
    listeners?.onKeyDown?.(e)
  }

  // Muis: hele kaart sleepbaar. Touch: alleen via de greep (anders breekt scrollen het slepen af).
  return (
    <li
      ref={(node) => {
        setNodeRef(node)
        itemRef.current = node
      }}
      className="item"
      data-dragging={isDragging || undefined}
      data-leaving={leaving || undefined}
      data-tearing={tearing || undefined}
      data-fresh={fresh || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...(coarse ? {} : listeners)}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onPointerDown={onSwipeStart}
      onPointerMove={onSwipeMove}
      onPointerUp={onSwipeEnd}
      onPointerCancel={onSwipeEnd}
      aria-expanded={expanded}
      aria-roledescription="sleepbare taak"
      aria-label={`${todo.starred ? 'Favoriet: ' : ''}${todo.title}, toegevoegd ${sinceLabel(todo.created_at, now)} geleden${todo.notes ? ', heeft notities' : ''}`}
      aria-keyshortcuts="Enter X"
    >
      {!tearing && (
        <>
          <span className="swipe-bg swipe-done" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Afronden
          </span>
          <span className="swipe-bg swipe-delete" aria-hidden="true">
            Verwijderen
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {tearing ? (
        <div className="tear" aria-hidden="true">
          <div className="tear-piece tear-left">
            <TodoCardView todo={todo} now={now} ghost />
          </div>
          <div className="tear-piece tear-right">
            <TodoCardView todo={todo} now={now} ghost />
          </div>
          <svg className="tear-crack" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="52,0 48,18 55,36 46,55 54,74 49,100" />
          </svg>
        </div>
      ) : (
        <TodoCardView
          todo={todo}
          now={now}
          editing={editing}
          expanded={expanded}
          shine={shine}
          starRef={starRef}
          showGrip={coarse}
          grip={{ ref: setActivatorNodeRef, listeners: coarse ? listeners : undefined }}
          onStartEdit={() => setEditing(true)}
          onStopEdit={(title) => {
            setEditing(false)
            const next = title?.trim()
            if (next && next !== todo.title) onRename(todo, next)
          }}
          onSaveNotes={(notes) => onSaveNotes(todo, notes)}
          onCollapse={() => setExpanded(false)}
          onToggleStar={toggleStar}
          onDelete={tear}
        />
      )}
    </li>
  )
}
