# Dashboard ronde 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een dashboard-hoofdpagina (`#/`) met live kop (klok, begroeting, volgende afspraak, weer), agenda-tijdlijn (dag/week, NU-lijn) en To-do-kaart + snelle actie; de bestaande to-do pagina verhuist naar `#/todo`.

**Architecture:** Eén React-app met een kleine hash-router achter het bestaande pincode-slot. Agenda via een Supabase Edge Function die de geheime iCal-link (afgeschermd in `dashboard_settings`) ophaalt en met ical.js uitvouwt; weer rechtstreeks van Open-Meteo. Pure tijd- en indelingslogica in `src/lib/dayMath.ts`, getest met Vitest.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Supabase (Postgres + Edge Functions/Deno), ical.js 2, Open-Meteo, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-dashboard-ronde1-design.md`

## Global Constraints

- Desktop eerst: ontwerpen en verifiëren op **2560×1440**, daarna 1920×1080, 1280×800, iPad 1024×768/768×1024; telefoon moet blijven werken.
- 12-koloms grid, max-breedte ± 2300 px; ≥ 1800 px: tijdlijn 8 / rechts 4 kolommen; 1280–1800 px: 7 / 5; < 900 px: één kolom.
- Tijdzone altijd `Europe/Amsterdam`. Tijdlijnvenster 07:00–23:00, uitgebreid als afspraken erbuiten vallen.
- Begroeting: 05–12 "Goedemorgen", 12–18 "Goedemiddag", 18–24 "Goedenavond", 00–05 "Goedenacht".
- Verversen: agenda bij openen, `visibilitychange` en elke 5 min; weer bij openen en elke 30 min; NU-lijn elke 30 s; klok elke seconde.
- Ronde 1 toont alleen wat werkt: geen tegels voor Doelen/Financiën/Notities/Projecten (wel grid + tegelstijl die dat later toelaat).
- Alle UI-tekst Nederlands; bestaande stijl-tokens (`--card`, `--accent`, `--font-display` …), licht/donker en dag/nacht-schuifje.
- Geen geheimen in de repo: iCal-link alleen in `dashboard_settings` (RLS, eigenaar).
- To-do pagina: gedrag ongewijzigd (alleen verplaatst + "← Dashboard").
- Testen in de browser via de `dev`-config (poort 5174, Supabase) of `dev-local` (5175, zonder login); nooit met Ilans echte pincode inloggen.

## Review Focus

- Afspraak over middernacht of meerdaags → in de dagweergave afgekapt tot de dag, niet weggelaten of buiten het raster (test in Task 1).
- Afspraak van 0 minuten of korter dan 20 min → minimaal leesbaar blok (20 min hoog) (test in Task 1).
- Drie of meer overlappende afspraken → elk een eigen kolom, geen overlap (test in Task 1).
- Zomer→wintertijd (zo 25 okt 2026): wekelijkse afspraak 09:00 blijft 09:00 lokale tijd (test in Task 3).
- Verlopen/ongeldige iCal-link (Google geeft 404/HTML) → `fetch_failed`/`parse_failed`, geen crash; dialoog toont fout (test in Task 3 + 4).

---

### Task 1: Vitest + pure dag-logica (`dayMath`)

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `src/lib/calendarTypes.ts`, `src/lib/dayMath.ts`
- Test: `src/lib/dayMath.test.ts`

**Interfaces:**
- Produces:
  - `type CalEvent = { id: string; title: string; start: string; end: string; allDay: boolean; location?: string }` (ISO-tijden; hele dag: start = 00:00, end = 00:00 dag erna) in `calendarTypes.ts`
  - `greeting(date: Date): 'Goedemorgen' | 'Goedemiddag' | 'Goedenavond' | 'Goedenacht'`
  - `formatCountdown(ms: number): string` — `"over 1u 14m"`, `"over 1u"`, `"over 5m"`, `"over minder dan 1m"`
  - `headline(events: CalEvent[], now: Date): { kind: 'next' | 'ongoing' | 'none'; event?: CalEvent }` — eerstvolgende niet-hele-dag afspraak van vandaag die nog niet begonnen is; anders lopende; anders `none`
  - `dayWindow(events: CalEvent[], day: Date): { startMin: number; endMin: number }` — standaard 420–1380, uitgebreid naar hele uren
  - `layoutDay(events: CalEvent[], day: Date): Array<{ event: CalEvent; startMin: number; endMin: number; column: number; columns: number }>` — alleen niet-hele-dag, afgekapt tot de dag, minimale duur 20 min
  - `weekDays(now: Date): Date[]` — 7 datums ma–zo, middernacht lokaal
  - `colorIndex(title: string): number` — 0–5, stabiel per titel

- [ ] **Step 1: Write the failing tests** in `src/lib/dayMath.test.ts`:
  - `greeting`: 04:59 → Goedenacht, 05:00 → Goedemorgen, 11:59 → Goedemorgen, 12:00 → Goedemiddag, 18:00 → Goedenavond.
  - `formatCountdown`: `74*60e3` → `"over 1u 14m"`, `60*60e3` → `"over 1u"`, `5*60e3` → `"over 5m"`, `30e3` → `"over minder dan 1m"`.
  - `headline` (now = 2026-10-05T10:16 lokaal): events Werk 09:00–12:00, Overleg 11:30–12:30 → `{kind:'next', event: Overleg}`; alleen Werk → `{kind:'ongoing', event: Werk}`; alleen hele-dag → `{kind:'none'}`; afspraak morgen → `{kind:'none'}`.
  - `layoutDay`: drie afspraken 10:00–11:00, 10:15–10:45, 10:30–11:30 → columns 3, unieke kolommen 0/1/2; afspraak 22:30–01:00 (dag erna) → `endMin` 1440; afspraak 12:00–12:00 → `endMin - startMin === 20`; hele-dag wordt overgeslagen.
  - `dayWindow`: geen afspraken → `{420,1380}`; afspraak 06:15–07:00 → `startMin` 360.
  - `weekDays(new Date('2026-10-07T12:00'))` → eerste datum ma 5 okt, laatste zo 11 okt.
  - `colorIndex('Sportschool') === colorIndex('Sportschool')` en binnen 0–5.

- [ ] **Step 2: Run** `npm install -D vitest && npx vitest run src/lib/dayMath.test.ts` — Expected: FAIL (module bestaat niet).

- [ ] **Step 3: Implement `calendarTypes.ts` en `dayMath.ts`** met de signaturen hierboven. `layoutDay`: sorteer op start, groepeer aaneengesloten overlappende afspraken in clusters, ken binnen een cluster de eerste vrije kolom toe; `columns` = max kolommen van het cluster. `colorIndex`: eenvoudige string-hash modulo 6.

- [ ] **Step 4: Run** `npm test` — Expected: alle dayMath-tests PASS. `npx tsc --noEmit -p .` — geen fouten.

- [ ] **Step 5: Commit** `git commit -m "Dashboard: dag-logica + Vitest"`

### Task 2: Router en opsplitsing App.tsx

**Files:**
- Create: `src/lib/router.ts`, `src/components/PinGate.tsx`, `src/pages/TodoPage.tsx`, `src/pages/DashboardPage.tsx` (tijdelijk: titel + link "To-do →")
- Modify: `src/App.tsx` (houdt alleen `App`, `Gate`, router-keuze), `src/styles.css` (knop `.back-button` naast het schuifje)

**Interfaces:**
- Produces:
  - `type Route = '/' | '/todo'`; `useHashRoute(): Route` (onbekend → `'/'`); `navigate(route: Route): void` (zet `location.hash`)
  - `PinGate({ uid, onLogout, children }: { uid: string; onLogout: () => void; children: (ctx: { onLock?: () => void; onSetPin: () => void; onLogout: () => void }) => ReactNode })` — huidig gedrag 1-op-1
  - `TodoPage(props: { onLock?: () => void; onSetPin?: () => void; onLogout?: () => void })` — de huidige `Board`, plus `← Dashboard`-knop die `navigate('/')` aanroept
  - `DashboardPage(props: same as TodoPage)`

- [ ] **Step 1: Verplaats** `Board` (en de helpers erboven: `insertSorted`, `collisionDetection`, drop-animaties, `overlayWidth`, `keepGrabInCard`) naar `src/pages/TodoPage.tsx` als `TodoPage`; `PinGate` naar `src/components/PinGate.tsx` met render-prop `children`. Geen gedragswijziging.
- [ ] **Step 2: Implement** `router.ts` (`hashchange`-listener) en kies in `App`/`Gate` de pagina op basis van `useHashRoute()` (zonder Supabase: zelfde router zonder PinGate).
- [ ] **Step 3: Voeg** `← Dashboard` toe op de to-do pagina: `position: fixed`, links naast het dag/nacht-schuifje (de Afgerond-knop schuift op), zelfde stijl als `.history-button`.
- [ ] **Step 4: Verify** `npx tsc --noEmit -p . && npm test && npm run build`; in de browser (`dev-local`, 1280×800 en mobile): `#/todo` toont de to-do pagina; slepen naar Gedaan, vegen, notities en ster werken; `← Dashboard` gaat naar `#/` en terug.
- [ ] **Step 5: Commit** `git commit -m "Router: dashboard (#/) en to-do pagina (#/todo); App.tsx opgesplitst"`

