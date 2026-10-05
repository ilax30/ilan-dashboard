import { useCallback, useEffect, useState } from 'react'
import { emit, useAppEvent } from './appEvents'
import { supabase } from './supabase'
import { expiredWishes, wishlistStore, type Wish } from './wishlist'

/** Het verlanglijstje, live bijgewerkt; gekochte wensen ouder dan 24 uur worden opgeruimd. */
export function useWishlist() {
  const [wishes, setWishes] = useState<Wish[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    wishlistStore
      .list()
      .then((list) => {
        const expired = expiredWishes(list, new Date())
        for (const w of expired) void wishlistStore.remove(w.id).catch(() => {})
        setWishes(list.filter((w) => !expired.includes(w)))
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
    // Elk uur opnieuw, zodat wat 24 uur geleden gekocht is ook verdwijnt als de pagina openstaat.
    const hourly = window.setInterval(load, 60 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', load)
      window.clearInterval(hourly)
    }
  }, [load])
  useAppEvent('wishlist-changed', load)

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
        .channel(`wishlist-${uid}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist', filter: `user_id=eq.${uid}` }, () => {
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

  return { wishes, setWishes, failed, load }
}

/** Na een wijziging: andere weergaven in de app bijwerken. */
export const wishlistChanged = () => emit('wishlist-changed')
