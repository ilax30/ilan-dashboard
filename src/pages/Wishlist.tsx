import { ArrowSquareOut, Gift, PencilSimple, Plus } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatEuro, parseAmount } from '../lib/bills'
import { useWishlist, wishlistChanged } from '../lib/useWishlist'
import { OTHER_GROUP, safeUrl, visibleWishes, wishGroups, wishTotal, wishlistStore, type Wish } from '../lib/wishlist'
import { backdropClose } from '../lib/dialogBackdrop'

export type UndoOffer = { text: string; restore: () => void }

const HOUR = 60 * 60 * 1000

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Verlanglijstje op de Financiën-pagina: wensen met prijs en link, per groep opgeteld; gekocht = doorgestreept, 24 uur. */
export function Wishlist({ onUndo, onError }: { onUndo: (u: UndoOffer) => void; onError: (msg: string) => void }) {
  const { wishes, setWishes, failed, load } = useWishlist()
  const [editing, setEditing] = useState<Wish | 'new' | null>(null)
  const now = new Date()
  const shown = visibleWishes(wishes ?? [], now)
  const groups = wishGroups(shown)
  const grouped = groups.length > 1 || (groups[0] && groups[0].name !== OTHER_GROUP)

  async function put(w: Wish) {
    setWishes((list) => list && [...list.filter((x) => x.id !== w.id), w])
    try {
      await wishlistStore.save(w)
      wishlistChanged()
    } catch {
      onError('Opslaan mislukt. Probeer het opnieuw.')
      load()
    }
  }

  async function toggleBought(w: Wish) {
    await put({ ...w, bought_at: w.bought_at ? null : new Date().toISOString() })
  }

  async function remove(w: Wish) {
    setEditing(null)
    setWishes((list) => list && list.filter((x) => x.id !== w.id))
    onUndo({ text: `${w.title} verwijderd`, restore: () => void put(w) })
    try {
      await wishlistStore.remove(w.id)
      wishlistChanged()
    } catch {
      onError('Verwijderen mislukt.')
      load()
    }
  }

  const row = (w: Wish) => {
    const url = w.url ? safeUrl(w.url) : null
    const hoursLeft = w.bought_at ? Math.max(1, Math.ceil((24 * HOUR - (now.getTime() - new Date(w.bought_at).getTime())) / HOUR)) : 0
    return (
      <li key={w.id} className="wish-row" data-bought={w.bought_at ? true : undefined}>
        <input
          type="checkbox"
          className="wish-check"
          checked={Boolean(w.bought_at)}
          onChange={() => void toggleBought(w)}
          aria-label={w.bought_at ? `${w.title}: niet gekocht` : `${w.title}: gekocht`}
          title={w.bought_at ? 'Toch niet gekocht' : 'Gekocht'}
        />
        <span className="wish-main">
          {url ? (
            <a className="wish-title" href={url} target="_blank" rel="noopener noreferrer">
              {w.title}
              <ArrowSquareOut size={14} aria-hidden="true" />
            </a>
          ) : (
            <span className="wish-title">{w.title}</span>
          )}
          <span className="wish-meta">{w.bought_at ? `Gekocht · verdwijnt over ${hoursLeft} uur` : url ? host(url) : 'Geen link'}</span>
        </span>
        <span className="wish-price">{formatEuro(w.price)}</span>
        <button className="icon-button" type="button" title="Bewerken" aria-label={`${w.title} bewerken`} onClick={() => setEditing(w)}>
          <PencilSimple size={18} />
        </button>
      </li>
    )
  }

  return (
    <section className="fin-list wish dash-card" aria-labelledby="wish-heading">
      <header className="wish-head">
        <h2 className="wish-heading" id="wish-heading">
          Verlanglijstje
        </h2>
        <span className="wish-total" title="Alles wat je nog niet gekocht hebt">
          {formatEuro(wishTotal(shown))}
        </span>
        <button className="settings-button fin-new" type="button" onClick={() => setEditing('new')}>
          <Plus size={16} weight="bold" /> Wens
        </button>
      </header>
      {wishes === null ? (
        <p className="widget-muted">{failed ? 'Verlanglijstje kon niet laden.' : 'Laden…'}</p>
      ) : shown.length === 0 ? (
        <div className="fin-empty">
          <Gift size={48} weight="duotone" aria-hidden="true" />
          <p>Nog niets op je verlanglijstje. Zet hier wat je wilt kopen, met prijs en link.</p>
        </div>
      ) : grouped ? (
        groups.map((g) => (
          <div key={g.name} className="wish-group">
            <h3 className="wish-group-head">
              <span>{g.name}</span>
              <span className="wish-group-total">{formatEuro(g.total)}</span>
            </h3>
            <ul className="wish-rows">{g.items.map(row)}</ul>
          </div>
        ))
      ) : (
        <ul className="wish-rows">{shown.map(row)}</ul>
      )}
      <WishDialog
        wish={editing}
        groups={groups.map((g) => g.name).filter((n) => n !== OTHER_GROUP)}
        onClose={() => setEditing(null)}
        onSave={(w) => {
          setEditing(null)
          void put(w)
        }}
        onDelete={(w) => void remove(w)}
      />
    </section>
  )
}

