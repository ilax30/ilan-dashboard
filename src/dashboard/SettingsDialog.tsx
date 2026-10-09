import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { PageControls } from '../components/PinGate'
import { getSettings, saveSettings, testCalendarUrl, type DashboardSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { searchCity, type CityResult } from '../lib/weather'
import { backdropClose } from '../lib/dialogBackdrop'

type Props = { open: boolean; onClose: () => void; onSaved: () => void; /** Vergrendelen, pincode, uitloggen (alleen met inloggen). */ account?: PageControls }

const LINK_ERROR = 'Deze link werkt niet. Controleer of je het geheime iCal-adres hebt gekopieerd.'

/** Laat alleen het domein en de bestandsnaam zien: de rest van de link is geheim. */
function maskUrl(url: string): string {
  try {
    const u = new URL(url.replace(/^webcal:\/\//i, 'https://'))
    const file = u.pathname.split('/').filter(Boolean).pop() ?? ''
    return `${u.origin}/…/${file}`
  } catch {
    return '••••••••'
  }
}

/** Instellingen: geheime agenda-link, woonplaats voor het weer en je account (vergrendelen, pincode, uitloggen). */
export function SettingsDialog({ open, onClose, onSaved, account }: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [settings, setSettings] = useState<DashboardSettings | null>(null)
  const [loadError, setLoadError] = useState(false)

  // Agenda
  const [replacing, setReplacing] = useState(false)
  const [link, setLink] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkMsg, setLinkMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Woonplaats
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityResult[] | null>(null)
  const [cityBusy, setCityBusy] = useState(false)
  const [cityError, setCityError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setSettings(null)
      setLoadError(false)
      setReplacing(false)
      setLink('')
      setLinkMsg(null)
      setQuery('')
      setResults(null)
      setCityError(null)
      getSettings()
        .then(setSettings)
        .catch(() => setLoadError(true))
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function onTestLink(e: FormEvent) {
    e.preventDefault()
    const url = link.trim()
    if (!url) return
    setLinkBusy(true)
    setLinkMsg(null)
    try {
      const result = await testCalendarUrl(url)
      if (!result.ok) {
        setLinkMsg({ ok: false, text: LINK_ERROR })
        return
      }
      await saveSettings({ icalUrl: url })
      setSettings((s) => (s ? { ...s, icalUrl: url } : s))
      setReplacing(false)
      setLink('')
      setLinkMsg({
        ok: true,
        text: `Gekoppeld: ${result.count} ${result.count === 1 ? 'afspraak' : 'afspraken'} in de komende 5 weken`,
      })
      onSaved()
    } catch {
      setLinkMsg({ ok: false, text: 'Opslaan is niet gelukt. Probeer het nog eens.' })
    } finally {
      setLinkBusy(false)
    }
  }

  async function onUnlink() {
    setLinkBusy(true)
    setLinkMsg(null)
    try {
      await saveSettings({ icalUrl: null })
      setSettings((s) => (s ? { ...s, icalUrl: null } : s))
      onSaved()
    } catch {
      setLinkMsg({ ok: false, text: 'Ontkoppelen is niet gelukt. Probeer het nog eens.' })
    } finally {
      setLinkBusy(false)
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault()
    setCityBusy(true)
    setCityError(null)
    try {
      setResults(await searchCity(query))
    } catch {
      setResults(null)
      setCityError('Zoeken is niet gelukt. Controleer je verbinding.')
    } finally {
      setCityBusy(false)
    }
  }

  async function onPickCity(city: CityResult) {
    setCityBusy(true)
    setCityError(null)
    const patch = { cityName: city.name, latitude: city.latitude, longitude: city.longitude }
    try {
      await saveSettings(patch)
      setSettings((s) => (s ? { ...s, ...patch } : s))
      setResults(null)
      setQuery('')
      onSaved()
    } catch {
      setCityError('Opslaan is niet gelukt. Probeer het nog eens.')
    } finally {
      setCityBusy(false)
    }
  }

  const showLinkForm = settings !== null && (!settings.icalUrl || replacing)

  return (
    <dialog
      ref={dialogRef}
      className="calendar settings"
      aria-labelledby="settings-title"
      onClose={onClose}
      // Esc: meteen bijwerken via "cancel" (het "close"-event kan later of niet komen).
      onCancel={onClose}
      {...backdropClose(onClose)}
    >
      <div className="calendar-inner">
        <header className="calendar-head">
          <div>
            <h2 className="calendar-title" id="settings-title">
              Instellingen
            </h2>
            <p className="drawer-sub">Je agenda en woonplaats voor het dashboard</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Sluiten">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {loadError ? (
          <p className="settings-msg" data-ok="false">
            Instellingen laden is niet gelukt. Sluit en probeer het opnieuw.
          </p>
        ) : settings === null ? (
          <p className="drawer-sub">Laden…</p>
        ) : (
          <div className="settings-body">
            <section className="settings-section" aria-labelledby="settings-agenda">
              <h3 className="settings-heading" id="settings-agenda">
                Agenda
              </h3>
              {!supabase ? (
                <p className="drawer-sub">De agenda werkt alleen in de online versie.</p>
              ) : showLinkForm ? (
                <>
                  <ol className="settings-steps">
                    <li>Open Google Agenda op de computer en ga naar Instellingen (tandwiel).</li>
                    <li>Kies links onder "Instellingen voor mijn agenda's" je agenda.</li>
                    <li>
                      Kopieer bij "Agenda integreren" het <strong>Geheim adres in iCal-indeling</strong>.
                    </li>
                  </ol>
                  <form className="settings-row" onSubmit={onTestLink}>
                    <input
                      className="settings-input"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                      aria-label="Geheim iCal-adres"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                    />
                    <button className="settings-button" type="submit" disabled={linkBusy || !link.trim()}>
                      {linkBusy ? 'Testen…' : 'Testen en opslaan'}
                    </button>
                    {replacing && (
                      <button className="settings-button" data-variant="ghost" type="button" onClick={() => setReplacing(false)}>
                        Annuleren
                      </button>
                    )}
                  </form>
                </>
              ) : (
                <div className="settings-row">
                  <code className="settings-masked">{maskUrl(settings.icalUrl!)}</code>
                  <button className="settings-button" data-variant="ghost" type="button" onClick={() => setReplacing(true)}>
                    Vervangen
                  </button>
                  <button className="settings-button" data-variant="ghost" type="button" disabled={linkBusy} onClick={onUnlink}>
                    Ontkoppelen
                  </button>
                </div>
              )}
              {linkMsg && (
                <p className="settings-msg" data-ok={linkMsg.ok} role="status">
                  {linkMsg.text}
                </p>
              )}
            </section>

            <section className="settings-section" aria-labelledby="settings-city">
              <h3 className="settings-heading" id="settings-city">
                Woonplaats
              </h3>
              <p className="drawer-sub">
                {settings.cityName ? (
                  <>
                    Het weer is voor <strong>{settings.cityName}</strong>.
                  </>
                ) : (
                  'Nog geen woonplaats: kies er een voor het weer.'
                )}
              </p>
              <form className="settings-row" onSubmit={onSearch}>
                <input
                  className="settings-input"
                  type="search"
                  autoComplete="off"
                  placeholder="Zoek je woonplaats"
                  aria-label="Woonplaats zoeken"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="settings-button" type="submit" disabled={cityBusy || query.trim().length < 2}>
                  Zoeken
                </button>
              </form>
              {results && (
                <ul className="settings-results">
                  {results.length === 0 && <li className="drawer-sub">Geen plaatsen gevonden.</li>}
                  {results.map((city) => (
                    <li key={`${city.latitude},${city.longitude}`}>
                      <button className="settings-result" type="button" disabled={cityBusy} onClick={() => onPickCity(city)}>
                        <span className="settings-result-name">{city.name}</span>
                        <span className="settings-result-meta">
                          {[city.region, city.country].filter(Boolean).join(', ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {cityError && (
                <p className="settings-msg" data-ok="false" role="status">
                  {cityError}
                </p>
              )}
            </section>
          </div>
        )}

        {account && (
          <section className="settings-section" aria-labelledby="settings-account">
            <h3 className="settings-heading" id="settings-account">
              Account
            </h3>
            <div className="settings-row">
              {account.onLock && (
                <button
                  className="settings-button"
                  data-variant="ghost"
                  type="button"
                  onClick={() => {
                    onClose()
                    account.onLock?.()
                  }}
                >
                  Vergrendelen
                </button>
              )}
              <button
                className="settings-button"
                data-variant="ghost"
                type="button"
                onClick={() => {
                  onClose()
                  account.onSetPin()
                }}
              >
                Pincode wijzigen
              </button>
              {/* Uitloggen is zelden nodig: twee keer klikken, zodat het niet per ongeluk gebeurt. */}
              <button
                className="settings-button"
                data-variant="ghost"
                type="button"
                onClick={() => {
                  if (confirmLogout) return account.onLogout()
                  setConfirmLogout(true)
                  window.setTimeout(() => setConfirmLogout(false), 4000)
                }}
              >
                {confirmLogout ? 'Zeker? Klik nogmaals' : 'Uitloggen'}
              </button>
            </div>
          </section>
        )}
      </div>
    </dialog>
  )
}
