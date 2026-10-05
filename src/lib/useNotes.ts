import { useCallback, useEffect, useState } from 'react'
import { emit, useAppEvent } from './appEvents'
import { notesStore, sortNotes, type Note } from './notes'
import { supabase } from './supabase'

/** Alle notities, live bijgewerkt (realtime, terugkomen in de app, wijzigingen elders in de app). */
export function useNotes() {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    notesStore
      .list()
      .then((list) => {
        setNotes(sortNotes(list))
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
  useAppEvent('notes-changed', load)

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
        .channel(`notes-${uid}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${uid}` }, () => {
          window.clearTimeout(timer)
          timer = window.setTimeout(load, 500)
        })
        .subscribe()
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (channel) void db.removeChannel(channel)
    }
  }, [load])

  return { notes, setNotes, failed, load }
}

/** Na een wijziging: andere notitie-weergaven in de app (bijv. de tegel) bijwerken. */
export const notesChanged = () => emit('notes-changed')
