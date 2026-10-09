import { useState, type ReactNode } from 'react'
import { PinPad } from '../components/PinPad'
import { isUnlocked, unlock, verifyCode } from '../lib/tennisLock'
import { navigate } from '../lib/router'

/** Slot om de Tennis-pagina: eerst de code, daarna blijft hij open tot je de app sluit. */
export function TennisGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(isUnlocked)
  const [error, setError] = useState('')

  if (open) return <>{children}</>

  return (
    <PinPad
      title="Tennis"
      hint="Vul je code in."
      error={error}
      onComplete={async (code) => {
        if (await verifyCode(code)) {
          unlock()
          setError('')
          setOpen(true)
          return true
        }
        setError('Onjuiste code.')
        return false
      }}
      footer={
        <button className="link" type="button" onClick={() => navigate('/')}>
          Terug naar Home
        </button>
      }
    />
  )
}
