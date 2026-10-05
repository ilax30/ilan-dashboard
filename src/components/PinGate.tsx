import { useEffect, useState, type ReactNode } from 'react'
import { Blobs } from './Decor'
import { PinPad } from './PinPad'
import {
  checkPin,
  clearPin,
  consumeUnlockedByLogin,
  failures,
  forgetActive,
  hasPin,
  MAX_TRIES,
  recentlyActive,
  savePin,
  syncPinFromAccount,
  touchActive,
} from '../lib/pin'

const AUTO_LOCK_MS = 10 * 60 * 1000

/**
 * Pincode-slot rond het bord. Ingelogd blijf je via Supabase; de pincode is een snel slot
 * per apparaat. Hij komt pas na 10 minuten niet gebruiken (ook bij openen/refresh), of via "Vergrendelen".
 */
export type PageControls = { onLock?: () => void; onSetPin: () => void; onLogout: () => void }

export function PinGate({
  uid,
  onLogout,
  children,
}: {
  uid: string
  onLogout: () => void
  children: (controls: PageControls) => ReactNode
}) {
  const [mode, setMode] = useState<'checking' | 'locked' | 'setup' | 'confirm' | 'open'>('checking')

  // De pincode van je account geldt op elk apparaat (offline: de laatst bekende op dit apparaat).
  useEffect(() => {
    if (mode !== 'checking') return
    syncPinFromAccount(uid)
      .catch(() => hasPin(uid))
      .then((found) => {
        const justLoggedIn = consumeUnlockedByLogin()
        const unlocked = !found || justLoggedIn || recentlyActive(AUTO_LOCK_MS)
        if (unlocked) touchActive()
        setMode(unlocked ? 'open' : 'locked')
      })
  }, [mode, uid])
  const [first, setFirst] = useState('')
  const [error, setError] = useState('')

  // Bijhouden wanneer je de app gebruikt; na 10 minuten niets doen gaat hij op slot.
  useEffect(() => {
    if (mode !== 'open') return
    let last = 0
    const active = () => {
      if (Date.now() - last < 15_000) return
      last = Date.now()
      touchActive()
    }
    const onVis = () => {
      if (document.hidden) return touchActive()
      if (hasPin(uid) && !recentlyActive(AUTO_LOCK_MS)) setMode('locked')
      else active()
    }
    const check = setInterval(() => {
      if (!document.hidden && hasPin(uid) && !recentlyActive(AUTO_LOCK_MS)) setMode('locked')
    }, 30_000)
    window.addEventListener('pointerdown', active, { passive: true })
    window.addEventListener('keydown', active)
    window.addEventListener('scroll', active, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(check)
      window.removeEventListener('pointerdown', active)
      window.removeEventListener('keydown', active)
      window.removeEventListener('scroll', active)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [mode, uid])

  function logout() {
    clearPin(uid)
    onLogout()
  }

  if (mode === 'checking') return <Blobs />

  if (mode === 'locked') {
    return (
      <>
        <Blobs />
        <PinPad
          title="Welkom terug"
          hint="Vul je pincode in."
          error={error}
          onComplete={async (pin) => {
            if (await checkPin(uid, pin)) {
              setError('')
              touchActive()
              setMode('open')
              return true
            }
            const left = MAX_TRIES - failures(uid)
            if (left <= 0) {
              logout()
              return false
            }
            setError(`Onjuiste pincode. Nog ${left} ${left === 1 ? 'poging' : 'pogingen'}.`)
            return false
          }}
          footer={
            <button className="link" type="button" onClick={logout}>
              Pincode vergeten? Log opnieuw in via e-mail
            </button>
          }
        />
      </>
    )
  }

  if (mode === 'setup' || mode === 'confirm') {
    return (
      <>
        <Blobs />
        <PinPad
          title={mode === 'setup' ? 'Nieuwe pincode' : 'Nog een keer'}
          hint={
            mode === 'setup'
              ? 'Kies 4 cijfers. Daarmee log je op al je apparaten in.'
              : 'Vul dezelfde 4 cijfers nog eens in.'
          }
          error={error}
          onComplete={async (pin) => {
            if (mode === 'setup') {
              setFirst(pin)
              setError('')
              setMode('confirm')
              return true
            }
            if (pin !== first) {
              setError('Die codes waren niet hetzelfde. Begin opnieuw.')
              setMode('setup')
              return false
            }
            if (!(await savePin(uid, pin))) {
              setError('Opslaan lukte niet (geen verbinding?). Je oude pincode blijft geldig.')
              setMode('open')
              return false
            }
            setError('')
            setMode('open')
            return true
          }}
          footer={
            <button
              className="link"
              type="button"
              onClick={() => {
                setError('')
                setMode('open')
              }}
            >
              Annuleren
            </button>
          }
        />
      </>
    )
  }


  return children({
    onLock: hasPin(uid)
      ? () => {
          forgetActive()
          setMode('locked')
        }
      : undefined,
    onSetPin: () => setMode('setup'),
    onLogout: logout,
  })
}
