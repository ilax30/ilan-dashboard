import { useState } from 'react'
import { Blobs, Sprig } from '../components/Decor'
import { SettingsDialog } from '../dashboard/SettingsDialog'
import { navigate } from '../lib/router'
import type { PageProps } from './TodoPage'

/** Dashboard (#/). Tijdelijke versie; de indeling volgt in taak 6–8. */
export function DashboardPage(_props: PageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <>
      <Blobs />
      <div className="app">
        <header className="header">
          <h1 className="title">Ilan's To-Do lijst</h1>
          <Sprig className="sprig" />
          <button className="complete" type="button" onClick={() => navigate('/todo')}>
            To-do →
          </button>
          <button className="complete" type="button" onClick={() => setSettingsOpen(true)}>
            Instellingen
          </button>
        </header>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => {}} />
    </>
  )
}
