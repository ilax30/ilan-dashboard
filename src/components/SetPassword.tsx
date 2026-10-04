import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

/** Wachtwoord instellen of wijzigen, zodat inloggen op andere apparaten zonder mail kan. */
export function SetPassword() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setState('busy')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setState('error')
      setMessage(
        error.code === 'weak_password'
          ? 'Dat wachtwoord is te zwak. Kies minstens 8 tekens, liefst met cijfers.'
          : error.code === 'same_password'
            ? 'Dat is al je huidige wachtwoord.'
            : 'Opslaan lukte niet. Probeer het zo nog eens.',
      )
      return
    }
    setPassword('')
    setState('done')
    setMessage('Opgeslagen. Op andere apparaten kun je nu inloggen met je e-mail en dit wachtwoord.')
  }

  if (!open) {
    return (
      <button className="link" type="button" onClick={() => setOpen(true)}>
        Wachtwoord instellen
      </button>
    )
  }

  return (
    <form className="set-password" onSubmit={save}>
      <input
        id="new-password"
        className="login-input"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nieuw wachtwoord (min. 8 tekens)"
        aria-label="Nieuw wachtwoord"
        autoComplete="new-password"
      />
      <button className="complete" type="submit" disabled={state === 'busy'}>
        {state === 'busy' ? 'Opslaan…' : 'Opslaan'}
      </button>
      {message && <p className={state === 'error' ? 'login-text error' : 'login-text'}>{message}</p>}
    </form>
  )
}
