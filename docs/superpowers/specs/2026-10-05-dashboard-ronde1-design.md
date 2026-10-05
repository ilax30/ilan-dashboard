# Dashboard — ronde 1: hoofdpagina, agenda-tijdlijn en weer

Datum: 2026-10-05 · Status: ontwerp, wacht op review

## Doel

Ilan's To-Do lijst groeit uit tot een persoonlijk dashboard. De hoofdpagina beantwoordt in één oogopslag
**"wat moet ik vandaag weten?"**: wat er nu en straks in de agenda staat, wat er nog moet gebeuren, en wat
voor weer het is. Primair gebruik: **iPad en pc** (de telefoon moet blijven werken, maar is geen focus).

### Wat Ilan zei

- Eén app (aanpak A): inloggen met de pincode, daarna een dashboard met grote tegels; tikken op **To-do**
  opent de bestaande to-do pagina.
- Bovenste kaart dynamisch: datum/tijd, volgende afspraak en resterende tijd veranderen vanzelf; weer rechtsboven.
- Tijdlijn van de dag (en week) met een meelopende **NU**-lijn.
- Agenda via de **geheime iCal-link** van Google Agenda; weer voor een **vaste woonplaats**.
- Ronde 1 toont **alleen wat werkt**. Latere onderdelen: Doelen, Financiën, Notities, Projecten.
  **Gewoontes** en **Overig** vervallen.
- De inhoud van de to-do pagina blijft zoals hij is.

### Aannames (ter controle)

- Zelfde cozy stijl, design tokens, licht/donker en dag/nacht-schuifje als de to-do app.
- Zelfde account, pincode-slot, Supabase-project ("Woolley project") en hosting (GitHub Pages + PWA).
- Geen dag-voortgangsbalk (niet in Ilans schets).
- Tijdzone altijd `Europe/Amsterdam`.

### Buiten scope (ronde 1)

