# Dashboard ronde 2 Implementation Plan (herzien)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nieuwe look (Zandsteen licht / diep-blauw donker, landschap per dagdeel, zijbalk), zes verplaatsbare tegels op vaste plekken (groot/middel/klein) en een agendavenster met Dag/Week/Maand.

**Architecture:** App-schil met `Sidebar` rond alle pagina's. Dashboard = kop + 6 plekken; de indeling (`src/lib/layout.ts`, pure functies + opslag in `dashboard_settings.layout` en localStorage) bepaalt welke tegel (`src/dashboard/widgets/*`) in welke maat rendert. Aanpas-stand ruilt plekken met dnd-kit. Landschap en dagvoortgang uit pure functies in `src/lib/dayPart.ts`.

**Tech Stack:** Vite 8, React 19, TypeScript 7, @dnd-kit, Supabase (Postgres + Edge Functions), Open-Meteo, Vitest (TZ=Europe/Amsterdam).

**Spec:** `docs/superpowers/specs/2026-10-05-dashboard-ronde2-design.md` (herzien, `b4ec286`)

## Global Constraints

- 2560×1440 en 1920×1080 **zonder scrollen**; 1280×800, iPad 1024×768 / 768×1024, telefoon 375 — nooit horizontale scroll.
- Zijbalk 240 px (≥ 1280), 72 px icoontjes (900–1280), menuknop + laag (< 900). Plekken: groot 8 kol., middel 4 kol., klein 4 × 3 kol.
- Kleuren exact als de tabel in de spec (startwaarden); terracotta accent; tekst minimaal WCAG AA.
- Standaardindeling: groot `agenda`, middel `todo`, klein `financien`, `doelen`, `notities`, `projecten`.
- Dagvoortgang 07:00–23:00. Dagdelen: ochtend `op−45 … op+90`, avond `onder−90 … onder+45`, fallback 07:00/19:00.
- Alle UI-tekst Nederlands; geen geheimen in repo/localStorage; testen alleen met nep-sessies / `dev-local`.
- To-do pagina: gedrag ongewijzigd (alleen zijbalk erbij, vaste knoppen linksboven verhuizen).

## Review Focus

- Opgeslagen indeling met een dubbele of onbekende tegel (oude versie, handmatig gewijzigd) → geldige indeling, elke tegel precies één keer (test Task 6).
- Zonsondergang 16:30 in december → om 17:00 al "avond", om 18:00 "nacht" (test Task 5).
- Afvinken in de To-do-tegel terwijl offline → taak komt terug + melding, niet stil verdwenen (browser Task 9).
- Slepen op de iPad in aanpas-stand naast gewoon scrollen → geen per-ongeluk ruilen buiten de aanpas-stand (browser Task 11).
- Lange titels (afspraak/taak 80 tekens) in kleine tegels → afgekapt met …, geen overloop (browser Task 9).

---

### Task 1: Datumlogica — KLAAR (`9a9d6a2`)
`upcoming`, `stripPosition`, `monthGrid`, `eventsOnDay` in `src/lib/dayMath.ts` (getest).

### Task 2: Agenda-functie 5 weken — KLAAR (`c33647f`, live v4)

### Task 3: Onderwerpen — routes, tegel-definities, lege pagina — KLAAR (`c790d95`)
`Route` + 4 routes (getest), `TOPICS`/`Topic`/`topicFor` in `src/dashboard/topics.tsx`, `TopicPage`, `Tile` `muted`.

### Task 4: Thema's Zandsteen en diep-blauw

**Files:** Modify `src/styles.css` (`:root`, beide donker-blokken, `--tint-*`, `--now`, `--blob`), `index.html` + `src/components/ThemeToggle.tsx` (theme-color `#CBBFAE` / `#1C2430`)

- [ ] **Step 1:** Tokens vervangen door de spec-tabel; overige afgeleide tokens (`--accent-ink`, `--accent-soft`, `--shadow*`, glans-tokens, `--track`) passend bij elk thema.
- [ ] **Step 2: Verify** browser (`dev-local`) licht en donker: to-do pagina en dashboard leesbaar; contrast `--muted` op `--card` ≥ 4.5:1 (berekend in JS). `npm test && npx tsc --noEmit -p .`
- [ ] **Step 3: Commit** `Thema's: Zandsteen licht en diep-blauw donker`

