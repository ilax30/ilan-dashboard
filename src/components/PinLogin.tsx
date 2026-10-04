import { FunctionsHttpError } from '@supabase/supabase-js'
import { useState } from 'react'
import { savePinLocal } from '../lib/pin'
import { supabase } from '../lib/supabase'
import { Blobs } from './Decor'
import { PinPad } from './PinPad'

function minutes(seconds: number) {
  const m = Math.ceil(seconds / 60)
  return m >= 60 ? `${Math.ceil(m / 60)} uur` : `${m} ${m === 1 ? 'minuut' : 'minuten'}`
}

/**
 * Inloggen met alleen je pincode. De server controleert hem (met een slot tegen raden)
 * en geeft een eenmalige inlog-token terug die we direct inwisselen voor een sessie.
 */
export function PinLogin() {
  const [error, setError] = useState('')

  async function login(pin: string) {
    if (!supabase) return false
    setError('')
    const { data, error: fnError } = await supabase.functions.invoke<{ token_hash: string }>('todo-pin-login', {
      body: { pin },
    })

    if (fnError) {
      let body: { error?: string; remaining?: number; retry_after_s?: number } = {}
      if (fnError instanceof FunctionsHttpError) body = await fnError.context.json().catch(() => ({}))
      if (body.error === 'wrong') {
        setError(`Onjuiste pincode. Nog ${body.remaining} ${body.remaining === 1 ? 'poging' : 'pogingen'}.`)
      } else if (body.error === 'locked') {
        setError(`Te vaak een foute pincode. Probeer het over ${minutes(body.retry_after_s ?? 900)} opnieuw.`)
      } else {
        setError('Geen verbinding met de server. Check je internet en probeer het opnieuw.')
      }
      return false
    }

    const { data: auth, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: data!.token_hash,
      type: 'email',
    })
    if (otpError || !auth.user) {
      setError('Inloggen lukte niet. Probeer het opnieuw.')
      return false
    }
    // Dezelfde pincode lokaal onthouden, zodat het slot ook offline werkt.
    await savePinLocal(auth.user.id, pin)
    return true
  }

  return (
    <>
      <Blobs />
      <PinPad title="Welkom" hint="Vul je pincode in." error={error} onComplete={login} />
    </>
  )
}
