import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalEvent } from './calendarTypes'
import { functionErrorCode } from './settings'
import { supabase } from './supabase'

// Afspraken via de Edge Function "dashboard-calendar" (vandaag t/m +8 dagen), met cache voor direct
// tonen en offline gebruik. Status: loading (nog niets bekend), ok, stale (cache, verversen mislukt),
// none (geen agenda gekoppeld), error (mislukt en geen cache).

export type CalendarStatus = 'loading' | 'ok' | 'stale' | 'none' | 'error'

const CACHE_KEY = 'dashboard.calendar'
const REFRESH_MS = 5 * 60 * 1000

type Cache = { events: CalEvent[]; fetchedAt: string }

function readCache(): Cache | null {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Cache | null
    return cache && Array.isArray(cache.events) ? cache : null
  } catch {
    return null
  }
}

function writeCache(cache: Cache | null) {
  try {
    if (cache) localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // cache is een gemak, geen vereiste
  }
}

export function useCalendar(enabled: boolean): { events: CalEvent[]; status: CalendarStatus; refresh: () => void } {
  const [state, setState] = useState<{ events: CalEvent[]; status: CalendarStatus }>(() => {
    if (!enabled || !supabase) return { events: [], status: 'none' }
    const cache = readCache()
    return { events: cache?.events ?? [], status: cache ? 'ok' : 'loading' }
  })
  const request = useRef(0)

  const refresh = useCallback(async () => {
    if (!enabled || !supabase) return
    const id = ++request.current
    const { data, error } = await supabase.functions.invoke('dashboard-calendar', { body: {} })
    const code = error ? await functionErrorCode(error) : null
    if (id !== request.current) return // er loopt al een nieuwere verversing
    if (!error && data && Array.isArray(data.events)) {
      const cache = { events: data.events as CalEvent[], fetchedAt: String(data.fetchedAt ?? new Date().toISOString()) }
      writeCache(cache)
      setState({ events: cache.events, status: 'ok' })
    } else if (code === 'no_calendar') {
      writeCache(null)
      setState({ events: [], status: 'none' })
    } else {
      const cache = readCache()
      setState(cache ? { events: cache.events, status: 'stale' } : { events: [], status: 'error' })
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !supabase) {
      setState({ events: [], status: 'none' })
      return
    }
    void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onOnline = () => void refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [enabled, refresh])

  return { ...state, refresh: () => void refresh() }
}
