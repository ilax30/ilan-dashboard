import { Check, PencilSimple, Plus, Wallet } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  billsStore,
  CADENCES,
  CATEGORIES,
  dueDayFor,
  dueLabel,
  dueSoon,
  formatEuro,
  monthlyTotal,
  nextDueAfter,
  openThisMonth,
  parseAmount,
  type Bill,
  type Cadence,
} from '../lib/bills'
import { billsChanged, useBills } from '../lib/useBills'
import { Wishlist, type UndoOffer } from './Wishlist'

const UNDO_MS = 5000
export const NEW_BILL_FLAG = 'bills.new'

const CADENCE_LABEL: Record<Cadence, string> = { week: 'Per week', maand: 'Per maand', kwartaal: 'Per kwartaal', jaar: 'Per jaar', eenmalig: 'Eenmalig' }
const dateFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
const shortFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const formatDue = (s: string) => dateFmt.format(parseDate(s)).replace(/\./g, '')
export const formatDueShort = (s: string) => shortFmt.format(parseDate(s)).replace('.', '')

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const byDue = (list: Bill[]) =>
  [...list].sort((a, b) => Number(b.active) - Number(a.active) || a.next_due.localeCompare(b.next_due) || a.name.localeCompare(b.name))

type Undo = UndoOffer

