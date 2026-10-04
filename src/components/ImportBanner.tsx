import { useState } from 'react'
import { readLocalTodos } from '../lib/localStore'
import { store } from '../lib/store'

const DONE_KEY = 'notitie.imported'

function alreadyHandled() {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return true
  }
}

function markHandled() {
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch {
    /* geen opslag beschikbaar */
  }
}

/**
 * Eenmalig: taken die nog alleen in deze browser staan (van vóór de koppeling met de cloud)
 * overzetten naar je account. Zelfde ids, dus nogmaals overzetten maakt geen dubbele taken.
 */
export function ImportBanner({ onImported }: { onImported: () => void }) {
  const [local] = useState(() => (alreadyHandled() ? [] : readLocalTodos()))
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'hidden'>('idle')

  if (local.length === 0 || state === 'hidden') return null
  const open = local.filter((t) => !t.done_at).length

  async function importAll() {
    setState('busy')
    try {
      for (const todo of local) await store.create(todo)
      markHandled()
      setState('hidden')
      onImported()
    } catch {
      setState('error')
    }
  }

  return (
    <div className="import-banner" role="region" aria-label="Lokale taken overzetten">
      <p>
        Er staan nog <strong>{open} open</strong> en {local.length - open} afgeronde taken alleen in deze browser.
        {state === 'error' && ' Overzetten lukte niet; probeer het opnieuw.'}
      </p>
      <div className="import-actions">
        <button className="link" type="button" onClick={() => (markHandled(), setState('hidden'))}>
          Niet overzetten
        </button>
        <button className="complete" type="button" onClick={importAll} disabled={state === 'busy'}>
          {state === 'busy' ? 'Bezig…' : 'Zet over naar mijn account'}
        </button>
      </div>
    </div>
  )
}
