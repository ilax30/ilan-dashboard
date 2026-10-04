import { useState, type FormEvent } from 'react'

export function AddTodo({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const title = value.trim()
    if (!title) return
    onAdd(title)
    setValue('')
  }

  return (
    <form className="add" onSubmit={submit}>
      <input
        className="add-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Wat moet er nog gebeuren?"
        aria-label="Nieuwe taak"
        maxLength={500}
        autoFocus
      />
      <button className="add-button" type="submit" disabled={!value.trim()} aria-label="Toevoegen">
        <svg className="add-plus" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
        <span className="add-label">Toevoegen</span>
      </button>
    </form>
  )
}