/** Financiën (#/financien): drie kerncijfers en de lijst met vaste lasten (handmatig bijgehouden). */
export function FinancePage() {
  const { bills, setBills, failed, load } = useBills()
  const [editing, setEditing] = useState<Bill | 'new' | null>(null)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const undoTimer = useRef(0)
  const now = new Date()

  useEffect(() => () => window.clearTimeout(undoTimer.current), [])

  // Openen vanaf de tegel met "+ Vaste last".
  useEffect(() => {
    try {
      if (sessionStorage.getItem(NEW_BILL_FLAG) === '1') {
        sessionStorage.removeItem(NEW_BILL_FLAG)
        setEditing('new')
      }
    } catch {
      // geen sessie-opslag
    }
  }, [])

  function showUndo(u: Undo) {
    setUndo(u)
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }

  async function put(bill: Bill) {
    setBills((list) => list && byDue([bill, ...list.filter((b) => b.id !== bill.id)]))
    try {
      await billsStore.save(bill)
      setError(null)
      billsChanged()
    } catch {
      setError('Opslaan mislukt. Probeer het opnieuw.')
      load()
    }
  }

  async function markPaid(bill: Bill) {
    // Eenmalig: na betalen klaar, dus uit de lijst (wel ongedaan te maken).
    if (bill.cadence === 'eenmalig') return remove(bill, `${bill.name} betaald`)
    const next = { ...bill, next_due: nextDueAfter(bill.next_due, bill.cadence, bill.due_day) }
    showUndo({ text: `${bill.name} betaald · volgende ${formatDueShort(next.next_due)}`, restore: () => void put(bill) })
    await put(next)
  }

  async function remove(bill: Bill, text = `${bill.name} verwijderd`) {
    setEditing(null)
    setBills((list) => list && list.filter((b) => b.id !== bill.id))
    showUndo({ text, restore: () => void put(bill) })
    try {
      await billsStore.remove(bill.id)
      billsChanged()
    } catch {
      setError('Verwijderen mislukt.')
      load()
    }
  }

  async function undoLast() {
    const u = undo
    if (!u) return
    window.clearTimeout(undoTimer.current)
    setUndo(null)
    u.restore()
  }

  const list = bills ?? []
  const active = list.filter((b) => b.active)
  const next = dueSoon(active, now, 3650)[0]
  const soon = dueSoon(active, now, 7).length
  const fixedCount = active.filter((b) => b.cadence !== 'eenmalig').length

  return (
    <main className="fin-page">
      <header className="fin-head">
        <h1 className="fin-heading">Financiën</h1>
        <button className="settings-button fin-new" type="button" onClick={() => setEditing('new')}>
          <Plus size={16} weight="bold" /> Vaste last
        </button>
      </header>

      <section className="fin-stats" aria-label="Overzicht">
        <div className="fin-stat dash-card">
          <span className="fin-stat-label">Openstaand deze maand</span>
          <span className="fin-stat-value">{bills ? formatEuro(openThisMonth(list, now)) : '–'}</span>
          {soon > 0 && <span className="fin-badge" data-tone="soon">{soon === 1 ? '1 betaling' : `${soon} betalingen`} binnen 7 dagen</span>}
        </div>
        <div className="fin-stat dash-card">
          <span className="fin-stat-label">Vaste lasten per maand</span>
          <span className="fin-stat-value">{bills ? formatEuro(monthlyTotal(list)) : '–'}</span>
          <span className="fin-stat-sub">{fixedCount === 1 ? '1 vaste last' : `${fixedCount} vaste lasten`}</span>
        </div>
        <div className="fin-stat dash-card">
          <span className="fin-stat-label">Volgende betaling</span>
          {next ? (
            <>
              <span className="fin-stat-value">{formatEuro(next.amount)}</span>
              <span className="fin-stat-sub">
                {next.name} · {formatDue(next.next_due)}
              </span>
            </>
          ) : (
            <span className="fin-stat-value">–</span>
          )}
        </div>
      </section>

      <div className="fin-columns">
        <section className="fin-list dash-card" aria-label="Vaste lasten">
          {bills === null ? (
            <p className="widget-muted">{failed ? 'Vaste lasten konden niet laden.' : 'Laden…'}</p>
          ) : list.length === 0 ? (
            <div className="fin-empty">
              <Wallet size={56} weight="duotone" aria-hidden="true" />
              <p>Nog geen vaste lasten. Voeg je huur, abonnementen, verzekeringen of een eenmalige betaling toe.</p>
              <button className="settings-button" type="button" onClick={() => setEditing('new')}>
                <Plus size={16} weight="bold" /> Vaste last toevoegen
              </button>
            </div>
          ) : (
            <ul className="fin-rows">
              {byDue(list).map((b) => {
                const label = b.active ? dueLabel(b.next_due, now) : null
                return (
                  <li key={b.id} className="fin-row" data-inactive={!b.active || undefined}>
                    <span className="fin-avatar" aria-hidden="true">
                      {b.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="fin-row-main">
                      <span className="fin-row-name">{b.name}</span>
                      <span className="fin-row-meta">
                        {b.category} · {CADENCE_LABEL[b.cadence].toLowerCase()}
                        {!b.active && ' · gestopt'}
                      </span>
                    </span>
                    <span className="fin-row-due">
                      {formatDue(b.next_due)}
                      {label && (
                        <span className="fin-badge" data-tone={label.tone}>
                          {label.text}
                        </span>
                      )}
                    </span>
                    <span className="fin-row-amount">{formatEuro(b.amount)}</span>
                    <span className="fin-row-actions">
                      {b.active && (
                        <button className="settings-button fin-paid" data-variant="ghost" type="button" onClick={() => void markPaid(b)}>
                          <Check size={15} weight="bold" /> Betaald
                        </button>
                      )}
                      <button className="icon-button" type="button" title="Bewerken" aria-label={`${b.name} bewerken`} onClick={() => setEditing(b)}>
                        <PencilSimple size={18} />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <Wishlist onUndo={showUndo} onError={setError} />
      </div>

      {(undo || error) && (
        <p className="notes-status" role="status">
          {undo && (
            <>
              {undo.text} ·{' '}
              <button className="today-link" type="button" onClick={() => void undoLast()}>
                Ongedaan maken
              </button>
            </>
          )}
          {error && <span className="notes-error">{error}</span>}
        </p>
      )}

      <BillDialog
        bill={editing}
        onClose={() => setEditing(null)}
        onSave={(bill) => {
          setEditing(null)
          void put(bill)
        }}
        onDelete={(bill) => void remove(bill)}
      />
    </main>
  )
}

type DialogProps = {
  bill: Bill | 'new' | null
  onClose: () => void
  onSave: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}

/** Venster om een vaste last toe te voegen of te bewerken. */
function BillDialog({ bill, onClose, onSave, onDelete }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cadence, setCadence] = useState<Cadence>('maand')
  const [due, setDue] = useState('')
  const [category, setCategory] = useState<string>('Abonnementen')
  const [active, setActive] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const open = bill !== null
  const existing = bill && bill !== 'new' ? bill : null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setName(existing?.name ?? '')
      setAmount(existing ? String(existing.amount.toFixed(2)).replace('.', ',') : '')
      setCadence(existing?.cadence ?? 'maand')
      setDue(existing?.next_due ?? todayIso())
      setCategory(existing?.category ?? 'Abonnementen')
      setActive(existing?.active ?? true)
      setMsg(null)
      dialog.showModal()
      nameRef.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, existing])

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const a = parseAmount(amount)
    if (!n) return setMsg('Geef de vaste last een naam.')
    if (a === null) return setMsg('Vul een geldig bedrag in, bijvoorbeeld 11,99.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return setMsg('Kies de volgende betaaldatum.')
    onSave({
      id: existing?.id ?? crypto.randomUUID(),
      name: n.slice(0, 120),
      amount: a,
      cadence,
      next_due: due,
      due_day: dueDayFor(due, existing ?? undefined),
      category,
      active,
      created_at: existing?.created_at ?? new Date().toISOString(),
    })
  }

  return (
    <dialog
      ref={ref}
      className="calendar settings fin-dialog"
      aria-labelledby="fin-dialog-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="calendar-inner" onSubmit={submit} noValidate>
        <header className="calendar-head">
          <h2 className="calendar-title" id="fin-dialog-title">
            {existing ? 'Vaste last bewerken' : 'Nieuwe vaste last'}
          </h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Sluiten">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="fin-form">
          <label className="fin-field fin-field-wide">
            <span>Naam</span>
            <input ref={nameRef} className="settings-input" value={name} maxLength={120} placeholder="Bijv. Netflix" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="fin-field">
            <span>Bedrag</span>
            <input className="settings-input" value={amount} inputMode="decimal" placeholder="0,00" onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="fin-field">
            <span>Frequentie</span>
            <select className="settings-input" value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
              {CADENCES.map((c) => (
                <option key={c} value={c}>
                  {CADENCE_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="fin-field">
            <span>Volgende betaling</span>
            <input className="settings-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="fin-field">
            <span>Categorie</span>
            <select className="settings-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
              {!(CATEGORIES as readonly string[]).includes(category) && <option>{category}</option>}
            </select>
          </label>
          {existing && (
            <label className="fin-check fin-field-wide">
              <input type="checkbox" checked={!active} onChange={(e) => setActive(!e.target.checked)} />
              Gestopt (telt niet meer mee)
            </label>
          )}
        </div>
        {msg && (
          <p className="settings-msg" data-ok="false" role="alert">
            {msg}
          </p>
        )}
        <div className="fin-dialog-actions">
          {existing && (
            <button className="settings-button" data-variant="ghost" type="button" onClick={() => onDelete(existing)}>
              Verwijderen
            </button>
          )}
          <span className="fin-spacer" />
          <button className="settings-button" data-variant="ghost" type="button" onClick={onClose}>
            Annuleren
          </button>
          <button className="settings-button" type="submit">
            Opslaan
          </button>
        </div>
      </form>
    </dialog>
  )
}
