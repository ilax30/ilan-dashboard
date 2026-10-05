import { useCallback, useEffect, useState } from 'react'
import { Blobs } from '../components/Decor'
import { SettingsDialog } from '../dashboard/SettingsDialog'
import { TodayHeader } from '../dashboard/TodayHeader'
import { useCalendar } from '../lib/calendar'
import { navigate } from '../lib/router'
import { getSettings, type DashboardSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { useWeather } from '../lib/weather'
import type { PageProps } from './TodoPage'

/** Dashboard (#/): live kop, tijdlijn en to-do. Tijdlijn en to-do volgen in taak 7–8. */
export function DashboardPage(_props: PageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<DashboardSettings | null>(null)
  const calendar = useCalendar(Boolean(supabase))
  const { weather, stale } = useWeather(settings?.latitude ?? null, settings?.longitude ?? null)

  const loadSettings = useCallback(() => {
    getSettings()
      .then(setSettings)
      .catch(() => {})
  }, [])
  useEffect(loadSettings, [loadSettings])

  return (
    <>
      <Blobs />
      <main className="dash">
        <TodayHeader
          events={calendar.events}
          calendarStatus={calendar.status}
          weather={weather}
          weatherStale={stale}
          hasCity={settings === null || settings.latitude !== null}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <button className="complete" type="button" onClick={() => navigate('/todo')}>
          To-do →
        </button>
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
