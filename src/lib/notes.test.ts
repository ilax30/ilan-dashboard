import { describe, expect, it, vi } from 'vitest'
import { isEmptyNote, noteTitle, notesStore, parseChecklist, remoteUpdate, searchNotes, sortNotes, toggleLine, type Note } from './notes'

// Geen echte database in tests: zonder Supabase gebruikt de opslag localStorage.
vi.mock('./supabase', () => ({ supabase: null }))

const note = (id: string, over: Partial<Note> = {}): Note => ({
  id,
  title: '',
  body: '',
  pinned: false,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
  ...over,
})

describe('sortNotes', () => {
  it('zet vastgepinde eerst, daarna laatst bewerkt bovenaan', () => {
    const list = sortNotes([
      note('oud', { updated_at: '2026-10-01T10:00:00Z' }),
      note('nieuw', { updated_at: '2026-10-05T10:00:00Z' }),
      note('pin', { pinned: true, updated_at: '2026-09-01T10:00:00Z' }),
    ])
    expect(list.map((n) => n.id)).toEqual(['pin', 'nieuw', 'oud'])
  })
})

describe('searchNotes', () => {
  const notes = [note('a', { title: 'Vakantie Texel', body: 'Fietsen huren' }), note('b', { title: 'Boeken', body: 'De Avonden' })]
  it('zoekt hoofdletterongevoelig in titel en tekst', () => {
    expect(searchNotes(notes, 'texel').map((n) => n.id)).toEqual(['a'])
    expect(searchNotes(notes, 'AVONDEN').map((n) => n.id)).toEqual(['b'])
  })
  it('geeft alles terug bij een leeg zoekveld', () => {
    expect(searchNotes(notes, '  ')).toHaveLength(2)
  })
})

describe('checklists', () => {
  it('herkent [ ] en [x] aan het begin van een regel (ook met -)', () => {
    expect(parseChecklist('[ ] Brood')).toEqual({ checked: false, text: 'Brood' })
    expect(parseChecklist('[x] Melk')).toEqual({ checked: true, text: 'Melk' })
    expect(parseChecklist('- [X] Kaas')).toEqual({ checked: true, text: 'Kaas' })
    expect(parseChecklist('Gewone regel')).toBeNull()
  })
  it('wisselt het vakje op een bepaalde regel', () => {
    expect(toggleLine('Lijst\n[ ] Brood\n[x] Melk', 1)).toBe('Lijst\n[x] Brood\n[x] Melk')
    expect(toggleLine('Lijst\n[ ] Brood\n[x] Melk', 2)).toBe('Lijst\n[ ] Brood\n[ ] Melk')
    expect(toggleLine('Lijst', 0)).toBe('Lijst')
  })
})

describe('lege en naamloze notities', () => {
  it('ziet een notitie zonder titel en tekst als leeg', () => {
    expect(isEmptyNote(note('x', { title: '  ', body: '\n ' }))).toBe(true)
    expect(isEmptyNote(note('x', { body: 'iets' }))).toBe(false)
  })
  it('gebruikt de eerste tekstregel als titel als die ontbreekt', () => {
    expect(noteTitle(note('x', { body: '\nBoodschappen\n[ ] Brood' }))).toBe('Boodschappen')
    expect(noteTitle(note('x', { body: '[ ] Brood' }))).toBe('Brood')
    expect(noteTitle(note('x'))).toBe('Nieuwe notitie')
  })
})

describe('opslaan (lokale testmodus)', () => {
  const mem = new Map<string, string>()
  globalThis.localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as unknown as Storage

  it('save zet de hele notitie neer, ook als hij intussen ergens anders verwijderd is', async () => {
    const n = note('a', { title: 'Boodschappen', body: 'melk' })
    await notesStore.save(n)
    await notesStore.remove('a')
    await notesStore.save({ ...n, body: 'melk, brood' })
    expect((await notesStore.list()).find((x) => x.id === 'a')?.body).toBe('melk, brood')
  })
})

describe('remoteUpdate', () => {
  const open = { id: 'a', title: 'T', body: 'oud', pinned: false, dirty: false, isNew: false }
  it('geeft de versie van de server als de open notitie elders is aangepast en hier niets gewijzigd is', () => {
    const server = note('a', { title: 'T', body: 'nieuw van iPad' })
    expect(remoteUpdate(open, [server])).toBe(server)
  })
  it('laat de open notitie staan als hier nog niet opgeslagen tekst staat, of als er niets verschilt', () => {
    expect(remoteUpdate({ ...open, dirty: true }, [note('a', { body: 'nieuw' })])).toBeNull()
    expect(remoteUpdate(open, [note('a', { title: 'T', body: 'oud' })])).toBeNull()
  })
  it('meldt "gone" als de notitie elders verwijderd is', () => {
    expect(remoteUpdate(open, [])).toBe('gone')
    expect(remoteUpdate({ ...open, isNew: true }, [])).toBeNull()
  })
})