### Task 5: Dagdelen, dagvoortgang en landschap

**Files:** Create `src/lib/dayPart.ts`, `src/lib/dayPart.test.ts`, `src/components/Landscape.tsx`; Modify `src/lib/weather.ts`, `src/lib/weather.test.ts`, `src/styles.css`, `src/App.tsx`

**Interfaces:**
- Produces:
  - `type DayPart = 'ochtend' | 'dag' | 'avond' | 'nacht'`
  - `dayPart(now: Date, sunrise: Date | null, sunset: Date | null): DayPart` (fallback 07:00/19:00 van `now`)
  - `dayProgress(now: Date): number` — 0–100, 07:00–23:00, afgerond op heel getal
  - `Weather` krijgt `sunrise: string | null; sunset: string | null` (ISO-lokale tijd uit `daily.sunrise[0]`/`daily.sunset[0]`); forecast-URL + `daily=…,sunrise,sunset`
  - `Landscape()` — vaste laag achter alles (`position: fixed; inset: 0; z-index: 0`), dagdeel uit `useWeather`-cache (`dashboard.weather`) of fallback, elke minuut herberekend; dev-override `?dagdeel=` alleen als `import.meta.env.DEV`. Vervangt `Blobs` in `App`.

- [ ] **Step 1: Failing tests** `dayPart.test.ts`: zon op 07:30 / onder 19:00 (5 okt): 06:30 → `ochtend`, 06:44 → `nacht`, 09:00 → `ochtend`, 09:01 → `dag`, 17:30 → `avond`, 19:45 → `avond`, 19:46 → `nacht`; december op 08:45 / onder 16:30: 17:00 → `avond`, 18:00 → `nacht`; zonder zonnetijden: 06:30 → `ochtend`, 12:00 → `dag`, 18:00 → `avond`, 23:00 → `nacht`. `dayProgress`: 06:00 → 0, 07:00 → 0, 15:00 → 50, 23:30 → 100. `weather.test.ts`: `parseForecast` met `daily.sunrise: ['2026-10-05T07:58']`, `sunset: ['2026-10-05T19:05']` → `sunrise: '2026-10-05T07:58'`; zonder → `null`.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement**; landschap: SVG lucht (`--sky`), zon/maan, sterren (nacht), 3 heuvellagen, bomen; kleuren per dagdeel via `data-dagdeel` op `.landscape` en CSS-variabelen, `transition: 60s`; donker thema dimt.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit -p .` — PASS; browser `?dagdeel=` alle vier, licht en donker.
- [ ] **Step 5: Commit** `Landschap per dagdeel en dagvoortgang`

### Task 6: Indeling — model, normaliseren, opslaan

**Files:** Create `src/lib/layout.ts`, `src/lib/layout.test.ts`, `supabase/migrations/005_dashboard_layout.sql`; Modify `src/lib/settings.ts`

**Interfaces:**
- Produces:
  - `type WidgetId = 'agenda' | 'todo' | 'doelen' | 'financien' | 'notities' | 'projecten'`, `type SlotSize = 'groot' | 'middel' | 'klein'`
  - `type Layout = { groot: WidgetId; middel: WidgetId; klein: [WidgetId, WidgetId, WidgetId, WidgetId] }`, `DEFAULT_LAYOUT`
  - `type SlotRef = 'groot' | 'middel' | 0 | 1 | 2 | 3` (getal = klein-index)
  - `swapSlots(layout: Layout, a: SlotRef, b: SlotRef): Layout` (nieuw object; a === b → zelfde inhoud)
  - `normalizeLayout(raw: unknown): Layout` — onbekend/dubbel/ontbrekend → aangevuld in `DEFAULT_LAYOUT`-volgorde
  - `useLayout(): { layout: Layout; setLayout: (l: Layout) => void }` — start uit `localStorage['dashboard.layout']`, daarna server (`getSettings`), opslaan lokaal + `saveSettings({ layout })`; mislukt → `localStorage['dashboard.layout.pending']='1'`, opnieuw bij `online`/zichtbaar.
  - `DashboardSettings` krijgt `layout: unknown | null`; migratie: `alter table public.dashboard_settings add column if not exists layout jsonb;`

- [ ] **Step 1: Failing tests** `layout.test.ts`: `swapSlots(DEFAULT_LAYOUT, 'groot', 1)` → `groot: 'doelen'`, `klein[1]: 'agenda'`; `swapSlots(DEFAULT_LAYOUT, 'middel', 'middel')` gelijk aan default; `normalizeLayout(null)` = default; `normalizeLayout({ groot: 'todo', middel: 'todo', klein: ['x', 'agenda'] })` → `groot: 'todo'`, elke WidgetId precies één keer, `klein.length === 4`; `normalizeLayout('kapot')` = default.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement**; migratie toepassen (`apply_migration` `ilans_todo_lijst_dashboard_layout`), advisors checken.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** `Indeling: model, normaliseren en opslaan`

### Task 7: Zijbalk en app-schil

**Files:** Create `src/components/Sidebar.tsx`; Modify `src/App.tsx`, `src/pages/TodoPage.tsx`, `src/pages/TopicPage.tsx`, `src/pages/DashboardPage.tsx`, `src/components/ThemeToggle.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `Route`, `navigate`, `TOPICS`, `MoreFooter`-inhoud, `SettingsDialog`, `store`
- Produces: `Sidebar({ route, controls, onOpenAgenda, onOpenSettings }: { route: Route; controls?: PageControls; onOpenAgenda: () => void; onOpenSettings: () => void })`; `App` rendert `<div className="shell"><Sidebar/><main className="shell-main">{page}</main></div>` + `AgendaDialog`/`SettingsDialog` op app-niveau (agendavenster volgt in Task 10; tot dan opent "Agenda" de dashboard-tijdlijn niet — knop zonder actie is niet toegestaan, dus tijdelijk navigeren naar `#/`).
- [ ] **Step 1: Implement** zijbalk volgens spec (nav + uitgelicht, snel toevoegen taak, schuifje, Instellingen, Meer…); `.back-button` en losse `.theme-toggle`-positie weg; `.history-button` en andere vaste knoppen op de to-do pagina verschoven naar binnen `.shell-main`; < 900 menuknop + laag (Esc/klik buiten sluit).
- [ ] **Step 2: Verify** browser alle maten; to-do pagina: toevoegen, slepen naar Gedaan, geschiedenis-knop; onderwerp-pagina's; Meer… werkt (nep-sessie). `npm test && npx tsc --noEmit -p .`
- [ ] **Step 3: Commit** `Zijbalk op alle pagina's`