### Task 3: Agenda — database, Edge Function en uitvouwlogica

**Files:**
- Create: `supabase/migrations/004_dashboard_settings.sql`, `supabase/functions/dashboard-calendar/expand.ts`, `supabase/functions/dashboard-calendar/index.ts`
- Test: `supabase/functions/dashboard-calendar/expand.test.ts` (Vitest), fixtures `supabase/functions/dashboard-calendar/fixtures/*.ics`
- Modify: `package.json` (devDependency `ical.js@^2`), `vitest`-config zodat `supabase/functions/**/*.test.ts` meedoet

**Interfaces:**
- Consumes: `CalEvent` (Task 1; `expand.ts` definieert dezelfde vorm lokaal — Edge Functions kunnen `src/` niet importeren)
- Produces:
  - Tabel `public.dashboard_settings(user_id uuid pk default auth.uid() references auth.users on delete cascade, ical_url text, city_name text, latitude double precision, longitude double precision, updated_at timestamptz default now())`, RLS policy `to authenticated using/with check (user_id = (select auth.uid()))`, `revoke all from anon`
  - `expandEvents(ICAL: typeof import('ical.js').default, ics: string, rangeStart: Date, rangeEnd: Date): CalEvent[]` — gesorteerd op start; gooit `Error('parse_failed')` bij ongeldige ICS
  - Edge Function `dashboard-calendar` (`verify_jwt: true`): `POST {}` → `{ events, fetchedAt }`; `POST { testUrl }` → `{ ok: true, count }` of `{ ok: false, error }`; fouten `{ error: 'no_calendar' | 'fetch_failed' | 'parse_failed' }` met status 400/502

