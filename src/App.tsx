import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Landscape } from './components/Landscape'
import { PinGate, type PageControls } from './components/PinGate'
import { PinLogin } from './components/PinLogin'
import { Sidebar } from './components/Sidebar'
import { ThemeToggle } from './components/ThemeToggle'
import { SettingsDialog } from './dashboard/SettingsDialog'
import { topicFor } from './dashboard/topics'
import { emit, useAppEvent } from './lib/appEvents'
import { CalendarContext, useCalendar } from './lib/calendar'
import { useHashRoute, type Route } from './lib/router'
import { supabase } from './lib/supabase'
import { AgendaPage } from './pages/AgendaPage'
import { BettingPage } from './pages/BettingPage'
import { DashboardPage } from './pages/DashboardPage'
import { FinancePage } from './pages/FinancePage'
import { NotesPage } from './pages/NotesPage'
import { TennisGate } from './pages/TennisGate'
import { TodoPage } from './pages/TodoPage'
import { TopicPage } from './pages/TopicPage'

export default function App() {
  return <Gate />
}

function Page({ route, controls }: { route: Route; controls?: PageControls }) {
  if (route === '/todo') return <TodoPage {...controls} />
  if (route === '/agenda') return <AgendaPage />
  if (route === '/notities') return <NotesPage />
  if (route === '/financien') return <FinancePage />
  if (route === '/tennis')
    return (
      <TennisGate>
        <BettingPage />
      </TennisGate>
    )
  const topic = topicFor(route)
  return topic ? <TopicPage topic={topic} /> : <DashboardPage {...controls} />
}

/** Alles na het inloggen: landschap, zijbalk, de pagina en de app-brede vensters. */
function Shell({ route, controls }: { route: Route; controls?: PageControls }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const calendar = useCalendar(Boolean(supabase))
  useAppEvent('open-settings', () => setSettingsOpen(true))
  useAppEvent('settings-saved', calendar.refresh)
  return (
    <CalendarContext.Provider value={calendar}>
      <Landscape />
      <div className="shell">
        <Sidebar route={route} />
        <div className="shell-main">
          <Page route={route} controls={controls} />
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => emit('settings-saved')} account={controls} />
    </CalendarContext.Provider>
  )
}

/** Zonder Supabase direct de pagina's; met Supabase eerst inloggen en het pincode-slot. */
function Gate() {
  const route = useHashRoute()
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Shell route={route} />
  if (session === undefined)
    return (
      <>
        <ThemeToggle />
        <Landscape />
      </>
    )
  if (!session)
    return (
      <>
        <ThemeToggle />
        <PinLogin />
      </>
    )
  return (
    <PinGate uid={session.user.id} onLogout={() => supabase?.auth.signOut()}>
      {(controls) => <Shell route={route} controls={controls} />}
    </PinGate>
  )
}
