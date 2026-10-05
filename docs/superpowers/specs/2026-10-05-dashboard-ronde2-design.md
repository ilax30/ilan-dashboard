# Dashboard — ronde 2: nieuwe look, zijbalk, verplaatsbare tegels en agendavenster

Datum: 2026-10-05 · Status: ontwerp (herzien), wacht op review · Bouwt voort op
[ronde 1](2026-10-05-dashboard-ronde1-design.md) (live sinds `b2d321a`).

## Doel

Het dashboard krijgt de look van Ilans voorbeeld (zijbalk, kop met dag-voortgang, kaarten) in eigen kleuren,
rustig voor de ogen overdag én 's avonds. Ilan bepaalt zelf wat belangrijk is: tegels zijn **verplaatsbaar** en
passen zich aan de plek aan. De agenda kan **5 weken vooruit** (Dag/Week/Maand) in een groot venster.

### Wat Ilan zei

- Voorbeeld-dashboard (donker, zijbalk, kop met "38% van je dag", Agenda/To-do/Snelle actie, vier
  onderwerp-kaarten): "I really like the look of this, keep it in our colors".
- Donker was overdag te donker, licht "flashbangde": **licht = Zandsteen (zandcrème)**, **donker = de blauwe
  schemer, iets donkerder blauw, maar wel mooi**.
- "Achtergrond natuur wat past bij de tijd" → **getekend landschap** dat meekleurt met het dagdeel.
- "Maak het zodat ik de tegels kan slepen waar ik wil … als ik een kleiner tegel daar sleep wordt die zo groot
  als de agenda" → **vaste plekken, ruilen**.
- Maandoptie: afspraken van over 2–3 weken zien → 5 weken vanaf deze maandag, zonder verder bladeren.
- Onderwerpen (Doelen, Financiën, Notities, Projecten) nu als tegel + lege pagina, inhoud later.

### Buiten scope (ronde 2)

- Inhoud van Doelen/Financiën/Notities/Projecten; snel toevoegen van afspraak/notitie/uitgave.
- Vrij formaat trekken van tegels; per apparaat een andere indeling.
- Datums/deadlines bij taken (dus geen "Vandaag/Morgen"-labels).
- Bladeren in de agenda voorbij 5 weken; afspraken maken/wijzigen.

## Kleuren

Twee thema's via het bestaande dag/nacht-schuifje (standaard volgt het systeem, zoals nu). De oude crème- en
cacao-thema's vervallen. Startwaarden (fijnafstemming in de browser mag, de sfeer niet):

| Token | Licht — Zandsteen | Donker — diep schemerblauw |
|---|---|---|
| `--bg` | `#cbbfae` | `#1c2430` |
| `--card` / `--card-hi` | `#d9cfc1` / `#e2d9cc` | `#283241` / `#313d4e` |
| `--card-edge` / `--line` | `#c9bba8` / `#b8aa97` | `#3a4657` / `#3a4657` |
| `--ink` / `--muted` | `#2f2725` / `#5f5149` | `#e9edf2` / `#a3aebb` |
| `--accent` (terracotta) | `#b9714f` | `#e3a586` |
| `--tint-0..5` | `#e7b8a0 #b8c9a8 #a9c3d1 #cdb9d6 #e5cf9a #e6b9bf` | `#6b4a3a #3f6f5c #3a5684 #6a5088 #7a6436 #7a4a52` |

Tekstcontrast minimaal WCAG AA op kaarten. `theme-color`-meta volgt `--bg`.

## Achtergrond: landschap per dagdeel

