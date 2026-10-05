# Dashboard ronde 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agenda compact in de kop (dagbalk + eerstvolgende afspraken) die opent in een groot venster met Dag/Week/Maand, en een tegelrij met To-do + Doelen/Financiën/Notities/Projecten ("Binnenkort", lege pagina's).

**Architecture:** Pure datum-/indelingslogica erbij in `src/lib/dayMath.ts` (getest). De bestaande `Timeline` wordt een weergave binnen een nieuw `AgendaDialog` (state: weergave + ankerdag); `AgendaStrip` zit in `TodayHeader`. Onderwerpen staan in één lijst `TOPICS` die zowel de tegels als de routes/pagina's voedt. De Edge Function haalt 35 dagen op vanaf maandag.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Supabase Edge Functions (Deno), ical.js 2, Vitest (TZ=Europe/Amsterdam).

**Spec:** `docs/superpowers/specs/2026-10-05-dashboard-ronde2-design.md`

## Global Constraints

- Desktop eerst: 2560×1440 en 1920×1080 **zonder scrollen**; daarna 1280×800, iPad 1024×768 / 768×1024, telefoon 375 — nooit horizontale scroll.
- 12-koloms raster, max ± 2300 px. Rij 2: To-do 4 kolommen + tegels 2 × 2 in 8 kolommen (≥ 1280 px); 900–1280: To-do volle breedte, tegels 2 × 2 eronder; < 900: onder elkaar (tegels 2 × 2 vanaf 600 px).
- Maandweergave = 5 weken vanaf maandag van deze week; geen bladeren voorbij dat bereik.
- Alle UI-tekst Nederlands, bestaande tokens/tinten (`--tint-0..5`, `--now`), licht/donker.
- Agendabereik server: maandag 00:00 (Amsterdam) t/m +35 dagen.
- Geen geheimen in repo/localStorage (iCal-link alleen in `dashboard_settings`).
- Testen in de browser alleen met nep-sessies / `dev-local`; nooit met Ilans echte pincode.

## Review Focus