### Task 8: Kop en weerkaart

**Files:** Modify `src/dashboard/TodayHeader.tsx`, `src/styles.css`; Create `src/dashboard/WeatherCard.tsx`

**Interfaces:**
- Consumes: `dayProgress` (Task 5), bestaande `greeting/headline/formatCountdown`, `Weather`
- Produces: `TodayHeader({ events, calendarStatus, onOpenSettings, editing, onToggleEditing })` (weer eruit); `WeatherCard({ weather, stale, hasCity, onOpenSettings })`
- [ ] **Step 1: Implement**: voortgangsbalk "N% van je dag" (elke minuut); knop "Indeling aanpassen" / "Klaar" rechtsboven (`aria-pressed`); weerkaart met icoon, temp, omschrijving, max/min, 4 uren.
- [ ] **Step 2: Verify** `npx tsc --noEmit -p .`; browser teksten.
- [ ] **Step 3: Commit** `Kop met dagvoortgang en weerkaart`

### Task 9: Tegels per maat

**Files:** Create `src/dashboard/widgets/AgendaWidget.tsx`, `TodoWidget.tsx`, `TopicWidget.tsx`, `src/dashboard/DayStrip.tsx`; Modify `src/dashboard/Timeline.tsx`, `src/styles.css`; Delete `src/dashboard/TodoSummaryCard.tsx` (vervangen)

**Interfaces:**
- Consumes: `upcoming`, `stripPosition`, `layoutDay`, `dayWindow`, `colorIndex` (Task 1), `Timeline`, `TOPICS`, `store`, `compareTodos`
- Produces:
  - `type WidgetProps = { size: SlotSize; onOpen: () => void }`
  - `DayStrip({ events, now }: { events: CalEvent[]; now: Date })` (dagbalk 07–23, blokjes, NU)
  - `AgendaWidget(props: WidgetProps & { events; status; onConnect; onRetry })` — klein/middel/groot volgens spec; groot = `Timeline` met eigen Vandaag/Week.
  - `TodoWidget(props: WidgetProps)` — klein/middel/groot; vinkje → `store.update(id, { done_at })`, 5 s "Ongedaan maken" (`done_at: null`), fout → terugzetten + "Opslaan mislukt"; realtime + `visibilitychange` zoals `TodoSummaryCard`; groot met invoer (positie bovenaan).
  - `TopicWidget(props: WidgetProps & { topic: Topic })`