- [ ] **Step 1: Write fixtures + failing tests** (`expand.test.ts`, range 5–13 okt 2026 Amsterdam):
  - `single.ics`: één afspraak 5 okt 10:30–11:30 → 1 event, titel klopt, start `2026-10-05T08:30:00.000Z`.
  - `weekly.ics`: elke maandag 09:00–10:00 Europe/Amsterdam vanaf 7 sep 2026 met EXDATE 12 okt → event op 5 okt (07:00Z), geen op 12 okt.
  - `dst.ics`: elke zondag 09:00 Europe/Amsterdam; range 18 okt–2 nov → 18 okt `07:00Z`, 25 okt `08:00Z`, 1 nov `08:00Z` (lokaal steeds 09:00).
  - `override.ics`: wekelijks met RECURRENCE-ID die 5 okt naar 14:00 verplaatst → 5 okt start 12:00Z.
  - `allday.ics`: VALUE=DATE 5 okt → `allDay: true`, start/end lokale middernachten.
  - `'<html>404</html>'` → gooit `parse_failed`.
- [ ] **Step 2: Run** `npm test` — Expected: FAIL (expand.ts bestaat niet).
- [ ] **Step 3: Implement `expandEvents`** met `ICAL.parse` → `Component` → per VEVENT `ICAL.Event`; registreer VTIMEZONE's via `ICAL.TimezoneService`; terugkerende via `event.iterator()` tot `rangeEnd` (max 1000 iteraties), `getOccurrenceDetails` voor overrides; EXDATE wordt door ical.js afgehandeld.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Implement `index.ts`**: CORS zoals `todo-pin-login`; Supabase-client met de Authorization-header van het verzoek; lees `ical_url` (RLS); `fetch` met `AbortSignal.timeout(8000)`, `webcal://` → `https://`; range = begin vandaag Amsterdam (via `Intl.DateTimeFormat` met `timeZone: 'Europe/Amsterdam'`) tot +8 dagen; `import ICAL from 'npm:ical.js@2'`.
- [ ] **Step 6: Apply migratie** via Supabase MCP `apply_migration` (project `ifyexmxsueatoaeoxici`, naam `ilans_todo_lijst_dashboard_settings`), **deploy** functie via `deploy_edge_function` (bestanden `index.ts` + `expand.ts`, `verify_jwt: true`); run `get_advisors` security (geen nieuwe meldingen behalve verwachte INFO).
- [ ] **Step 7: Verify** `curl -X POST .../functions/v1/dashboard-calendar` zonder JWT → 401; met publishable key en `{ testUrl: 'https://example.com/x.ics' }` → 401 (geen sessie). Commit `git commit -m "Agenda: dashboard_settings + Edge Function met iCal-uitvouwing"`