- Afspraak die gisteren begon en nog loopt (nachtdienst) → staat in het lijstje als "nu" (test Task 1).
- Maandraster over de wintertijd (week van 19–25 okt 2026 en verder) → 35 unieke datums, elk op lokale middernacht (test Task 1).
- Meerdaagse hele-dag-afspraak (vakantie 3 dagen) → in elke maandcel van die dagen, niet alleen de eerste (test Task 1).
- NU buiten het dagbalk-venster (01:00 's nachts) → geen NU-streepje, geen crash (test Task 1: `stripPosition` → `null`).
- ‹ › aan de randen van het 5-wekenbereik → knop uitgeschakeld, nooit een dag zonder gegevens (test Task 5: `canStep`).

---

### Task 1: Datumlogica voor strip, lijstje en maand

**Files:**
- Modify: `src/lib/dayMath.ts`
- Test: `src/lib/dayMath.test.ts`

**Interfaces:**
- Consumes: bestaande `dayWindow`, `weekDays`, `nextDayStart`, `CalEvent`
- Produces:
  - `upcoming(events: CalEvent[], now: Date, limit = 3): { today: CalEvent[]; tomorrow: CalEvent | null }` — `today` = niet-hele-dag afspraken met `end > now` die vandaag (deels) vallen, op start gesorteerd, max `limit`; `tomorrow` = eerste niet-hele-dag afspraak die morgen begint, **alleen** als `today` leeg is, anders `null`.
  - `stripPosition(min: number, window: { startMin: number; endMin: number }): number | null` — percentage 0–100; `null` buiten het venster.
  - `monthGrid(now: Date): Date[]` — 35 datums (lokale middernacht) vanaf `weekDays(now)[0]`.
  - `eventsOnDay(events: CalEvent[], day: Date): CalEvent[]` — alle afspraken die `[day 00:00, volgende middernacht)` overlappen (ook hele-dag en meerdaags; 0-minuten-afspraak op die dag telt mee), hele-dag eerst, daarna op start.

- [ ] **Step 1: Write failing tests** in `dayMath.test.ts` (lokale tijden, TZ staat vast):
  - `upcoming`, now = 2026-10-05T11:00: Werk 09:00–12:00, Lunch 12:30–13:00, Sport 17:30–18:30, Eten 19:00–21:00, Ochtend 07:00–08:00 → `today` titels `['Werk','Lunch','Sport']`, `tomorrow` `null`.
  - nachtdienst 2026-10-04T22:00–2026-10-05T12:00 → in `today`.
  - alleen Ochtend 07:00–08:00 vandaag + Tandarts morgen 09:00 → `today` `[]`, `tomorrow.title` `'Tandarts'`.
  - alleen hele-dag vandaag → `today` `[]`, `tomorrow` `null`.
  - `stripPosition(420, {420,1380})` → 0; `(1380, …)` → 100; `(900, …)` → 50; `(60, …)` → `null`.
  - `monthGrid(at('2026-10-07T12:00'))` → length 35, eerste ma 5 okt 00:00, laatste zo 8 nov 00:00; alle `getHours()===0`; 35 unieke `getDate()+month` combinaties.
  - `eventsOnDay`: vakantie hele-dag 2026-10-06T00:00–2026-10-09T00:00 → aanwezig op 6, 7 en 8 okt, niet op 9 okt; volgorde op 7 okt met een 09:00-afspraak: vakantie eerst.
- [ ] **Step 2: Run** `npm test` — FAIL (functies ontbreken).
- [ ] **Step 3: Implement** de vier functies in `dayMath.ts`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** `git commit -m "Dagmath: eerstvolgende afspraken, dagbalk, maandraster"`

### Task 2: Agenda-functie haalt 5 weken op

**Files:**
- Modify: `supabase/functions/dashboard-calendar/expand.ts` (`calendarRange`), `supabase/functions/dashboard-calendar/index.ts` (kopcommentaar), `src/dashboard/SettingsDialog.tsx` (melding)
- Test: `supabase/functions/dashboard-calendar/expand.test.ts`

**Interfaces:**
- Produces: `calendarRange(now)` → `{ start: maandag 00:00 Amsterdam, end: start-maandag + 35 dagen (00:00 Amsterdam) }`

- [ ] **Step 1: Update tests** `calendarRange`: wo 7 okt 2026 10:00Z → `{ start: 2026-10-04T22:00Z, end: 2026-11-08T23:00Z }`; zo 25 okt 10:00Z → `{ start: 2026-10-18T22:00Z, end: 2026-11-22T23:00Z }`; ma 26 okt 10:00Z → start `2026-10-25T23:00Z`.
- [ ] **Step 2: Run** `npm test` — FAIL op de eind-datums.
- [ ] **Step 3: Implement**; melding in `SettingsDialog`: `` `Gekoppeld: ${n} ${n === 1 ? 'afspraak' : 'afspraken'} in de komende 5 weken` ``.
- [ ] **Step 4: Run** `npm test` — PASS. Deploy `dashboard-calendar` (index.ts + expand.ts van schijf, `verify_jwt: true`); curl zonder sleutel → 401, publieke sleutel + testUrl → 401, OPTIONS → 200.
- [ ] **Step 5: Commit** `git commit -m "Agenda-functie: 5 weken vooruit vanaf maandag"`

### Task 3: Onderwerpen — routes, tegel-definities en lege pagina

**Files:**
- Modify: `src/lib/router.ts`, `src/lib/router.test.ts`, `src/App.tsx`, `src/dashboard/Tile.tsx`, `src/styles.css`
- Create: `src/dashboard/topics.tsx`, `src/pages/TopicPage.tsx`

**Interfaces:**
- Produces:
  - `type Route = '/' | '/todo' | '/doelen' | '/financien' | '/notities' | '/projecten'`
  - `type Topic = { id: 'doelen' | 'financien' | 'notities' | 'projecten'; title: string; route: Route; line: string; empty: string; Art: () => JSX.Element }`, `TOPICS: Topic[]` — waarden uit de spec: Doelen/"Je doelen voor deze week"/"Hier komen straks je doelen.", Financiën/"Overzicht van je geld"/"Hier komt straks je geldoverzicht.", Notities/"Losse gedachten en lijstjes"/"Hier komen straks je notities.", Projecten/"Waar je aan werkt"/"Hier komen straks je projecten."; illustraties: vlaggetje op heuvel, spaarvarken + muntjes, schriftje + potlood, stapeltje mapjes (inline SVG 96×96, tokens `--accent`, `--gold`, `--blush`, `--muted`, `--card-hi`).
  - `TopicPage({ topic }: { topic: Topic })` — Blobs, "‹ Dashboard"-knop (`.back-button`, `navigate('/')`), grote `Art`, titel (display-font), `empty`-tekst.
  - `Tile` krijgt optioneel `muted?: boolean` (kerngetal rustiger: kleiner, `--muted`).

- [ ] **Step 1: Failing tests** `router.test.ts`: `parseRoute('#/doelen')` → `'/doelen'`; idem financien/notities/projecten; `parseRoute('#/onbekend')` → `'/'`.
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement** router, topics, TopicPage, `App` `Page` kiest `TopicPage` voor onderwerp-routes, Tile `muted`.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit -p .` — PASS; browser (`dev-local`): `#/notities` toont pagina, "‹ Dashboard" gaat terug.
- [ ] **Step 5: Commit** `git commit -m "Onderwerpen: routes, tegels en lege pagina's"`

### Task 4: Compacte agenda in de kop (`AgendaStrip`)

**Files:**
- Create: `src/dashboard/AgendaStrip.tsx`; Modify: `src/dashboard/TodayHeader.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `upcoming`, `stripPosition`, `dayWindow`, `layoutDay`, `colorIndex` (Task 1 / ronde 1); `useNow` (30 s)
- Produces:
  - `AgendaStrip({ events, status, onOpen, onConnect, onRetry }: { events: CalEvent[]; status: CalendarStatus; onOpen: () => void; onConnect: () => void; onRetry: () => void })`
  - `TodayHeader` krijgt props `onOpenAgenda: () => void; onRetryAgenda: () => void` en zet `AgendaStrip` in het midden (grid: links auto, midden `minmax(0, 960px)` 1fr, rechts auto; < 1280 px: midden over volle breedte op een tweede regel).

- [ ] **Step 1: Implement** volgens spec "Compacte agenda": balk (blokken `left/width` uit `stripPosition`, rijtjes = `layoutDay` kolommen, max 3), uurlabels 09/12/15/18/21, NU-streepje (koraal, `null` → niet tonen), afgelopen deel vager, max 2 hele-dag-labels + "+N", lijstje (`upcoming`, "nu"-label bij lopend, "Niets meer vandaag · Morgen 09:00 Tandarts", "Vrije dag 🌿"), ⤢-icoon. Hele blok `<button aria-label="Agenda openen">` behalve bij `none` ("Koppel je agenda →") en `error` zonder events ("Agenda niet bereikbaar · Opnieuw proberen"); `loading` zonder events → "Agenda laden…"; `stale` → `.stale-label`.
- [ ] **Step 2: Verify** `npx tsc --noEmit -p .`; browser (5174, nep-sessie + `dashboard.calendar`-cache) op 2560: blokken op juiste plek (09:00–12:00 → left ≈ 12,5 %, width ≈ 18,75 %), NU-streepje, lijstje-teksten in de drie situaties; geen agenda → koppel-link.
- [ ] **Step 3: Commit** `git commit -m "Kop: compacte agenda met dagbalk"`

### Task 5: Agendavenster met Dag / Week / Maand

**Files:**
- Create: `src/dashboard/AgendaDialog.tsx`, `src/dashboard/MonthView.tsx`, `src/dashboard/agendaNav.ts`, `src/dashboard/agendaNav.test.ts`
- Modify: `src/dashboard/Timeline.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `monthGrid`, `eventsOnDay`, `weekDays`, `colorIndex` (Task 1)
- Produces:
  - `type AgendaView = 'day' | 'week' | 'month'`
  - `canStep(view: 'day' | 'week', anchor: Date, dir: -1 | 1, now: Date): boolean` en `step(view, anchor, dir): Date` in `agendaNav.ts` — bereik = `monthGrid(now)[0]` t/m `monthGrid(now)[34]`; dag ±1 dag, week ±7 dagen (anker blijft binnen bereik).
  - `Timeline({ events, status, view, anchor, onConnect, onRetry }: { …; view: 'day' | 'week'; anchor: Date; … })` — kop/schakelaar verhuist naar het venster; dag = dag van `anchor`, week = week die `anchor` bevat; NU-lijn alleen op vandaag; scroll naar "nu" (of 08:00 op andere dagen) alleen bij mount en bij wijziging van `view`/`anchor`.
  - `MonthView({ events, now, onPickDay }: { events: CalEvent[]; now: Date; onPickDay: (day: Date) => void })`
  - `AgendaDialog({ open, onClose, events, status, onConnect, onRetry })` — state `view` (`localStorage['dashboard.view']`, nu ook `'month'`) en `anchor` (bij openen = vandaag); titel per weergave ("Maandag 5 oktober" / "Week 41" / "5 okt – 8 nov"); ‹ › (Dag/Week, `canStep`), "Vandaag"; Maand-klik → `view='day'`, `anchor=dag`.

- [ ] **Step 1: Failing tests** `agendaNav.test.ts` (now = wo 7 okt 2026 12:00): `canStep('day', ma 5 okt, -1, now)` → `false`; `canStep('day', zo 8 nov, 1, now)` → `false`; `canStep('day', 7 okt, 1, now)` → `true`; `step('day', 7 okt, 1)` → 8 okt 00:00; `canStep('week', 5 okt, -1, now)` → `false`; `canStep('week', 2 nov, 1, now)` → `false`; `step('week', 5 okt, 1)` → 12 okt 00:00; `step('day', 24 okt, 1)` → 25 okt 00:00 en `step('day', 25 okt, 1)` → 26 okt 00:00 (wintertijd, lokale middernacht).
- [ ] **Step 2: Run** `npm test` — FAIL.
- [ ] **Step 3: Implement** `agendaNav.ts`, Timeline-aanpassing, `MonthView` (5 × 7 cellen; dagnummer, "1 nov" op de 1e; max 3 regels: hele-dag-label, "● 09:00 Titel"; "+N meer"; vandaag uitgelicht, verleden vager; cel = knop), `AgendaDialog` (native `<dialog>`, `min(1600px, 100vw − 48px)` × `100dvh − 48px`, sluiten ×/Esc/buiten).
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit -p .` — PASS; browser (nep-sessie + cache met afspraken over 3 weken): venster opent/sluit, Maand toont 35 cellen met afspraken, klik dag → Dag van die dag, ‹ › uit aan de randen.
- [ ] **Step 5: Commit** `git commit -m "Agendavenster: dag, week en maand"`

### Task 6: Nieuwe indeling, controle en oplevering

**Files:**
- Modify: `src/pages/DashboardPage.tsx`, `src/dashboard/TodoSummaryCard.tsx` (indien nodig voor hoogte), `src/styles.css`, `README.md`

**Interfaces:**
- Consumes: `AgendaDialog` (Task 5), `TodayHeader` nieuwe props (Task 4), `TOPICS`/`Tile` (Task 3)

- [ ] **Step 1: Implement** `DashboardPage`: kop (12 kol.) → rij 2 `.dash-side` (To-do + snel toevoegen, 4 kol.) + `.dash-tiles` 2 × 2 (8 kol.) met `TOPICS.map(t => <Tile icon={<t.Art/>} title={t.title} value="Binnenkort" muted line={t.line} onOpen={() => navigate(t.route)} />)`; `Timeline` van de homepagina weg; `AgendaDialog` gekoppeld aan `onOpenAgenda`. Oude `.dash > .timeline`-CSS weg; rij-2-CSS volgens Global Constraints.
- [ ] **Step 2: Verify** browser: 2560×1440 en 1920×1080 `scrollHeight === innerHeight` (geen scroll); 1280, 1024×768, 768×1024, 375 geen horizontale scroll; tegels → pagina → terug; venster vanuit de kop; licht + donker. `npm test && npx tsc --noEmit -p . && npm run build` groen.
- [ ] **Step 3: README** bijwerken (compacte agenda + venster Dag/Week/Maand, 5 weken, onderwerp-tegels). Commit `git commit -m "Dashboard: tegelrij en agenda in de kop"`.