type DialogProps = {
  wish: Wish | 'new' | null
  groups: string[]
  onClose: () => void
  onSave: (w: Wish) => void
  onDelete: (w: Wish) => void
}

/** Venster om een wens toe te voegen of te bewerken. */
function WishDialog({ wish, groups, onClose, onSave, onDelete }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const [group, setGroup] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const open = wish !== null
  const existing = wish && wish !== 'new' ? wish : null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setTitle(existing?.title ?? '')
      setPrice(existing ? existing.price.toFixed(2).replace('.', ',') : '')
      setUrl(existing?.url ?? '')
      setGroup(existing?.group ?? '')
      setMsg(null)
      dialog.showModal()
      titleRef.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, existing])

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    const p = price.trim() ? parseAmount(price) : 0
    const link = url.trim() ? safeUrl(url) : ''
    if (!t) return setMsg('Geef de wens een naam.')
    if (p === null) return setMsg('Vul een geldige prijs in, bijvoorbeeld 49,99.')
    if (link === null) return setMsg('Deze link werkt niet. Plak het adres van de productpagina (https://…).')
    onSave({
      id: existing?.id ?? crypto.randomUUID(),
      title: t.slice(0, 200),
      url: link,
      price: p,
      group: group.trim().slice(0, 60),
      bought_at: existing?.bought_at ?? null,
      created_at: existing?.created_at ?? new Date().toISOString(),
    })
  }

  return (
    <dialog
      ref={ref}
      className="calendar settings fin-dialog"
      aria-labelledby="wish-dialog-title"
      onClose={onClose}
      onCancel={onClose}
      {...backdropClose(onClose)}
    >
      <form className="calendar-inner" onSubmit={submit} noValidate>
        <header className="calendar-head">
          <h2 className="calendar-title" id="wish-dialog-title">
            {existing ? 'Wens bewerken' : 'Nieuwe wens'}
          </h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Sluiten">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="fin-form">
          <label className="fin-field fin-field-wide">
            <span>Wat wil je kopen?</span>
            <input ref={titleRef} className="settings-input" value={title} maxLength={200} placeholder="Bijv. 32 GB werkgeheugen" onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="fin-field">
            <span>Prijs</span>
            <input className="settings-input" value={price} inputMode="decimal" placeholder="0,00" onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="fin-field">
            <span>Groep (optioneel)</span>
            <input className="settings-input" value={group} maxLength={60} list="wish-groups" placeholder="Bijv. Computer" onChange={(e) => setGroup(e.target.value)} />
            <datalist id="wish-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
          <label className="fin-field fin-field-wide">
            <span>Link (optioneel)</span>
            <input className="settings-input" value={url} type="url" inputMode="url" maxLength={2000} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
          </label>
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
