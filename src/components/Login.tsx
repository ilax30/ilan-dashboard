import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Sprig } from './Decor'

export function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setState(error ? 'error' : 'sent')
  }

  return (
    <main className="login">
      <h1 className="title">Ilan's To-Do lijst</h1>
      <Sprig className="sprig" />
      {state === 'sent' ? (
        <p className="login-text">Check je mail, daar staat een inloglink in.</p>
      ) : (
        <form className="add" onSubmit={submit}>
          <input
            className="add-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jouw@email.nl"
            aria-label="E-mailadres"
            autoComplete="email"
          />
          <button className="add-button" type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Versturen…' : 'Stuur link'}
          </button>
        </form>
      )}
      {state === 'error' && <p className="login-text error">Dat ging mis. Probeer het nog eens.</p>}
    </main>
  )
}
