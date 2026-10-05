import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Blobs } from './components/Decor'
import { PinGate, type PageControls } from './components/PinGate'
import { PinLogin } from './components/PinLogin'
import { ThemeToggle } from './components/ThemeToggle'
import { useHashRoute, type Route } from './lib/router'
import { supabase } from './lib/supabase'
import { DashboardPage } from './pages/DashboardPage'
import { TodoPage } from './pages/TodoPage'

export default function App() {
  return (
    <>
      <ThemeToggle />
      <Gate />
    </>
  )
}

function Page({ route, controls }: { route: Route; controls?: PageControls }) {
  return route === '/todo' ? <TodoPage {...controls} /> : <DashboardPage {...controls} />
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

  if (!supabase) return <Page route={route} />
  if (session === undefined) return <Blobs />
  if (!session) return <PinLogin />
  return (
    <PinGate uid={session.user.id} onLogout={() => supabase?.auth.signOut()}>
      {(controls) => <Page route={route} controls={controls} />}
    </PinGate>
  )
}
