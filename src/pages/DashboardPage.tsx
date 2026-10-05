import { useCallback, useEffect, useState } from 'react'
import { SlotGrid } from '../dashboard/SlotGrid'
import { TodayHeader } from '../dashboard/TodayHeader'
import { TOPICS } from '../dashboard/topics'
import { WeatherCard } from '../dashboard/WeatherCard'
import { AgendaWidget } from '../dashboard/widgets/AgendaWidget'
import { NotesWidget } from '../dashboard/widgets/NotesWidget'
import { TodoWidget } from '../dashboard/widgets/TodoWidget'
import { TopicWidget } from '../dashboard/widgets/TopicWidget'
import { emit, useAppEvent } from '../lib/appEvents'
import { useSharedCalendar } from '../lib/calendar'
import { DEFAULT_LAYOUT, useLayout, type SlotSize, type WidgetId } from '../lib/layout'
import { navigate } from '../lib/router'
import { getSettings, rememberedPlace, type DashboardSettings } from '../lib/settings'
import { useWeather } from '../lib/weather'
import type { PageProps } from './TodoPage'

/**
 * Dashboard (#/), desktop eerst: 12-koloms raster.
 * Rij 1 kop + weer, daarna 6 plekken (1 groot, 1 middel, 4 klein); welke tegel waar staat bepaalt de indeling.
 */
export function DashboardPage(_props: PageProps) {
  // Start met de onthouden woonplaats: het weer staat er dan meteen, ook offline.
  const [settings, setSettings] = useState<DashboardSettings | null>(() => {
    const place = rememberedPlace()
    return place ? { icalUrl: null, layout: null, ...place } : null
  })
  const calendar = useSharedCalendar()
  const [editing, setEditing] = useState(false)
  const { layout, setLayout } = useLayout()
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
  useAppEvent('settings-saved', loadSettings)

  function widget(id: WidgetId, size: SlotSize) {
    if (id === 'agenda')
      return (
        <AgendaWidget
          size={size}
          onOpen={() => navigate('/agenda')}
          events={calendar.events}
          status={calendar.status}
          onConnect={() => emit('open-settings')}
          onRetry={calendar.refresh}
        />
      )
    if (id === 'todo') return <TodoWidget size={size} onOpen={() => navigate('/todo')} />
    if (id === 'notities') return <NotesWidget size={size} onOpen={() => navigate('/notities')} />
    const topic = TOPICS.find((t) => t.id === id)!
    return <TopicWidget size={size} topic={topic} onOpen={() => navigate(topic.route)} />
  }

  return (
    <main className="dash" data-editing={editing || undefined}>
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
      <SlotGrid layout={layout} editing={editing} onChange={setLayout} render={widget} />
      {editing && (
        <div className="edit-bar" role="region" aria-label="Indeling aanpassen">
          <span className="edit-bar-text">Sleep een tegel naar een andere plek om te ruilen</span>
          <button className="settings-button" data-variant="ghost" type="button" onClick={() => setLayout(DEFAULT_LAYOUT)}>
            Standaardindeling
          </button>
          <button className="settings-button" type="button" onClick={() => setEditing(false)}>
            Klaar
          </button>
        </div>
      )}
    </main>
  )
}