- Vlak getekend landschap (inline SVG, geen foto's): lucht, zon/maan, 2–3 lagen glooiende heuvels, enkele
  bomen. Vult het hele scherm achter alles; kaarten liggen erop, het landschap is zichtbaar rond en tussen
  de kaarten.
- **Dagdelen** (uit zonsopkomst `op` en zonsondergang `onder` van vandaag):
  ochtend `op − 45 min … op + 90 min` (perzik/roze lucht, lage zon) · dag (lichte lucht, zon) ·
  avond `onder − 90 min … onder + 45 min` (oranje/roze, lage zon) · nacht (donkerblauw, maan + sterren,
  heuvels als silhouet).
- Zonsopkomst/-ondergang komen van Open-Meteo (`daily=sunrise,sunset` bij de bestaande weer-aanvraag, mee
  in de weer-cache). Zonder woonplaats of gegevens: 07:00 / 19:00.
- Elke minuut opnieuw bepaald; kleuren lopen vloeiend over (± 60 s overgang); `prefers-reduced-motion` → direct.
- In het donkere thema wordt het landschap gedimd zodat het rustig blijft.
- **Ontwikkel-testknop**: alleen in dev-builds (`import.meta.env.DEV`) een `?dagdeel=ochtend|dag|avond|nacht`
  in de URL om een dagdeel te forceren.

## Indeling

```
┌──────────┬──────────────────────────────────────────────┬───────────────┐
│ Ilan's   │ Maandag 5 oktober · 10:16                    │ ☀ 14° Bewolkt │
│ dashboard│ Goedemorgen!                                 │ 17° / 12°     │
│ ⌂ Home   │ Volgende: 11:30 Projectoverleg · over 1u 14m │ 12u 15u 18u   │
│ ▦ Agenda │ ▬▬▬▬▬▬▬░░░░░░░░░░░  38% van je dag             │               │
│ ☑ Taken  ├──────────────────────────────┬───────────────┴───────────────┤
│ ◎ Doelen │ GROTE PLEK (8 kol.)          │ MIDDELGROTE PLEK (4 kol.)     │
│ € Financ.│ standaard: Agenda            │ standaard: To-do              │
│ ✎ Notit. │                              │                               │
│ ▤ Proj.  ├───────┬───────┬───────┬──────┴───────────────────────────────┤
│ ⚡ Snel   │ KLEIN │ KLEIN │ KLEIN │ KLEIN  (elk 3 kol.)                 │
│ ⚙ Inst.  │ Fin.  │ Doelen│ Notit.│ Projecten                           │
└──────────┴───────┴───────┴───────┴─────────────────────────────────────┘
```

- **Zijbalk** (vast, 240 px op ≥ 1280 px; alleen icoontjes, 72 px, op 900–1280; < 900: menuknop linksboven
  die de zijbalk als laag opent): titel "Ilan's dashboard"; Home, Agenda, Taken, Doelen, Financiën,
  Notities, Projecten (huidige pagina uitgelicht; **Agenda** opent het agendavenster); onderin
  **Snel toevoegen** (taak, Enter = toevoegen, "Toegevoegd ✓"), het dag/nacht-schuifje, **Instellingen**
  (bestaande dialoog) en **Meer…** (vergrendelen, pincode wijzigen, uitloggen).
- De zijbalk staat op **alle pagina's** (dashboard, to-do, onderwerpen) en vervangt de "‹ Dashboard"-knop en
  het losse schuifje linksboven. De to-do pagina zelf blijft verder gelijk (alleen naar rechts geschoven; de
  vaste knoppen die nu linksboven staan verhuizen mee).
- **Kop** (rij 1): datum · klok, begroeting, volgende afspraak / nu bezig (zoals ronde 1), **dag-voortgangsbalk**
  07:00–23:00 met "N% van je dag" (vóór 07:00 0 %, na 23:00 100 %). Rechts een **weerkaart** (icoon, temperatuur,
  omschrijving, max/min, 4 uur vooruit). Rechtsboven de knop **"Indeling aanpassen"**.
- **Plekken** (rij 2–3): 1 groot, 1 middel, 4 klein. Op 2560×1440 en 1920×1080 past alles **zonder scrollen**.
  900–1280: groot en middel onder elkaar, klein 2 × 2. < 900: alles onder elkaar, klein 2 × 2 (≥ 600 px) of
  één kolom. Nooit horizontale scroll.

## Tegels en hun maten

Zes tegels; elke tegel heeft een weergave per maat. De hele tegel is klikbaar (behalve in aanpas-stand).

| Tegel | Klein | Middel | Groot | Klik |
|---|---|---|---|---|
| **Agenda** | volgende afspraak + dagbalk (07–23, blokjes, NU-streepje) | dagbalk + lijstje resterende afspraken van vandaag (max. 6), anders "Niets meer vandaag · Morgen 09:00 …" / "Vrije dag 🌿" | uurrooster met **Vandaag / Week** (tijdlijn uit ronde 1, NU-lijn) | agendavenster |
| **To-do** | "N open" + bovenste (favoriete) taak | bovenste 5 taken met vinkje en ster | bovenste 10 taken met vinkje + invoerveld "Nieuwe taak…" | to-do pagina |
| **Doelen, Financiën, Notities, Projecten** | plaatje + titel + "Binnenkort" | idem + korte regel | groot plaatje + regel + "Hier komen straks …" | eigen pagina |

- **Vinkje** bij een taak = afronden (zelfde als naar "Gedaan" slepen: `done_at`), met 5 s "Ongedaan maken" in
  de tegel. Ster tonen, niet wijzigen.
- Statussen van de agenda zoals ronde 1 ("Koppel je agenda →", "Agenda laden…", "Agenda niet bereikbaar ·
  Opnieuw proberen", "niet bijgewerkt").

## Verplaatsen (aanpas-stand)

- **"Indeling aanpassen"** zet de aanpas-stand aan: tegels krijgen een stippelrand en een sleepgreep, klikken
  opent niets. Sleep een tegel op een andere plek → de twee **ruilen** (elk neemt de maat van zijn nieuwe plek
  aan). Muis, touch (even vasthouden) en toetsenbord (dnd-kit, zoals de to-do lijst).
- In de aanpas-stand ook **"Standaardindeling"** (Agenda groot, To-do middel, Financiën/Doelen/Notities/
  Projecten klein) en **"Klaar"**.
- **Opslaan**: `{ groot, middel, klein: [4] }` met tegel-ids in `dashboard_settings.layout` (nieuwe kolom,
  `jsonb`, RLS zoals de rest van de rij) én in `localStorage['dashboard.layout']` voor direct/offline openen.
  Lukt opslaan op de server niet, dan blijft een "nog op te slaan"-markering staan en wordt bij `online` /
  terugkomen opnieuw geprobeerd.
- **Normaliseren**: een opgeslagen indeling met onbekende of dubbele ids of ontbrekende tegels wordt aangevuld
  in de standaardvolgorde; nooit een lege of dubbele plek.

## Agendavenster (zoals afgesproken)

- Native `<dialog>`, (bijna) volledig scherm; sluiten met ×, Esc of naast klikken. Openen via de Agenda-tegel
  of "Agenda" in de zijbalk.
- **Dag**: uurrooster voor een gekozen dag, ‹ › per dag, "Vandaag". **Week**: ma–zo, ‹ › per week.
  **Maand**: 5 × 7 dagen vanaf maandag van deze week; per dag max. 3 regels (hele-dag-label, "● 09:00 Titel")
  + "+N meer"; klik op een dag → Dag van die dag. Bladeren alleen binnen de 5 weken (knoppen uit aan de randen).
- Weergave onthouden in `localStorage['dashboard.view']`; scrollen naar "nu" alleen bij openen en bij wisselen.

## Agenda-functie (server) — al gebouwd

- Bereik: maandag 00:00 van deze week t/m 35 dagen later (Amsterdam). Live als versie 4. Melding na koppelen:
  "Gekoppeld: N afspraken in de komende 5 weken".

## Onderwerp-pagina's — deels gebouwd

- Routes `#/doelen`, `#/financien`, `#/notities`, `#/projecten`; één `TopicPage` (plaatje, titel,
  "Hier komen straks …"); tegel-definities in `src/dashboard/topics.tsx`. Krijgt de zijbalk.

## Foutafhandeling

| Situatie | Gedrag |
|---|---|
| Indeling opslaan mislukt / offline | Lokaal bewaard, later opnieuw geprobeerd; geen melding nodig |
| Opgeslagen indeling kapot/verouderd | Normaliseren naar geldige indeling |
| Geen woonplaats / geen zonnetijden | Landschap met 07:00 / 19:00 |
| Afronden via vinkje mislukt | Taak komt terug, melding "Opslaan mislukt" |
| Agenda/weer | Zoals ronde 1 (cache + "niet bijgewerkt") |

## Testen

- **Vitest**: `swapSlots` en `normalizeLayout` (ruilen groot↔klein, dubbele/onbekende/ontbrekende ids);
  `dayPart(now, sunrise, sunset)` (grenzen, december en juni, geen zonnetijden); `dayProgress(now)` (06:00 → 0,
  15:00 → 50, 23:30 → 100); bestaande en al gebouwde agenda-functies (`upcoming`, `stripPosition`,
  `monthGrid`, `eventsOnDay`, `canStep/step`, `calendarRange`), `parseRoute`.
- **Browser**: 2560×1440 en 1920×1080 zonder scrollen; 1280, iPad 1024×768 / 768×1024, telefoon zonder
  horizontale scroll; aanpas-stand: slepen ruilt, na herladen dezelfde indeling, "Standaardindeling" werkt;
  elke tegel in alle drie de maten leesbaar; licht en donker; vier dagdelen via `?dagdeel=`; zijbalk op alle
  pagina's; to-do pagina ongewijzigd in gedrag (slepen, vegen, pincode).

## Bestanden (globaal)

| Bestand | Wat |
|---|---|
| `src/styles.css` | Zandsteen + blauw thema, zijbalk, plekken, tegelmaten, landschap |
| `src/components/Sidebar.tsx` | zijbalk (nav, snel toevoegen, schuifje, instellingen, meer) |
| `src/components/Landscape.tsx` + `src/lib/dayPart.ts` | landschap + dagdeel/dagvoortgang |
| `src/lib/layout.ts` | indeling: types, standaard, `swapSlots`, `normalizeLayout`, laden/opslaan |
| `src/dashboard/widgets/*.tsx` | Agenda-, To-do- en onderwerp-tegel per maat |
| `src/dashboard/AgendaDialog.tsx`, `MonthView.tsx`, `agendaNav.ts` | agendavenster |
| `src/dashboard/TodayHeader.tsx`, `WeatherCard.tsx` | kop + weerkaart |
| `src/pages/DashboardPage.tsx`, `TodoPage.tsx`, `TopicPage.tsx`, `App.tsx` | zijbalk-indeling |
| `src/lib/weather.ts` | + zonsopkomst/-ondergang |
| `supabase/migrations/005_dashboard_layout.sql` | kolom `layout jsonb` |