- [ ] **Step 1: Implement**; titels afkappen met ellipsis; klikbare tegel als `role="link"`-knop, vinkjes/invoer stoppen propagatie.
- [ ] **Step 2: Verify** browser elke tegel in elke maat (tijdelijke testindeling via localStorage), lange titels, afvinken + ongedaan maken (5175), offline afvinken (DevTools offline) → terug + melding. `npm test && npx tsc --noEmit -p .`
- [ ] **Step 3: Commit** `Tegels in drie maten`

### Task 10: Agendavenster met Dag / Week / Maand

**Files:** Create `src/dashboard/AgendaDialog.tsx`, `src/dashboard/MonthView.tsx`, `src/dashboard/agendaNav.ts`, `src/dashboard/agendaNav.test.ts`; Modify `src/dashboard/Timeline.tsx`, `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `monthGrid`, `eventsOnDay`, `weekDays`, `colorIndex` (Task 1); `useCalendar`
- Produces:
  - `canStep(view: 'day' | 'week', anchor: Date, dir: -1 | 1, now: Date): boolean`, `step(view, anchor, dir): Date` — bereik `monthGrid(now)[0] … [34]`
  - `Timeline` krijgt optioneel gestuurde `view`/`anchor` (+ `hideHeader`); NU alleen op vandaag; scroll naar nu (of 08:00) alleen bij mount/wijziging `view`/`anchor`
  - `MonthView({ events, now, onPickDay })`
  - `AgendaDialog({ open, onClose, events, status, onConnect, onRetry })`
- [ ] **Step 1: Failing tests** `agendaNav.test.ts` (now = wo 7 okt 2026 12:00): `canStep('day', ma 5 okt, -1)` false; `canStep('day', zo 8 nov, 1)` false; `canStep('day', 7 okt, 1)` true; `step('day', 7 okt, 1)` = 8 okt 00:00; `canStep('week', 5 okt, -1)` false; `canStep('week', 2 nov, 1)` false; `step('week', 5 okt, 1)` = 12 okt; `step('day', 25 okt, 1)` = 26 okt 00:00.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement** volgens spec "Agendavenster"; `useCalendar` naar app-niveau zodat dashboard en venster dezelfde gegevens delen; zijbalk "Agenda" opent het venster.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit -p .` — PASS; browser: openen/sluiten (Esc, ×, buiten), Maand 35 cellen, klik dag → Dag, ‹ › uit aan randen.
- [ ] **Step 5: Commit** `Agendavenster: dag, week en maand`

### Task 11: Dashboard met plekken en aanpas-stand, controle en oplevering

**Files:** Modify `src/pages/DashboardPage.tsx`, `src/styles.css`, `README.md`

**Interfaces:**
- Consumes: `useLayout`, `swapSlots`, `DEFAULT_LAYOUT` (Task 6), widgets (Task 9), `TodayHeader`/`WeatherCard` (Task 8)
- [ ] **Step 1: Implement** raster kop + weer + 6 plekken; widget per plek in plek-maat; aanpas-stand: stippelrand + greep, dnd-kit (`PointerSensor` met afstand, `TouchSensor` delay 250 ms, `KeyboardSensor`), drop op plek → `swapSlots`; knoppen "Standaardindeling" en "Klaar"; klikken uit in aanpas-stand.
- [ ] **Step 2: Verify** 2560×1440 en 1920×1080 `scrollHeight <= innerHeight`; overige maten geen horizontale scroll; ruilen + herladen (5175 en nep-sessie 5174) behoudt indeling; buiten aanpas-stand geen slepen; licht/donker; `npm test && npx tsc --noEmit -p . && npm run build`.
- [ ] **Step 3: README** (look, zijbalk, indeling aanpassen, agendavenster, landschap). Commit `Dashboard: verplaatsbare tegels`.
