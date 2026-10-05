import { useCallback, useEffect, useState } from 'react'
import { Landscape } from '../components/Landscape'
import { MoreFooter } from '../components/MoreFooter'
import { SettingsDialog } from '../dashboard/SettingsDialog'
import { Timeline } from '../dashboard/Timeline'
import { TodayHeader } from '../dashboard/TodayHeader'
import { TodoSummaryCard } from '../dashboard/TodoSummaryCard'
import { useCalendar } from '../lib/calendar'
import { getSettings, rememberedPlace, type DashboardSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { useWeather } from '../lib/weather'
import type { PageProps } from './TodoPage'

/**
 * Dashboard (#/), desktop eerst: 12-koloms raster.
 * Rij 1 de live kop, rij 2 tijdlijn + to-do, rij 3 (later) de onderwerp-tegels (Doelen, Financiën, …).
 */
export function DashboardPage({ onLock, onSetPin, onLogout }: PageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Start met de onthouden woonplaats: het weer staat er dan meteen, ook offline.
  const [settings, setSettings] = useState<DashboardSettings | null>(() => {
    const place = rememberedPlace()
    return place ? { icalUrl: null, layout: null, ...place } : null
  })
  const calendar = useCalendar(Boolean(supabase))
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

  return (
    <>
      <Landscape />
      <main className="dash">
        <TodayHeader
          events={calendar.events}
          calendarStatus={calendar.status}
          weather={weather}
          weatherStale={stale}
          hasCity={settings === null || settings.latitude !== null}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <Timeline
          events={calendar.events}
          status={calendar.status}
          onConnect={() => setSettingsOpen(true)}
          onRetry={calendar.refresh}
        />
        <div className="dash-side">
          <TodoSummaryCard />
        </div>
        <div className="dash-footer">
          <MoreFooter onLock={onLock} onSetPin={onSetPin} onLogout={onLogout} />
        </div>
      </main>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          loadSettings()
          calendar.refresh()
        }}
      />
    </>
  )
}
