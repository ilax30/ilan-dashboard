import { useCallback, useEffect, useState } from 'react'
import { emit, useAppEvent } from './appEvents'
import { betsStore, type Bet, type Bookmaker } from './bets'
import { supabase } from './supabase'

/** Alle bookmakers en weddenschappen, live bijgewerkt (realtime, terugkomen in de app, wijzigingen elders in de app). */
export function useBets() {
  const [bookmakers, setBookmakers] = useState<Bookmaker[] | null>(null)
  const [bets, setBets] = useState<Bet[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    Promise.all([betsStore.listBookmakers(), betsStore.listBets()])
      .then(([bm, b]) => {
        setBookmakers(bm)
        setBets(b)
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
  useAppEvent('bets-changed', load)

  useEffect(() => {
    const db = supabase
    if (!db) return
    let channel: ReturnType<typeof db.channel> | null = null
    let timer = 0
    let cancelled = false
    db.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      if (!uid || cancelled) return
      const refresh = () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(load, 500)
      }
      const filter = `user_id=eq.${uid}`
      channel = db
        .channel(`bets-${uid}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bets', filter }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmakers', filter }, refresh)
        .subscribe()
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (channel) void db.removeChannel(channel)
    }
  }, [load])

  return { bookmakers, setBookmakers, bets, setBets, failed, load }
}

/** Na een wijziging: andere weergaven in de app bijwerken. */
export const betsChanged = () => emit('bets-changed')