### Task 4: Client-lagen — instellingen, agenda, weer

**Files:**
- Create: `src/lib/settings.ts`, `src/lib/calendar.ts`, `src/lib/weather.ts`
- Test: `src/lib/weather.test.ts`

**Interfaces:**
- Consumes: `CalEvent` (Task 1); Edge Function contract (Task 3)
- Produces:
  - `type DashboardSettings = { icalUrl: string | null; cityName: string | null; latitude: number | null; longitude: number | null }`; `getSettings(): Promise<DashboardSettings>` (lege waarden als er geen rij is); `saveSettings(patch: Partial<DashboardSettings>): Promise<void>` (upsert)
  - `testCalendarUrl(url: string): Promise<{ ok: true; count: number } | { ok: false; error: string }>`
  - `useCalendar(enabled: boolean): { events: CalEvent[]; status: 'loading' | 'ok' | 'stale' | 'none' | 'error'; refresh: () => void }` — cache `localStorage['dashboard.calendar']`; status `none` bij `no_calendar`
  - `type Weather = { temp: number; code: number; max: number; min: number; hourly: { time: string; temp: number; rainChance: number }[] }`; `describeWeather(code: number): { text: string; icon: 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm' }`; `useWeather(lat: number | null, lon: number | null): { weather: Weather | null; stale: boolean }` — cache `localStorage['dashboard.weather']`
  - `searchCity(q: string): Promise<{ name: string; region?: string; country: string; latitude: number; longitude: number }[]>` via `https://geocoding-api.open-meteo.com/v1/search?language=nl&count=5`

