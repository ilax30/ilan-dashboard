import { ArrowLeft, ListChecks, MagnifyingGlass, NotePencil, Plus, PushPin, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LinkifiedText } from '../components/LinkifiedText'
import { isEmptyNote, noteTitle, notesStore, parseChecklist, remoteUpdate, searchNotes, sortNotes, toggleLine, type Note } from '../lib/notes'
import { notesChanged, useNotes } from '../lib/useNotes'

const SAVE_MS = 600
const UNDO_MS = 5000
export const NEW_NOTE_FLAG = 'notes.new'
/** Onopgeslagen tekst bij weggaan (bijv. offline): komt terug bij het volgende bezoek. */
const CONCEPT_KEY = 'notities.concept'

function writeConcept(d: Draft | null) {
  try {
    if (d) localStorage.setItem(CONCEPT_KEY, JSON.stringify(d))
    else localStorage.removeItem(CONCEPT_KEY)
  } catch {
    // opslag vol of geblokkeerd
  }
}

function readConcept(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(CONCEPT_KEY) ?? 'null') as Draft | null
    return d && typeof d.id === 'string' && typeof d.body === 'string' ? { ...d, dirty: true } : null
  } catch {
    return null
  }
}

const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

function when(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (d >= today) return timeFmt.format(d)
  if (d >= new Date(today.getTime() - 86_400_000)) return 'Gisteren'
  return dateFmt.format(d).replace('.', '')
}

/** Eerste tekstregel die niet de titel is (voor de lijst). */
function preview(note: Pick<Note, 'title' | 'body'>) {
  const lines = note.body.split('\n').map((l) => l.trim()).filter(Boolean)
  const title = noteTitle(note)
  const line = lines.find((l) => (parseChecklist(l)?.text.trim() || l) !== title)
  return line ? parseChecklist(line)?.text ?? line : ''
}

type Draft = { id: string; title: string; body: string; pinned: boolean; created_at: string; isNew: boolean; dirty: boolean }

const toDraft = (n: Note): Draft => ({ ...n, isNew: false, dirty: false })

