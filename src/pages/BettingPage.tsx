import { CaretLeft, CaretRight, Check, PencilSimple, Plus, TennisBall, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatEuro, parseAmount } from '../lib/bills'
import {
  BET_CATEGORIES,
  betPage,
  betProfit,
  betsStore,
  bookmakerStats,
  categoryStats,
  liveStats,
  formatOdds,
  parseOdds,
  totals,
  type Bet,
  type BetCategory,
  type BetResult,
  type Bookmaker,
} from '../lib/bets'
import { betsChanged, useBets } from '../lib/useBets'

const UNDO_MS = 5000

const dateFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const formatDay = (s: string) => dateFmt.format(parseDate(s)).replace('.', '')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "+ € 90,00" / "− € 100,00" met een echt minteken. */
const signed = (n: number) => (n > 0 ? `+ ${formatEuro(n)}` : n < 0 ? `− ${formatEuro(-n)}` : formatEuro(0))
const tone = (n: number) => (n > 0 ? 'win' : n < 0 ? 'lose' : undefined)

type Tab = 'bets' | 'bookmakers' | 'categories'
type Undo = { text: string; restore: () => void }

/** Tennis (#/tennis): weddenschappen invoeren, afsluiten en de bankroll per bookmaker volgen. */
export function BettingPage() {
  const { bookmakers, setBookmakers, bets, setBets, failed, load } = useBets()
  const [tab, setTab] = useState<Tab>('bets')
  const [filter, setFilter] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState<BetCategory | null>(null)
  const [liveFilter, setLiveFilter] = useState<'live' | 'prematch' | null>(null)
  const [page, setPage] = useState(1)
  const [editBet, setEditBet] = useState<Bet | null>(null)
  const [editBookmaker, setEditBookmaker] = useState<Bookmaker | 'new' | null>(null)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const undoTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(undoTimer.current), [])

  const ready = bookmakers !== null && bets !== null
  const allBets = bets ?? []
  const allBookmakers = bookmakers ?? []
  const activeFilter = filter && allBookmakers.some((b) => b.id === filter) ? filter : null
  const shown = allBets.filter((b) => (!activeFilter || b.bookmaker_id === activeFilter) && (!catFilter || b.category === catFilter) && (!liveFilter || (liveFilter === 'live') === (b.live === true)))
  const paged = betPage(shown, page)
  const sum = totals(allBets)
  const stats = bookmakerStats(allBookmakers, allBets)
  const catStats = categoryStats(allBets)
  const liveSplit = liveStats(allBets)
  const nameOf = (id: string) => allBookmakers.find((b) => b.id === id)?.name ?? '–'
  const totalBankroll = stats.reduce((s, x) => s + x.bankroll, 0)

  function showUndo(u: Undo) {
    setUndo(u)
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }

  async function putBet(bet: Bet) {
    setBets((list) => list && [...list.filter((b) => b.id !== bet.id), bet])
    try {
      await betsStore.saveBet(bet)
      setError(null)
      betsChanged()
    } catch {
      setError('Opslaan mislukt. Probeer het opnieuw.')
      load()
    }
  }

  async function putBookmaker(bm: Bookmaker) {
    setBookmakers((list) => list && [...list.filter((b) => b.id !== bm.id), bm])
    try {
      await betsStore.saveBookmaker(bm)
      setError(null)
      betsChanged()
    } catch {
      setError('Opslaan mislukt. Probeer het opnieuw.')
      load()
    }
  }

  async function settle(bet: Bet, result: BetResult) {
    const settled = { ...bet, result }
    const profit = betProfit(settled)
    showUndo({ text: `${bet.match || 'Weddenschap'} ${result === 'won' ? 'gewonnen' : 'verloren'} · ${signed(profit)}`, restore: () => void putBet(bet) })
    await putBet(settled)
  }

  async function removeBet(bet: Bet) {
    setEditBet(null)
    setBets((list) => list && list.filter((b) => b.id !== bet.id))
    showUndo({ text: 'Weddenschap verwijderd', restore: () => void putBet(bet) })
    try {
      await betsStore.removeBet(bet.id)
      betsChanged()
    } catch {
      setError('Verwijderen mislukt.')
      load()
    }
  }

  async function removeBookmaker(bm: Bookmaker) {
    setEditBookmaker(null)
    setBookmakers((list) => list && list.filter((b) => b.id !== bm.id))
    if (filter === bm.id) setFilter(null)
    showUndo({ text: `${bm.name} verwijderd`, restore: () => void putBookmaker(bm) })
    try {
      await betsStore.removeBookmaker(bm.id)
      betsChanged()
    } catch {
      setError('Verwijderen mislukt.')
      load()
    }
  }

  function undoLast() {
    const u = undo
    if (!u) return
    window.clearTimeout(undoTimer.current)
    setUndo(null)
    u.restore()
  }

  function openCategory(c: BetCategory) {
    setCatFilter(c)
    setPage(1)
    setTab('bets')
  }

  function openLive(kind: 'live' | 'prematch') {
    setLiveFilter(kind)
    setPage(1)
    setTab('bets')
  }

  function openBookmaker(id: string) {
    setFilter(id)
    setPage(1)
    setTab('bets')
  }

  return (
    <main className="fin-page bet-page">
      <header className="fin-head">
        <h1 className="fin-heading">Tennis</h1>
        <button className="settings-button fin-new" type="button" onClick={() => setEditBookmaker('new')}>
          <Plus size={16} weight="bold" /> Bookmaker
        </button>
      </header>

      <section className="bet-stats" aria-label="Overzicht">
        <div className="fin-stat dash-card">
          <span className="fin-stat-label">Winst / verlies</span>
          <span className="fin-stat-value bet-amount" data-tone={tone(sum.profit)}>
            {ready ? signed(sum.profit) : '–'}
          </span>
          <span className="fin-stat-sub">{sum.open > 0 ? `${sum.open} open` : `${sum.settled} afgesloten`}</span>
        </div>
        <div className="fin-stat dash-card">
          <span className="fin-stat-label">Totale bankroll</span>
          <span className="fin-stat-value">{ready ? formatEuro(totalBankroll) : '–'}</span>
          <span className="fin-stat-sub">{stats.length === 1 ? '1 bookmaker' : `${stats.length} bookmakers`}</span>
        </div>
        <div className="fin-stat dash-card">
          <span className="fin-stat-label">Gewonnen</span>
          <span className="fin-stat-value">{sum.winPct === null ? '–' : `${sum.winPct}%`}</span>
          <span className="fin-stat-sub">
            {sum.won} van {sum.settled}
          </span>
        </div>
        <div className="fin-stat dash-card">
          <span className="fin-stat-label">Rendement</span>
          <span className="fin-stat-value bet-amount" data-tone={sum.roi === null ? undefined : tone(sum.roi)}>
            {sum.roi === null ? '–' : `${sum.roi > 0 ? '+ ' : sum.roi < 0 ? '− ' : ''}${Math.abs(sum.roi).toFixed(1).replace('.', ',')}%`}
          </span>
          <span className="fin-stat-sub">van {formatEuro(sum.staked)} ingezet</span>
        </div>
      </section>

      <div className="bet-tabs" role="tablist" aria-label="Weergave">
        <button type="button" role="tab" aria-selected={tab === 'bets'} data-active={tab === 'bets' || undefined} onClick={() => setTab('bets')}>
          Weddenschappen
        </button>
        <button type="button" role="tab" aria-selected={tab === 'bookmakers'} data-active={tab === 'bookmakers' || undefined} onClick={() => setTab('bookmakers')}>
          Bookmakers
        </button>
        <button type="button" role="tab" aria-selected={tab === 'categories'} data-active={tab === 'categories' || undefined} onClick={() => setTab('categories')}>
          Statistieken
        </button>
      </div>

      {!ready ? (
        <section className="fin-list dash-card">
          <p className="widget-muted">{failed ? 'Weddenschappen konden niet laden.' : 'Laden…'}</p>
        </section>
      ) : tab === 'bets' ? (
        <>
          <NewBetForm
            bookmakers={allBookmakers}
            preferred={activeFilter}
            onAddBookmaker={() => setEditBookmaker('new')}
            onSave={(bet) => {
              setPage(1)
              void putBet(bet)
            }}
          />
          <section className="fin-list dash-card bet-list" aria-label="Weddenschappen">
            <header className="bet-list-head">
              <h2 className="wish-heading">{[catFilter, liveFilter === 'live' ? 'Live' : liveFilter === 'prematch' ? 'Pre-match' : null, activeFilter ? nameOf(activeFilter) : null].filter(Boolean).join(' · ') || 'Alle weddenschappen'}</h2>
              <div className="bet-chips" role="group" aria-label="Bookmaker">
                <button type="button" data-active={!activeFilter || undefined} onClick={() => (setFilter(null), setPage(1))}>
                  Alle
                </button>
                {allBookmakers.map((b) => (
                  <button key={b.id} type="button" data-active={activeFilter === b.id || undefined} onClick={() => (setFilter(b.id), setPage(1))}>
                    {b.name}
                  </button>
                ))}
              </div>
              <select className="settings-input bet-select" aria-label="Categorie" value={catFilter ?? ''} onChange={(e) => (setCatFilter((e.target.value || null) as BetCategory | null), setPage(1))}>
                <option value="">Alle categorieën</option>
                {BET_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select className="settings-input bet-select" aria-label="Live of pre-match" value={liveFilter ?? ''} onChange={(e) => (setLiveFilter((e.target.value || null) as 'live' | 'prematch' | null), setPage(1))}>
                <option value="">Live en pre-match</option>
                <option value="live">Live</option>
                <option value="prematch">Pre-match</option>
              </select>
            </header>
            {paged.items.length === 0 ? (
              <div className="fin-empty">
                <TennisBall size={56} weight="duotone" aria-hidden="true" />
                <p>{allBets.length > 0 ? 'Geen weddenschappen met deze keuze. Pas de filters hierboven aan.' : 'Nog geen weddenschappen. Vul hierboven je eerste tennisweddenschap in.'}</p>
              </div>
            ) : (
              <ul className="bet-rows">
                <li className="bet-row bet-row-head" aria-hidden="true">
                  <span>Datum</span>
                  <span>Weddenschap</span>
                  <span>Bookmaker</span>
                  <span className="bet-num">Inzet</span>
                  <span className="bet-num">Odds</span>
                  <span className="bet-num">Resultaat</span>
                  <span />
                </li>
                {paged.items.map((b) => {
                  const profit = betProfit(b)
                  return (
                    <li key={b.id} className="bet-row">
                      <span className="bet-date">{formatDay(b.placed_on)}</span>
                      <span className="bet-match">
                        <span className="bet-match-name">{b.match || 'Zonder omschrijving'}</span>
                        <span className="fin-badge">{b.category}</span>
                        {b.live && <span className="fin-badge bet-live-badge">Live</span>}
                      </span>
                      <span className="bet-bm">{nameOf(b.bookmaker_id)}</span>
                      <span className="bet-num">{formatEuro(b.stake)}</span>
                      <span className="bet-num">{formatOdds(b.odds)}</span>
                      <span className="bet-num bet-result">
                        {b.result === 'open' ? (
                          <>
                            <button className="settings-button bet-win" type="button" onClick={() => void settle(b, 'won')}>
                              <Check size={14} weight="bold" /> Winst
                            </button>
                            <button className="settings-button bet-loss" data-variant="ghost" type="button" onClick={() => void settle(b, 'lost')}>
                              <X size={14} weight="bold" /> Verlies
                            </button>
                          </>
                        ) : (
                          <span className="bet-amount" data-tone={tone(profit)}>
                            {signed(profit)}
                          </span>
                        )}
                      </span>
                      <button className="icon-button" type="button" title="Bewerken" aria-label={`${b.match || 'Weddenschap'} bewerken`} onClick={() => setEditBet(b)}>
                        <PencilSimple size={18} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {paged.pages > 1 && (
              <nav className="bet-pager" aria-label="Pagina's">
                <span className="bet-pager-count">
                  {(paged.page - 1) * 10 + 1}–{(paged.page - 1) * 10 + paged.items.length} van {shown.length}
                </span>
                <button className="icon-button" type="button" aria-label="Vorige pagina" disabled={paged.page === 1} onClick={() => setPage(paged.page - 1)}>
                  <CaretLeft size={16} weight="bold" />
                </button>
                {Array.from({ length: paged.pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" className="bet-page-num" data-active={n === paged.page || undefined} aria-current={n === paged.page ? 'page' : undefined} onClick={() => setPage(n)}>
                    {n}
                  </button>
                ))}
                <button className="icon-button" type="button" aria-label="Volgende pagina" disabled={paged.page === paged.pages} onClick={() => setPage(paged.page + 1)}>
                  <CaretRight size={16} weight="bold" />
                </button>
              </nav>
            )}
          </section>
        </>
      ) : tab === 'categories' ? (
        <section className="bet-stats-tab" aria-label="Statistieken">
          <h2 className="bet-section-title">Per categorie</h2>
          <div className="bet-bms">
          {catStats.map((c) => (
            <div key={c.category} className="bet-bm-card dash-card">
              <button className="bet-bm-open" type="button" onClick={() => openCategory(c.category)} title={`Weddenschappen in ${c.category} bekijken`}>
                <span className="bet-bm-name">{c.category}</span>
                <span className="fin-stat-value bet-amount" data-tone={tone(c.profit)}>
                  {signed(c.profit)}
                </span>
                <span className="fin-stat-sub">
                  {c.winPct === null ? 'Nog niets afgesloten' : `${c.winPct}% gewonnen (${c.won} van ${c.settled})`}
                  {c.roi !== null && ` · rendement ${c.roi > 0 ? '+ ' : c.roi < 0 ? '− ' : ''}${Math.abs(c.roi).toFixed(1).replace('.', ',')}%`}
                </span>
                <span className="fin-stat-sub">{c.count === 1 ? '1 weddenschap' : `${c.count} weddenschappen`}{c.open > 0 && ` · ${c.open} open`}</span>
              </button>
            </div>
          ))}
          </div>
          <h2 className="bet-section-title">Live of pre-match</h2>
          <div className="bet-bms">
            {([['live', 'Live', liveSplit.live], ['prematch', 'Pre-match', liveSplit.prematch]] as const).map(([kind, label, c]) => (
              <div key={kind} className="bet-bm-card dash-card">
                <button className="bet-bm-open" type="button" onClick={() => openLive(kind)} title={`${label} weddenschappen bekijken`}>
                  <span className="bet-bm-name">{label}</span>
                  <span className="fin-stat-value bet-amount" data-tone={tone(c.profit)}>
                    {signed(c.profit)}
                  </span>
                  <span className="fin-stat-sub">
                    {c.winPct === null ? 'Nog niets afgesloten' : `${c.winPct}% gewonnen (${c.won} van ${c.settled})`}
                    {c.roi !== null && ` · rendement ${c.roi > 0 ? '+ ' : c.roi < 0 ? '− ' : ''}${Math.abs(c.roi).toFixed(1).replace('.', ',')}%`}
                  </span>
                  <span className="fin-stat-sub">
                    {c.count === 1 ? '1 weddenschap' : `${c.count} weddenschappen`}
                    {c.open > 0 && ` · ${c.open} open`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="bet-bms" aria-label="Bookmakers">
          {stats.map(({ bookmaker: bm, bankroll: roll, profit, count }) => (
            <div key={bm.id} className="bet-bm-card dash-card">
              <button className="bet-bm-open" type="button" onClick={() => openBookmaker(bm.id)} title={`Weddenschappen bij ${bm.name} bekijken`}>
                <span className="bet-bm-name">{bm.name}</span>
                <span className="fin-stat-value">{formatEuro(roll)}</span>
                <span className="bet-delta" data-tone={tone(profit)}>
                  {signed(profit)}
                  {bm.start_bankroll > 0 && ` · ${profit > 0 ? '+' : profit < 0 ? '−' : ''}${Math.abs((profit / bm.start_bankroll) * 100).toFixed(1).replace('.', ',')}%`}
                </span>
                <span className="fin-stat-sub">
                  Gestart met {formatEuro(bm.start_bankroll)} · {count === 1 ? '1 weddenschap' : `${count} weddenschappen`}
                </span>
              </button>
              <button className="icon-button bet-bm-edit" type="button" title="Bewerken" aria-label={`${bm.name} bewerken`} onClick={() => setEditBookmaker(bm)}>
                <PencilSimple size={18} />
              </button>
            </div>
          ))}
          <button className="bet-bm-add" type="button" onClick={() => setEditBookmaker('new')}>
            <Plus size={18} weight="bold" /> Bookmaker toevoegen
          </button>
        </section>
      )}

      {(undo || error) && (
        <p className="notes-status" role="status">
          {undo && (
            <>
              {undo.text} ·{' '}
              <button className="today-link" type="button" onClick={undoLast}>
                Ongedaan maken
              </button>
            </>
          )}
          {error && <span className="notes-error">{error}</span>}
        </p>
      )}

      <BetDialog
        bet={editBet}
        bookmakers={allBookmakers}
        onClose={() => setEditBet(null)}
        onSave={(bet) => {
          setEditBet(null)
          void putBet(bet)
        }}
        onDelete={(bet) => void removeBet(bet)}
      />
      <BookmakerDialog
        bookmaker={editBookmaker}
        hasBets={(id) => allBets.some((b) => b.bookmaker_id === id)}
        onClose={() => setEditBookmaker(null)}
        onSave={(bm) => {
          setEditBookmaker(null)
          void putBookmaker(bm)
        }}
        onDelete={(bm) => void removeBookmaker(bm)}
      />
    </main>
  )
}

type BetFields = { bookmaker: string; category: BetCategory; live: boolean; stake: string; odds: string; date: string; match: string }

/** Valideert de invoer; geeft een melding of de waarden terug. */
function readBet(f: BetFields): string | { bookmaker_id: string; category: BetCategory; live: boolean; stake: number; odds: number; placed_on: string; match: string } {
  const stake = parseAmount(f.stake)
  const odds = parseOdds(f.odds)
  if (!f.bookmaker) return 'Kies een bookmaker.'
  if (stake === null || stake <= 0) return 'Vul een geldige inzet in, bijvoorbeeld 100.'
  if (odds === null) return 'Vul geldige odds in, bijvoorbeeld 1,90.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return 'Kies een datum.'
  return { bookmaker_id: f.bookmaker, category: f.category, live: f.live, stake, odds, placed_on: f.date, match: f.match.trim().slice(0, 200) }
}

/** Invoerbalk bovenaan: een nieuwe weddenschap in een paar seconden. */
function NewBetForm({ bookmakers, preferred, onAddBookmaker, onSave }: { bookmakers: Bookmaker[]; preferred: string | null; onAddBookmaker: () => void; onSave: (b: Bet) => void }) {
  const [f, setF] = useState<BetFields>({ bookmaker: '', category: 'ATP', live: false, stake: '', odds: '', date: todayIso(), match: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const matchRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<BetFields>) => setF((cur) => ({ ...cur, ...patch }))
  const bookmaker = bookmakers.some((b) => b.id === f.bookmaker) ? f.bookmaker : (preferred ?? bookmakers[0]?.id ?? '')

  if (bookmakers.length === 0)
    return (
      <section className="bet-form dash-card">
        <p className="bet-form-empty">Voeg eerst een bookmaker toe met je startbankroll, dan kun je weddenschappen plaatsen.</p>
        <button className="settings-button fin-new" type="button" onClick={onAddBookmaker}>
          <Plus size={16} weight="bold" /> Bookmaker toevoegen
        </button>
      </section>
    )

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = readBet({ ...f, bookmaker })
    if (typeof r === 'string') return setMsg(r)
    setMsg(null)
    onSave({ id: crypto.randomUUID(), ...r, result: 'open', created_at: new Date().toISOString() })
    set({ bookmaker, live: false, stake: '', odds: '', match: '', date: todayIso() })
    matchRef.current?.focus()
  }

  return (
    <form className="bet-form dash-card" onSubmit={submit} noValidate>
      <label className="fin-field bet-form-match">
        <span>Weddenschap</span>
        <input ref={matchRef} className="settings-input" value={f.match} maxLength={200} placeholder="Fonseca −1,5 sets" onChange={(e) => set({ match: e.target.value })} />
      </label>
      <label className="fin-field">
        <span>Bookmaker</span>
        <select className="settings-input" value={bookmaker} onChange={(e) => set({ bookmaker: e.target.value })}>
          {bookmakers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="fin-field">
        <span>Categorie</span>
        <select className="settings-input" value={f.category} onChange={(e) => set({ category: e.target.value as BetCategory })}>
          {BET_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="fin-check bet-live">
        <input type="checkbox" checked={f.live} onChange={(e) => set({ live: e.target.checked })} />
        Live
      </label>
      <label className="fin-field">
        <span>Inzet (€)</span>
        <input className="settings-input" value={f.stake} inputMode="decimal" placeholder="100" onChange={(e) => set({ stake: e.target.value })} />
      </label>
      <label className="fin-field">
        <span>Odds</span>
        <input className="settings-input" value={f.odds} inputMode="decimal" placeholder="1,90" onChange={(e) => set({ odds: e.target.value })} />
      </label>
      <label className="fin-field">
        <span>Datum</span>
        <input className="settings-input" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
      </label>
      <button className="settings-button bet-form-submit" type="submit">
        Plaatsen
      </button>
      {msg && (
        <p className="settings-msg bet-form-msg" data-ok="false" role="alert">
          {msg}
        </p>
      )}
    </form>
  )
}

const RESULT_LABEL: Record<BetResult, string> = { open: 'Nog open', won: 'Gewonnen', lost: 'Verloren' }

/** Venster om een weddenschap te corrigeren of te verwijderen. */
function BetDialog({ bet, bookmakers, onClose, onSave, onDelete }: { bet: Bet | null; bookmakers: Bookmaker[]; onClose: () => void; onSave: (b: Bet) => void; onDelete: (b: Bet) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [f, setF] = useState<BetFields>({ bookmaker: '', category: 'ATP', live: false, stake: '', odds: '', date: '', match: '' })
  const [result, setResult] = useState<BetResult>('open')
  const [msg, setMsg] = useState<string | null>(null)
  const open = bet !== null
  const set = (patch: Partial<BetFields>) => setF((cur) => ({ ...cur, ...patch }))

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setF({
        bookmaker: bet.bookmaker_id,
        category: bet.category,
        live: bet.live === true,
        stake: String(bet.stake).replace('.', ','),
        odds: String(bet.odds).replace('.', ','),
        date: bet.placed_on,
        match: bet.match,
      })
      setResult(bet.result)
      setMsg(null)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, bet])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!bet) return
    const r = readBet(f)
    if (typeof r === 'string') return setMsg(r)
    onSave({ ...bet, ...r, result })
  }

  return (
    <dialog
      ref={ref}
      className="calendar settings fin-dialog"
      aria-labelledby="bet-dialog-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="calendar-inner" onSubmit={submit} noValidate>
        <DialogHead id="bet-dialog-title" title="Weddenschap bewerken" onClose={onClose} />
        <div className="fin-form">
          <label className="fin-field fin-field-wide">
            <span>Weddenschap</span>
            <input className="settings-input" value={f.match} maxLength={200} placeholder="Fonseca −1,5 sets" onChange={(e) => set({ match: e.target.value })} />
          </label>
          <label className="fin-field">
            <span>Bookmaker</span>
            <select className="settings-input" value={f.bookmaker} onChange={(e) => set({ bookmaker: e.target.value })}>
              {bookmakers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fin-field">
            <span>Categorie</span>
            <select className="settings-input" value={f.category} onChange={(e) => set({ category: e.target.value as BetCategory })}>
              {BET_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="fin-check">
            <input type="checkbox" checked={f.live} onChange={(e) => set({ live: e.target.checked })} />
            Live geplaatst
          </label>
          <label className="fin-field">
            <span>Inzet (€)</span>
            <input className="settings-input" value={f.stake} inputMode="decimal" onChange={(e) => set({ stake: e.target.value })} />
          </label>
          <label className="fin-field">
            <span>Odds</span>
            <input className="settings-input" value={f.odds} inputMode="decimal" onChange={(e) => set({ odds: e.target.value })} />
          </label>
          <label className="fin-field">
            <span>Datum</span>
            <input className="settings-input" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label className="fin-field">
            <span>Uitkomst</span>
            <select className="settings-input" value={result} onChange={(e) => setResult(e.target.value as BetResult)}>
              {(Object.keys(RESULT_LABEL) as BetResult[]).map((r) => (
                <option key={r} value={r}>
                  {RESULT_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {msg && (
          <p className="settings-msg" data-ok="false" role="alert">
            {msg}
          </p>
        )}
        <div className="fin-dialog-actions">
          {bet && (
            <button className="settings-button" data-variant="ghost" type="button" onClick={() => onDelete(bet)}>
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

/** Venster om een bookmaker toe te voegen of te bewerken (naam en startbankroll). */
function BookmakerDialog({
  bookmaker,
  hasBets,
  onClose,
  onSave,
  onDelete,
}: {
  bookmaker: Bookmaker | 'new' | null
  hasBets: (id: string) => boolean
  onClose: () => void
  onSave: (b: Bookmaker) => void
  onDelete: (b: Bookmaker) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const open = bookmaker !== null
  const existing = bookmaker && bookmaker !== 'new' ? bookmaker : null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setName(existing?.name ?? '')
      setStart(existing ? String(existing.start_bankroll.toFixed(2)).replace('.', ',') : '')
      setMsg(null)
      dialog.showModal()
      nameRef.current?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, existing])

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const s = start.trim() === '' ? 0 : parseAmount(start)
    if (!n) return setMsg('Geef de bookmaker een naam.')
    if (s === null) return setMsg('Vul een geldig startbedrag in, bijvoorbeeld 300.')
    onSave({ id: existing?.id ?? crypto.randomUUID(), name: n.slice(0, 60), start_bankroll: s, created_at: existing?.created_at ?? new Date().toISOString() })
  }

  const locked = existing ? hasBets(existing.id) : false

  return (
    <dialog
      ref={ref}
      className="calendar settings fin-dialog"
      aria-labelledby="bm-dialog-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="calendar-inner" onSubmit={submit} noValidate>
        <DialogHead id="bm-dialog-title" title={existing ? 'Bookmaker bewerken' : 'Nieuwe bookmaker'} onClose={onClose} />
        <div className="fin-form">
          <label className="fin-field fin-field-wide">
            <span>Naam</span>
            <input ref={nameRef} className="settings-input" value={name} maxLength={60} placeholder="Bijv. Toto" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="fin-field fin-field-wide">
            <span>Startbankroll (€)</span>
            <input className="settings-input" value={start} inputMode="decimal" placeholder="300" onChange={(e) => setStart(e.target.value)} />
          </label>
        </div>
        {msg && (
          <p className="settings-msg" data-ok="false" role="alert">
            {msg}
          </p>
        )}
        <div className="fin-dialog-actions">
          {existing && (
            <button
              className="settings-button"
              data-variant="ghost"
              type="button"
              disabled={locked}
              title={locked ? 'Verwijder eerst de weddenschappen van deze bookmaker' : undefined}
              onClick={() => onDelete(existing)}
            >
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

function DialogHead({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  return (
    <header className="calendar-head">
      <h2 className="calendar-title" id={id}>
        {title}
      </h2>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Sluiten">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  )
}
