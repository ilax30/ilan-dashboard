import { useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Sprig } from './Decor'

type Method = 'password' | 'code'
type Step = 'email' | 'busy' | 'code'

/** Supabase-fouten vertalen naar iets wat je kunt oplossen. */
function explain(error: AuthError, method: Method): string {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return 'Er zijn net te veel inlogmails verstuurd (max. ± 2 per uur). Gebruik de code of link uit je vorige mail, log in met je wachtwoord, of probeer het over een uur opnieuw.'
  }
  if (error.code === 'invalid_credentials') {
    return 'E-mailadres of wachtwoord klopt niet. Nog geen wachtwoord? Log één keer in met een e-mailcode en stel het in via "Meer…" onderaan.'
  }
  if (error.code === 'otp_expired') return 'Die code is verlopen. Vraag een nieuwe aan.'
  return method === 'code'
    ? 'Versturen lukte niet. Probeer het zo nog eens.'
    : 'Inloggen lukte niet. Probeer het zo nog eens.'
}

/**
 * Inloggen met wachtwoord (geen mail nodig) of met een e-mailcode/-link.
 * De code is handig in een geïnstalleerde app (iPad), waar een link in Safari zou openen.
 */
export function Login() {
  const [method, setMethod] = useState<Method>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [error, setError] = useState('')

  async function submitEmail(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setStep('busy')
    if (method === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(explain(error, 'password'))
      setStep('email')
      return // Bij succes schakelt App vanzelf door.
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) {
      setError(explain(error, 'code'))
      setStep('email')
      return
    }
    setStep('code')
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setStep('busy')
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    if (error) {
      setError(explain(error, 'code'))
      setStep('code')
    }
  }

  function switchTo(m: Method) {
    setMethod(m)
    setError('')
    setStep('email')
  }

  return (
    <main className="login">
      <h1 className="title">Ilan's To-Do lijst</h1>
      <Sprig className="sprig" />

      <div className="login-tabs" role="tablist" aria-label="Manier van inloggen">
        <button type="button" role="tab" aria-selected={method === 'password'} onClick={() => switchTo('password')}>
          Wachtwoord
        </button>
        <button type="button" role="tab" aria-selected={method === 'code'} onClick={() => switchTo('code')}>
          Code per e-mail
        </button>
      </div>

      {step === 'code' ? (
        <>
          <p className="login-text">Check je mail ({email}). Klik op de link, of vul hieronder de code in.</p>
          <form className="add" onSubmit={verify}>
            <input
              id="login-code"
              className="add-input login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              aria-label="Code uit de mail"
            />
            <button className="add-button" type="submit">
              Inloggen
            </button>
          </form>
          <button className="link" type="button" onClick={() => setStep('email')}>
            Ander e-mailadres of nieuwe code
          </button>
        </>
      ) : (
        <form className="login-form" onSubmit={submitEmail}>
          <input
            id="login-email"
            className="login-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jouw@email.nl"
            aria-label="E-mailadres"
            autoComplete="email"
          />
          {method === 'password' && (
            <input
              id="login-password"
              className="login-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              aria-label="Wachtwoord"
              autoComplete="current-password"
            />
          )}
          <button className="complete login-submit" type="submit" disabled={step === 'busy'}>
            {step === 'busy' ? 'Even geduld…' : method === 'password' ? 'Inloggen' : 'Stuur code'}
          </button>
        </form>
      )}

      {error && <p className="login-text error">{error}</p>}
    </main>
  )
}