/** Notities (#/notities): links de lijst met zoeken, rechts de notitie (automatisch opslaan). */
export function NotesPage() {
  const { notes, setNotes, failed, load } = useNotes()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editing, setEditing] = useState(false)
  /** Alleen op telefoon: lijst of notitie tonen (op een groot scherm staan ze naast elkaar). */
  const [showEditor, setShowEditor] = useState(false)
  const [undo, setUndo] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef(0)
  const undoTimer = useRef(0)
  /** Was de verwijderde notitie de open notitie? Dan opent "Ongedaan maken" hem weer. */
  const undoWasOpen = useRef(false)
  const draftRef = useRef<Draft | null>(null)
  draftRef.current = draft
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Concept opslaan: altijd de hele notitie (aanmaken of overschrijven), zodat een mislukte eerste keer
   * of een notitie die elders verwijderd is niet stil verloren gaat. Geeft terug of het gelukt is.
   */
  const save = useCallback(async (d: Draft): Promise<boolean> => {
    window.clearTimeout(saveTimer.current)
    if (!d.dirty) return true
    if (d.isNew && isEmptyNote(d)) {
      writeConcept(null)
      return true
    }
    const now = new Date().toISOString()
    const saved: Note = { id: d.id, title: d.title, body: d.body, pinned: d.pinned, created_at: d.created_at, updated_at: now }
    setDraft((cur) => (cur && cur.id === d.id ? { ...cur, isNew: false, dirty: false } : cur))
    setNotes((list) => list && sortNotes([saved, ...list.filter((n) => n.id !== d.id)]))
    try {
      await notesStore.save(saved)
      setError(null)
      writeConcept(null)
      notesChanged()
      return true
    } catch {
      setDraft((cur) => (cur && cur.id === d.id ? { ...cur, isNew: d.isNew, dirty: true } : cur))
      writeConcept(d)
      setError('Opslaan mislukt. Je tekst staat er nog; ik probeer het opnieuw bij de volgende wijziging.')
      return false
    }
  }, [setNotes])

  /** Bij weggaan van een notitie: opslaan, of weggooien als hij leeg is. False = opslaan mislukt, blijf hier. */
  const leave = useCallback(async (): Promise<boolean> => {
    const d = draftRef.current
    if (!d) return true
    if (isEmptyNote(d)) {
      if (!d.isNew) {
        setNotes((list) => list && list.filter((n) => n.id !== d.id))
        await notesStore.remove(d.id).catch(() => load())
        notesChanged()
      }
      return true
    }
    return save(d)
  }, [save, setNotes, load])

  function update(patch: Partial<Pick<Draft, 'title' | 'body'>>) {
    setDraft((cur) => {
      if (!cur) return cur
      const next = { ...cur, ...patch, dirty: true }
      window.clearTimeout(saveTimer.current)
      // Opslaan wat er dán staat (niet wat er stond bij het tikken): tussendoor vastpinnen telt zo mee.
      saveTimer.current = window.setTimeout(() => {
        const latest = draftRef.current
        void save(latest && latest.id === next.id ? latest : next)
      }, SAVE_MS)
      return next
    })
  }

  async function select(note: Note) {
    if (draft?.id === note.id) return setShowEditor(true)
    if (!(await leave())) return
    setDraft(toDraft(note))
    setEditing(false)
    setShowEditor(true)
  }

  /** Telefoon: terug naar de lijst (eerst opslaan; een lege nieuwe notitie verdwijnt). */
  async function closeEditor() {
    const d = draftRef.current
    if (!(await leave())) return
    if (d?.isNew && isEmptyNote(d)) setDraft(null)
    setShowEditor(false)
  }

  async function createNote() {
    if (!(await leave())) return
    const now = new Date().toISOString()
    setDraft({ id: crypto.randomUUID(), title: '', body: '', pinned: false, created_at: now, isNew: true, dirty: false })
    setShowEditor(true)
    setEditing(true)
    setQuery('')
    window.setTimeout(() => titleRef.current?.focus(), 0)
  }

  async function togglePin() {
    const d = draftRef.current
    if (!d) return
    const pinned = !d.pinned
    setDraft({ ...d, pinned })
    if (d.isNew) return
    setNotes((list) => list && sortNotes(list.map((n) => (n.id === d.id ? { ...n, pinned } : n))))
    await notesStore.update(d.id, { pinned, updated_at: new Date().toISOString() }).catch(() => load())
    notesChanged()
  }

  async function remove() {
    const d = draftRef.current
    if (!d) return
    window.clearTimeout(saveTimer.current)
    setDraft(null)
    setShowEditor(false)
    if (d.isNew) return
    const removed = notes?.find((n) => n.id === d.id) ?? { ...d, updated_at: new Date().toISOString() }
    setNotes((list) => list && list.filter((n) => n.id !== d.id))
    undoWasOpen.current = true
    setUndo({ id: d.id, title: d.title, body: d.body, pinned: d.pinned, created_at: d.created_at, updated_at: removed.updated_at })
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
    await notesStore.remove(d.id).catch(() => {
      setError('Verwijderen mislukt.')
      load()
    })
    notesChanged()
  }

  /** Prullenbakje in de lijst: de open notitie via remove(), een andere direct (ook met ongedaan maken). */
  async function removeFromList(n: Note) {
    if (draftRef.current?.id === n.id) return remove()
    setNotes((list) => list && list.filter((x) => x.id !== n.id))
    undoWasOpen.current = false
    setUndo(n)
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
    await notesStore.remove(n.id).catch(() => {
      setError('Verwijderen mislukt.')
      load()
    })
    notesChanged()
  }

  async function undoRemove() {
    const n = undo
    if (!n) return
    setUndo(null)
    setNotes((list) => list && sortNotes([n, ...list]))
    // Alleen openen als er niets open staat (verwijderd vanuit de lijst terwijl je een andere notitie had open).
    setDraft((cur) => (undoWasOpen.current ? toDraft(n) : cur ?? toDraft(n)))
    if (undoWasOpen.current) setShowEditor(true)
    await notesStore.create(n).catch(() => load())
    notesChanged()
  }

  function toggleCheck(index: number) {
    const d = draftRef.current
    if (!d) return
    const body = toggleLine(d.body, index)
    const next = { ...d, body, dirty: true }
    setDraft(next)
    void save(next)
  }

  function addChecklist() {
    const d = draftRef.current
    if (!d) return
    const el = bodyRef.current
    const at = editing && el ? el.selectionStart : d.body.length
    const before = d.body.slice(0, at)
    const insert = `${before && !before.endsWith('\n') ? '\n' : ''}[ ] `
    update({ body: before + insert + d.body.slice(at) })
    setEditing(true)
    window.setTimeout(() => {
      const t = bodyRef.current
      if (t) {
        t.focus()
        t.setSelectionRange(at + insert.length, at + insert.length)
      }
    }, 0)
  }

  // Openen vanaf de tegel met "Nieuwe notitie"; anders de bovenste notitie tonen.
  useEffect(() => {
    if (notes === null || draftRef.current) return
    let wantsNew = false
    try {
      wantsNew = sessionStorage.getItem(NEW_NOTE_FLAG) === '1'
      sessionStorage.removeItem(NEW_NOTE_FLAG)
    } catch {
      // geen sessie-opslag
    }
    const concept = readConcept()
    if (concept) {
      // Tekst die vorige keer niet opgeslagen kon worden: terugzetten en opnieuw proberen.
      setDraft(concept)
      setShowEditor(true)
      void save(concept)
    } else if (wantsNew) void createNote()
    else if (notes[0]) setDraft(toDraft(notes[0]))
  }, [notes])

  // Open notitie elders (ander apparaat) gewijzigd of verwijderd en hier niets onopgeslagen: bijwerken.
  useEffect(() => {
    const d = draftRef.current
    if (!notes || !d) return
    const remote = remoteUpdate(d, notes)
    if (remote === 'gone') setDraft(null)
    else if (remote) setDraft(toDraft(remote))
  }, [notes])

  // Bij weggaan van de pagina of het sluiten van het tabblad het concept bewaren.
  useEffect(() => {
    const flush = () => {
      const d = draftRef.current
      if (!d?.dirty) return
      writeConcept(d)
      void save(d)
    }
    const onHidden = () => {
      if (document.hidden) flush()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', flush)
      if (draftRef.current?.dirty) writeConcept(draftRef.current)
      void leave()
    }
  }, [leave, save])
  useEffect(() => () => window.clearTimeout(undoTimer.current), [])

  const shown = searchNotes(notes ?? [], query)

  return (
    <main className="notes-page" data-phone-view={showEditor && draft ? 'editor' : 'list'}>
      <aside className="notes-side dash-card" aria-label="Notities">
        <div className="notes-side-head">
          <h1 className="notes-heading">Notities</h1>
          <button className="settings-button notes-new" type="button" onClick={() => void createNote()}>
            <Plus size={16} weight="bold" /> Nieuw
          </button>
        </div>
        <label className="notes-search">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input type="search" placeholder="Zoeken" aria-label="Notities zoeken" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <ul className="notes-list">
          {notes === null && <li className="widget-muted">{failed ? 'Notities konden niet laden.' : 'Laden…'}</li>}
          {notes !== null && shown.length === 0 && <li className="widget-muted">{query ? 'Niets gevonden.' : 'Nog geen notities.'}</li>}
          {draft?.isNew && (
            <li>
              <button className="notes-item" type="button" data-active>
                <span className="notes-item-title">{noteTitle(draft)}</span>
                <span className="notes-item-meta">Nu</span>
              </button>
            </li>
          )}
          {shown.map((n) => {
            const view = draft?.id === n.id ? { ...n, title: draft.title, body: draft.body, pinned: draft.pinned } : n
            return (
              <li key={n.id}>
                <button className="notes-item" type="button" data-active={draft?.id === n.id || undefined} onClick={() => void select(n)}>
                  <span className="notes-item-title">
                    {view.pinned && <PushPin size={13} weight="fill" className="notes-pin" aria-label="vastgepind" />}
                    {noteTitle(view)}
                  </span>
                  <span className="notes-item-meta">
                    {when(n.updated_at)} <span className="notes-item-preview">{preview(view)}</span>
                  </span>
                </button>
                <button
                  className="notes-item-delete"
                  type="button"
                  title="Verwijderen"
                  aria-label={`"${noteTitle(view)}" verwijderen`}
                  onClick={() => void removeFromList(n)}
                >
                  <Trash size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="notes-main dash-card" aria-label="Notitie">
        {draft ? (
          <>
            <div className="notes-toolbar">
              <button className="icon-button notes-back" type="button" aria-label="Terug naar notities" onClick={() => void closeEditor()}>
                <ArrowLeft size={18} />
              </button>
              <span className="notes-saved">{draft.dirty ? 'Opslaan…' : draft.isNew ? 'Nieuw' : `Bewaard · ${when(notes?.find((n) => n.id === draft.id)?.updated_at ?? draft.created_at)}`}</span>
              <button className="icon-button" type="button" title="Lijstje met vinkjes" aria-label="Lijstje met vinkjes toevoegen" onClick={addChecklist}>
                <ListChecks size={18} />
              </button>
              <button className="icon-button" type="button" title={draft.pinned ? 'Losmaken' : 'Vastpinnen'} aria-pressed={draft.pinned} aria-label="Vastpinnen" onClick={() => void togglePin()}>
                <PushPin size={18} weight={draft.pinned ? 'fill' : 'regular'} />
              </button>
            </div>
            <input
              ref={titleRef}
              className="notes-title-input"
              placeholder="Titel"
              aria-label="Titel"
              value={draft.title}
              maxLength={300}
              onChange={(e) => update({ title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  setEditing(true)
                  window.setTimeout(() => bodyRef.current?.focus(), 0)
                }
              }}
            />
            {editing ? (
              <textarea
                ref={bodyRef}
                className="notes-body-input"
                placeholder="Begin met typen… (een regel met [ ] wordt een vinkje)"
                aria-label="Tekst"
                value={draft.body}
                maxLength={100000}
                onChange={(e) => update({ body: e.target.value })}
                onBlur={() => {
                  setEditing(false)
                  const d = draftRef.current
                  if (d) void save(d)
                }}
              />
            ) : (
              <div
                className="notes-body"
                role="button"
                tabIndex={0}
                aria-label="Tekst bewerken"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a, input, label')) return
                  setEditing(true)
                  window.setTimeout(() => bodyRef.current?.focus(), 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) {
                    e.preventDefault()
                    setEditing(true)
                    window.setTimeout(() => bodyRef.current?.focus(), 0)
                  }
                }}
              >
                {draft.body.trim() ? (
                  draft.body.split('\n').map((line, i) => {
                    const check = parseChecklist(line)
                    if (check)
                      return (
                        <label key={i} className="notes-check" data-checked={check.checked || undefined}>
                          <input type="checkbox" checked={check.checked} onChange={() => toggleCheck(i)} />
                          <span>
                            <LinkifiedText text={check.text} />
                          </span>
                        </label>
                      )
                    return line.trim() ? (
                      <p key={i} className="notes-line">
                        <LinkifiedText text={line} />
                      </p>
                    ) : (
                      <p key={i} className="notes-line notes-gap" />
                    )
                  })
                ) : (
                  <p className="widget-muted">Klik om te typen…</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="notes-empty">
            <NotePencil size={56} weight="duotone" aria-hidden="true" />
            <p>Kies een notitie of maak een nieuwe.</p>
            <button className="settings-button" type="button" onClick={() => void createNote()}>
              <Plus size={16} weight="bold" /> Nieuwe notitie
            </button>
          </div>
        )}
        {(undo || error) && (
          <p className="notes-status" role="status">
            {undo && (
              <>
                Notitie verwijderd ·{' '}
                <button className="today-link" type="button" onClick={() => void undoRemove()}>
                  Ongedaan maken
                </button>
              </>
            )}
            {error && <span className="notes-error">{error}</span>}
          </p>
        )}
      </section>
    </main>
  )
}