- [ ] **Step 1: Write failing tests** `weather.test.ts`: `describeWeather(0).text === 'Zonnig'`, `2 → 'Half bewolkt'`, `3 → 'Bewolkt'`, `45 → 'Mist'`, `61 → 'Regen'`, `71 → 'Sneeuw'`, `95 → 'Onweer'`, onbekende code → `'Wisselend'`.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement** de drie modules. Weer-URL: `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current=temperature_2m,weather_code&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FAmsterdam&forecast_days=1`. Verversingsritmes uit Global Constraints; agenda via `supabase.functions.invoke('dashboard-calendar')`. Beide hooks verversen ook op het `online`-event (na offline direct bijwerken).
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit -p .` — PASS. Commit `git commit -m "Dashboard: instellingen-, agenda- en weerlagen"`

### Task 5: Instellingen-dialoog

**Files:**
- Create: `src/dashboard/SettingsDialog.tsx`; Modify: `src/styles.css`

**Interfaces:**
- Consumes: `getSettings`, `saveSettings`, `testCalendarUrl`, `searchCity` (Task 4)
- Produces: `SettingsDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void })`

- [ ] **Step 1: Implement** native `<dialog>` (zoals `CalendarDialog`): sectie **Agenda** (uitleg-stappen Google Agenda → Instellingen → je agenda → "Geheim adres in iCal-indeling"; plakveld; "Testen en opslaan" roept eerst `testCalendarUrl`, slaat alleen op bij `ok`, toont "Gekoppeld: N afspraken deze week"; opgeslagen link gemaskeerd `https://calendar.google.com/…/basic.ics` met knoppen "Vervangen" en "Ontkoppelen"); sectie **Woonplaats** (zoekveld met resultatenlijst, kiezen = `saveSettings`). Foutteksten: "Deze link werkt niet. Controleer of je het geheime iCal-adres hebt gekopieerd."
- [ ] **Step 2: Verify** in browser (`dev` 5174, nep-sessie zoals bij eerdere pincode-tests): dialoog opent/sluit, stad zoeken toont resultaten, ongeldige link → foutmelding, geen opslag. `npx tsc --noEmit -p .`
- [ ] **Step 3: Commit** `git commit -m "Dashboard: instellingen voor agenda-link en woonplaats"`

### Task 6: Live kop (`TodayHeader`)

**Files:**
- Create: `src/dashboard/TodayHeader.tsx`, `src/dashboard/WeatherIcon.tsx`; Modify: `src/styles.css`

**Interfaces:**
- Consumes: `greeting`, `formatCountdown`, `headline` (Task 1); `Weather`, `describeWeather` (Task 4)
- Produces: `TodayHeader({ events, calendarStatus, weather, weatherStale, onOpenSettings }: { events: CalEvent[]; calendarStatus: string; weather: Weather | null; weatherStale: boolean; onOpenSettings: () => void })`

- [ ] **Step 1: Implement**: klok per seconde (`Intl.DateTimeFormat('nl-NL', { weekday:'long', day:'numeric', month:'long' })` + `HH:mm`), begroeting + "!", regel "Volgende afspraak: 11:30 · Projectoverleg · over 1u 14m" / "Nu bezig: Werk tot 12:00" / "Geen afspraken meer vandaag" / bij status `none` "Koppel je agenda →" (opent instellingen). Weer rechts: `WeatherIcon` (inline SVG per `icon`, cozy kleuren), temperatuur groot, omschrijving, max/min, 4 uren vooruit; zonder woonplaats "Stel je woonplaats in". Tandwiel-knop rechtsboven. "niet bijgewerkt"-label bij stale.
- [ ] **Step 2: Verify** in browser op 2560×1440 met vaste testdata (tijdelijk via `localStorage`-cache): teksten kloppen, klok tikt, aftellen wisselt per minuut. Commit `git commit -m "Dashboard: live kop met klok, volgende afspraak en weer"`

### Task 7: Tijdlijn (dag/week, NU-lijn)

**Files:**
- Create: `src/dashboard/Timeline.tsx`; Modify: `src/styles.css`

