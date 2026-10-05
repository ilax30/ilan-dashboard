import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Notities (Apple Notes-simpel): titel + tekst, vastpinnen, zoeken, vinkjes via "[ ]" / "[x]".

export type Note = {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
}

export type NotePatch = Partial<Pick<Note, 'title' | 'body' | 'pinned'>>

/** Vastgepinde eerst, daarna laatst bewerkt bovenaan. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
}

export function searchNotes(notes: Note[], q: string): Note[] {
  const query = q.trim().toLowerCase()
  if (!query) return notes
  return notes.filter((n) => n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query))
}

const CHECK = /^(\s*(?:[-*]\s+)?)\[( |x|X)\]\s?(.*)$/

/** "[ ] tekst" / "[x] tekst" (eventueel na "- ") → vakje; anders null. */
export function parseChecklist(line: string): { checked: boolean; text: string } | null {
  const m = line.match(CHECK)
  return m ? { checked: m[2].toLowerCase() === 'x', text: m[3] } : null
}

/** Wissel het vakje op regel `index`; regels zonder vakje blijven gelijk. */
export function toggleLine(body: string, index: number): string {
  const lines = body.split('\n')
  const m = lines[index]?.match(CHECK)
  if (!m) return body
  lines[index] = `${m[1]}[${m[2] === ' ' ? 'x' : ' '}] ${m[3]}`
  return lines.join('\n')
}

export function isEmptyNote(note: Pick<Note, 'title' | 'body'>): boolean {
  return !note.title.trim() && !note.body.trim()
}

/** Titel, of de eerste tekstregel (zonder vakje), of "Nieuwe notitie". */
export function noteTitle(note: Pick<Note, 'title' | 'body'>): string {
  if (note.title.trim()) return note.title.trim()
  const first = note.body.split('\n').find((l) => l.trim())
  if (!first) return 'Nieuwe notitie'
  return parseChecklist(first)?.text.trim() || first.trim()
}

type OpenNote = Pick<Note, 'id' | 'title' | 'body' | 'pinned'> & { dirty: boolean; isNew: boolean }

/**
 * Is de open notitie elders (ander apparaat) gewijzigd? Alleen als hier niets onopgeslagen staat:
 * de serverversie (als die verschilt), 'gone' als hij verwijderd is, anders null.
 */
export function remoteUpdate(open: OpenNote, notes: Note[]): Note | 'gone' | null {
  if (open.dirty || open.isNew) return null
  const server = notes.find((n) => n.id === open.id)
  if (!server) return 'gone'
  return server.title !== open.title || server.body !== open.body || server.pinned !== open.pinned ? server : null
}

// ---------- Opslag: Supabase (met login) of localStorage (lokale testmodus) ----------

export interface NotesStore {
  list(): Promise<Note[]>
  create(note: Note): Promise<void>
  /** Hele notitie neerzetten (aanmaken of overschrijven): ook als hij intussen elders verwijderd is. */
  save(note: Note): Promise<void>
  update(id: string, patch: NotePatch & { updated_at: string }): Promise<void>
  remove(id: string): Promise<void>
}

const COLUMNS = 'id, title, body, pinned, created_at, updated_at'

function createSupabaseNotes(db: SupabaseClient): NotesStore {
  const notes = () => db.from('notes')
  return {
    async list() {
      const { data, error } = await notes().select(COLUMNS).order('updated_at', { ascending: false })
      if (error) throw error
      return data as Note[]
    },
    async create(note) {
      const { error } = await notes().upsert(note)
      if (error) throw error
    },
    async save(note) {
      const { error } = await notes().upsert(note)
      if (error) throw error
    },
    async update(id, patch) {
      const { error } = await notes().update(patch).eq('id', id)
      if (error) throw error
    },
    async remove(id) {
      const { error } = await notes().delete().eq('id', id)
      if (error) throw error
    },
  }
}

const LOCAL_KEY = 'notities.v1'

function readLocal(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Note[]
  } catch {
    return []
  }
}

function writeLocal(notes: Note[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(notes))
  } catch {
    // opslag vol of geblokkeerd
  }
}

const localNotes: NotesStore = {
  async list() {
    return readLocal()
  },
  async create(note) {
    writeLocal([note, ...readLocal().filter((n) => n.id !== note.id)])
  },
  async save(note) {
    writeLocal([note, ...readLocal().filter((n) => n.id !== note.id)])
  },
  async update(id, patch) {
    writeLocal(readLocal().map((n) => (n.id === id ? { ...n, ...patch } : n)))
  },
  async remove(id) {
    writeLocal(readLocal().filter((n) => n.id !== id))
  },
}

export const notesStore: NotesStore = supabase ? createSupabaseNotes(supabase) : localNotes