- Afspraken aanmaken of wijzigen (iCal is alleen-lezen).
- Tegels voor Doelen, Financiën, Notities, Projecten (eigen rondes, elk met eigen ontwerp).
- Wijzigingen aan de to-do pagina zelf.
- Een navigatiebalk/menu (pas zinvol bij meer pagina's).

## Indeling hoofdpagina

```
┌──────────────────────────────────────────────────────────────┐
│ Maandag 5 oktober · 10:16                 ☀ 14° Bewolkt   ⚙  │
│ Goedemorgen!                                                 │
│ Volgende afspraak: 11:30 · Projectoverleg · over 1u 14m      │
├───────────────────────────────────────┬──────────────────────┤
│ VANDAAG              [ Dag | Week ]   │ TO-DO           →    │
│ 🎂 Verjaardag Sanne  (hele dag)       │ 4 open               │
│ 09:00 ── Werk                         │ ★ Belastingaangifte  │
│ 10:16 ── 🔴 NU                        │   afronden           │
│ 11:30 ── Projectoverleg               │ Bekijk alles →       │
│ 12:30 ── Lunch                        ├──────────────────────┤
│ 14:30 ── Sportschool                  │ + Nieuwe taak…       │
└───────────────────────────────────────┴──────────────────────┘
```

- **Bovenste kaart** (volle breedte). Klok tikt per seconde, begroeting per dagdeel
  (05–12 goedemorgen, 12–18 goedemiddag, 18–24 goedenavond, 00–05 goedenacht). "Volgende afspraak" is de eerstvolgende
  niet-hele-dag afspraak die nog niet begonnen is; aftellen per minuut ("over 1u 14m", "over 5m", "nu bezig: … tot 12:00"
  als er een afspraak loopt en er vandaag niets meer volgt). Geen afspraken meer vandaag: "Geen afspraken meer vandaag".
  Weer compact rechtsboven; tandwiel opent Instellingen.
- **Tijdlijn** (links, ±7/12 breed). Uurraster van 07:00 tot 23:00, uitbreidbaar als er afspraken buiten dat venster
  vallen. Afspraken als gekleurde blokken, overlappende afspraken naast elkaar. Een iCal-link bevat geen
  Google-kleuren: de kleur komt uit een vast cozy-palet (6 tinten) en wordt per afspraaktitel vast gekozen (hash van
  de titel), zodat "Sportschool" altijd dezelfde kleur heeft. Hele-dag-afspraken als labels boven het raster. **NU-lijn** schuift mee (elke 30 s); bij openen scrolt de
  tijdlijn zodat "nu" in beeld is. Schakelaar **Dag / Week**: week = 7 kolommen ma–zo van de huidige week, vandaag
  uitgelicht, zelfde blokken compacter.
- **To-do-kaart** (rechts). Aantal open taken, bovenste favoriet (of bovenste taak als er geen favoriet is),
  "Bekijk alles →" naar `#/todo`. De hele kaart is klikbaar. Live bijgewerkt (zelfde realtime-kanaal als de to-do pagina).
- **Snelle actie** onder de to-do-kaart: invoerveld "Nieuwe taak…" + toevoegen, zonder van pagina te wisselen.
- **iPad staand / smalle schermen** (< 900 px): tijdlijn en rechterkolom onder elkaar. Telefoon: idem, één kolom.

## Navigatie

- Hash-routes: `#/` = dashboard, `#/todo` = to-do pagina. Werkt op GitHub Pages zonder rewrites en binnen de PWA.
- Kleine eigen router (`useHashRoute`), geen extra dependency.
- To-do pagina krijgt linksboven (naast het dag/nacht-schuifje) een knop **← Dashboard**.
- Het pincode-slot omsluit de hele app (beide pagina's).

## Instellingen

Dialoog vanaf het tandwiel op het dashboard:

- **Agenda-link**: plakveld voor het geheime iCal-adres, met uitleg (Google Agenda → Instellingen → je agenda →
  "Geheim adres in iCal-indeling"). Na opslaan direct testen; foutmelding als de link niet werkt.
  Een opgeslagen link wordt gemaskeerd getoond met een knop "Vervangen" en "Ontkoppelen".
- **Woonplaats**: zoekveld (Open-Meteo geocoding), kies uit de resultaten; opgeslagen als naam + coördinaten.

## Data en opslag

### Tabel `public.dashboard_settings`

| kolom | type | |
|---|---|---|
| `user_id` | uuid PK, default `auth.uid()`, FK `auth.users` | |
| `ical_url` | text, null | geheim; alleen eigenaar |
| `city_name` | text, null | weergavenaam |
| `latitude`, `longitude` | double precision, null | |
| `updated_at` | timestamptz default now() | |

RLS aan; één policy voor `authenticated`: `user_id = auth.uid()` voor select/insert/update/delete. Geen toegang voor `anon`.

### Edge Function `dashboard-calendar`

- `POST` met de sessie-JWT van de gebruiker (`verify_jwt` aan).
- Leest `ical_url` van de gebruiker (met diens JWT, dus via RLS), haalt de ICS op (timeout 8 s), parseert met
  **ical.js** (herhalingen via RRULE/EXDATE/RECURRENCE-ID, tijdzones via VTIMEZONE), en geeft afspraken terug van
  begin vandaag tot begin vandaag + 8 dagen, in `Europe/Amsterdam`:
  `{ events: [{ id, title, start, end, allDay, location? }], fetchedAt }` (start/end als ISO-tijden;
  hele-dag-afspraken met start = begin van de dag, end = begin van de dag erna).
- Body `{ testUrl }` (optioneel): test een nieuwe link vóór opslaan, zonder iets op te slaan.
- Fouten: `no_calendar` (geen link), `fetch_failed` (link onbereikbaar/ongeldig), `parse_failed`.
- Bron in de repo: `supabase/functions/dashboard-calendar/index.ts`; pure parse-/expand-logica in een apart bestand
  zodat het testbaar is.

### Weer (client)

- Open-Meteo forecast API rechtstreeks vanuit de app (CORS toegestaan, geen sleutel): actuele temperatuur +
  weercode, max/min van vandaag, en neerslagkans per uur. Weercode → Nederlandse omschrijving + icoon.
- Verversen bij openen en elke 30 minuten.

### Caching / offline

- Laatst opgehaalde afspraken en weer in `localStorage` (per gebruiker), zodat het dashboard direct iets toont en
  offline blijft werken. Bij een mislukte verversing: oude gegevens + label "niet bijgewerkt".
- Afspraken verversen: bij openen, bij terugkomen in de app (`visibilitychange`), en elke 5 minuten zolang zichtbaar.

## Componenten en bestanden

Opsplitsing van het huidige `App.tsx` (±700 regels) zodat elk deel één taak heeft:

| Bestand | Taak |
|---|---|
| `src/App.tsx` | thema, login-poort, pincode-poort, router |
| `src/components/PinGate.tsx` | pincode-slot (verplaatst uit App.tsx, ongewijzigd gedrag) |
| `src/pages/TodoPage.tsx` | de huidige to-do pagina (verplaatst, ongewijzigd gedrag) + "← Dashboard" |
| `src/pages/DashboardPage.tsx` | indeling hoofdpagina |
| `src/dashboard/TodayHeader.tsx` | bovenste kaart (klok, begroeting, volgende afspraak, weer) |
| `src/dashboard/Timeline.tsx` | dag- en weekweergave, NU-lijn |
| `src/dashboard/TodoSummaryCard.tsx` | to-do-kaart + snelle actie |
| `src/dashboard/SettingsDialog.tsx` | agenda-link en woonplaats |
| `src/lib/router.ts` | `useHashRoute`, `navigate` |
| `src/lib/calendar.ts` | ophalen via Edge Function, cache, verversen |
| `src/lib/weather.ts` | Open-Meteo ophalen, weercodes, cache |
| `src/lib/settings.ts` | lezen/schrijven `dashboard_settings` |
| `src/lib/dayMath.ts` | pure functies: begroeting, aftellen, volgende afspraak, overlap-indeling, weekdagen |

## Foutafhandeling

| Situatie | Gedrag |
|---|---|
| Geen agenda gekoppeld | Tijdlijn toont lege staat "Koppel je agenda →" (opent Instellingen); kop toont geen volgende afspraak |
| Agenda ophalen mislukt | Laatste afspraken uit cache + "niet bijgewerkt"; zonder cache: melding met "Opnieuw proberen" |
| Ongeldige link bij opslaan | Niet opslaan; foutmelding in de dialoog |
| Geen woonplaats ingesteld | Weer toont "Stel je woonplaats in" (opent Instellingen) |
| Weer ophalen mislukt | Laatst bekende weer + "niet bijgewerkt", of weer verbergen als er niets in de cache zit |
| Offline (PWA) | Alles uit cache; verversen zodra er weer verbinding is |

## Testen

- **Vitest** (nieuw in het project) voor pure logica in `src/lib/dayMath.ts`: begroeting per uur, aftelteksten,
  keuze "volgende afspraak" (inclusief lopende afspraak, hele-dag overslaan, middernacht), overlap-indeling
  (kolommen), weekdagen ma–zo.
- **Deno-tests** voor de agenda-parse/expand-logica met vaste ICS-voorbeelden: losse afspraak, wekelijks herhalend
  met EXDATE, gewijzigde instantie (RECURRENCE-ID), hele-dag, afspraak over middernacht, zomer→wintertijd-overgang.
- **In de browser** (iPad-formaat 1024×768/768×1024 en desktop 1280+): indeling, NU-lijn, dag/week-schakelaar,
  to-do-kaart naar `#/todo` en terug, snelle actie, lege staten, offline (cache).
- Bestaande to-do pagina: snelle regressiecheck (slepen naar Gedaan, vegen, pincode) na de opsplitsing.

## Volgende rondes (ter oriëntatie, niet in deze spec)

Doelen, Financiën, Notities, Projecten: elk een eigen pagina + tegel in de onderste rij van het dashboard,
elk met een eigen kort ontwerp.
