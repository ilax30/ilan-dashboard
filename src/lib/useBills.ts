import { useCallback, useEffect, useState } from 'react'
import { emit, useAppEvent } from './appEvents'
import { billsStore, type Bill } from './bills'
import { supabase } from './supabase'

/** Alle vaste lasten, live bijgewerkt (realtime, terugkomen in de app, wijzigingen elders in de app). */
export function useBills() {
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    billsStore
      .list()
      .then((list) => {
        setBills(list)
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
  useAppEvent('bills-changed', load)

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
        .channel(`bills-${uid}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `user_id=eq.${uid}` }, () => {
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

  return { bills, setBills, failed, load }
}

/** Na een wijziging: andere weergaven in de app (bijv. de tegel) bijwerken. */
export const billsChanged = () => emit('bills-changed')