**Interfaces:**
- Consumes: `layoutDay`, `dayWindow`, `weekDays`, `colorIndex` (Task 1)
- Produces: `Timeline({ events, status, onConnect }: { events: CalEvent[]; status: 'loading' | 'ok' | 'stale' | 'none' | 'error'; onConnect: () => void })`

- [ ] **Step 1: Implement**: schakelaar Dag/Week (onthouden in `localStorage['dashboard.view']`); dag = uurraster (px per minuut zodat 07–23 ± 560 px vult, scrollbaar bij uitbreiding), blokken `top/height` uit `layoutDay`, breedte = 1/columns, kleur uit 6 cozy-tinten via `colorIndex`; hele-dag-labels boven het raster; NU-lijn (koraal, label "NU hh:mm") elke 30 s; bij openen `scrollIntoView` naar NU. Week = 7 kolommen ma–zo, vandaag uitgelicht, zelfde blokken compact (alleen titel). Lege staten: `none` → "Koppel je agenda →"; `error` zonder cache → "Agenda ophalen lukte niet · Opnieuw proberen"; geen afspraken → "Niks in je agenda vandaag".
- [ ] **Step 2: Verify** in browser 2560×1440 en 1280×800 met fixture-data: overlap naast elkaar, NU-lijn op juiste hoogte, week toont 7 kolommen, scrollt naar NU. Commit `git commit -m "Dashboard: tijdlijn met dag/week en NU-lijn"`

### Task 8: To-do-kaart + snelle actie, dashboard-indeling en oplevering

**Files:**
- Create: `src/dashboard/TodoSummaryCard.tsx`, `src/dashboard/Tile.tsx`; Modify: `src/pages/DashboardPage.tsx`, `src/styles.css`, `README.md`

**Interfaces:**
- Consumes: `store` + realtime-patroon uit `TodoPage` (Task 2), `useCalendar`, `useWeather`, `getSettings` (Task 4), `SettingsDialog` (5), `TodayHeader` (6), `Timeline` (7), `navigate` (2)
- Produces: `Tile({ icon, title, value, line, onOpen }: { icon: ReactNode; title: string; value: string; line?: string; onOpen: () => void })` — herbruikbare onderwerp-tegel (grote illustratie ± 96 px, trading-card stijl) voor latere rondes

- [ ] **Step 1: Implement `TodoSummaryCard`** met `Tile`-stijl: "N open", bovenste favoriet (anders bovenste taak), "Bekijk alles →" (`navigate('/todo')`, hele kaart klikbaar); daaronder snelle actie (invoer + toevoegen via `store.create` met positie bovenaan, zoals `TodoPage.add`); live bijwerken via Supabase realtime + `visibilitychange`.
- [ ] **Step 2: Implement `DashboardPage`**: 12-koloms grid volgens Global Constraints (rij 1 kop 12 kol.; rij 2 tijdlijn 8/7 + rechterkolom 4/5; rij 3 nog leeg), tandwiel → `SettingsDialog`, `onSaved` ververst agenda/weer. Footer "Meer…" met Vergrendelen/Pincode wijzigen/Uitloggen zoals op de to-do pagina.
- [ ] **Step 3: Verify** in browser, in volgorde 2560×1440 → 1920×1080 → 1280×800 → iPad 1024×768 en 768×1024 → mobile: indeling, geen horizontale scroll, To-do-kaart → `#/todo` → `← Dashboard`, snelle actie voegt taak toe (zichtbaar op beide pagina's), lege staten zonder agenda/woonplaats. Regressie to-do pagina (slepen, vegen, pincode). `npm test && npx tsc --noEmit -p . && npm run build`.
- [ ] **Step 4: README** bijwerken (dashboard, instellingen, agenda-link vinden). Commit + push; wacht op GitHub Pages-deploy (`gh run watch`), controleer live versie (`data-build`).
