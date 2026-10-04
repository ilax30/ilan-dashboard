import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Sprig } from './Decor'

type Step = 'email' | 'sending' | 'code' | 'checking'

/**
 * Inloggen zonder wachtwoord: je krijgt een mail met een link én een 6-cijferige code.
 * De code is handig in een geïnstalleerde app (iPad), waar de link in Safari zou openen.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [error, setError] = useState('')

  async function sendMail(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setStep('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) {
      setError('Versturen lukte niet. Controleer je e-mailadres en probeer het opnieuw.')
      setStep('email')
      return
    }
    setStep('code')
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setStep('checking')
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    if (error) {
      setError('Die code klopt niet of is verlopen. Vraag een nieuwe aan.')
      setStep('code')
    }
    // Bij succes schakelt App vanzelf door via onAuthStateChange.
  }

  return (
    <main className="login">
      <h1 className="title">Ilan's To-Do lijst</h1>
      <Sprig className="sprig" />

      {step === 'email' || step === 'sending' ? (
        <>
          <p className="login-text">Log in om je lijst op al je apparaten te zien.</p>
          <form className="add" onSubmit={sendMail}>
            <input
              id="login-email"
              className="add-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@email.nl"
              aria-label="E-mailadres"
              autoComplete="email"
            />
            <button className="add-button" type="submit" disabled={step === 'sending'}>
              {step === 'sending' ? 'Versturen…' : 'Stuur code'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="login-text">
            Check je mail ({email}). Klik op de link, of vul hieronder de code in.
          </p>
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
            <button className="add-button" type="submit" disabled={step === 'checking'}>
              {step === 'checking' ? 'Controleren…' : 'Inloggen'}
            </button>
          </form>
          <button className="link" type="button" onClick={() => setStep('email')}>
            Ander e-mailadres of nieuwe code
          </button>
        </>
      )}

      {error && <p className="login-text error">{error}</p>}
    </main>
  )
}
