import { useCallback, useEffect, useState } from 'react'
import { Timeline } from '../dashboard/Timeline'
import { TodayHeader } from '../dashboard/TodayHeader'
import { TodoSummaryCard } from '../dashboard/TodoSummaryCard'
import { WeatherCard } from '../dashboard/WeatherCard'
import { emit, useAppEvent } from '../lib/appEvents'
import { useCalendar } from '../lib/calendar'
import { getSettings, rememberedPlace, type DashboardSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { useWeather } from '../lib/weather'
import type { PageProps } from './TodoPage'

/**
 * Dashboard (#/), desktop eerst: 12-koloms raster.
 * Rij 1 de live kop, rij 2 tijdlijn + to-do, rij 3 (later) de onderwerp-tegels (Doelen, Financiën, …).
 */
export function DashboardPage(_props: PageProps) {
  // Start met de onthouden woonplaats: het weer staat er dan meteen, ook offline.
  const [settings, setSettings] = useState<DashboardSettings | null>(() => {
    const place = rememberedPlace()
    return place ? { icalUrl: null, layout: null, ...place } : null
  })
  const calendar = useCalendar(Boolean(supabase))
  const [editing, setEditing] = useState(false)
  const { weather, stale } = useWeather(settings?.latitude ?? null, settings?.longitude ?? null)

  const loadSettings = useCallback(() => {
    getSettings()
      .then(setSettings)
      .catch(() => {}) // offline: de onthouden woonplaats blijft staan
  }, [])
  useEffect(() => {
    loadSettings()
    const onVisible = () => {
      if (!document.hidden) loadSettings()
    }
    window.addEventListener('online', loadSettings)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', loadSettings)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadSettings])
  useAppEvent('settings-saved', () => {
    loadSettings()
    calendar.refresh()
  })

  return (
    <>
      <main className="dash">
        <TodayHeader
          events={calendar.events}
          calendarStatus={calendar.status}
          onOpenSettings={() => emit('open-settings')}
          editing={editing}
          onToggleEditing={() => setEditing((e) => !e)}
        />
        <WeatherCard
          weather={weather}
          stale={stale}
          hasCity={settings === null || settings.latitude !== null}
          onOpenSettings={() => emit('open-settings')}
        />
        <Timeline
          events={calendar.events}
          status={calendar.status}
          onConnect={() => emit('open-settings')}
          onRetry={calendar.refresh}
        />
        <div className="dash-side">
          <TodoSummaryCard />
        </div>
      </main>
    </>
  )
}
