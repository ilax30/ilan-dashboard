# Dashboard — ronde 2: compacte agenda, agendavenster (dag/week/maand) en onderwerp-tegels

Datum: 2026-10-05 · Status: ontwerp, wacht op review · Bouwt voort op
[ronde 1](2026-10-05-dashboard-ronde1-design.md) (live sinds `b2d321a`).

## Doel

De homepagina besteedt haar ruimte aan wat Ilan het meest gebruikt. Ilan heeft geen drukke agenda: een
groot, vrijwel leeg tijdlijn-blok is zonde van de ruimte. De agenda wordt daarom **compact** in de bovenste
kaart getoond en opent bij een klik **groot**. De vrijgekomen ruimte gaat naar de **tegels** voor de andere
onderwerpen. Daarnaast wil Ilan **verder vooruit** kunnen kijken (afspraken over 2–3 weken).

### Wat Ilan zei

- "agenda in het midden [van de bovenste kaart] … een hele lege plek … als ik erop druk dan vergroot die
  naar (haast) volledig scherm. Anders neemt een vrijwel lege agenda zoveel plek."
- "Daarnaast maand optie zou ook fijn zijn, kan ik afspraken van over 2-3 weken ook zien."
- Tegels voor de andere onderwerpen nu toevoegen, **zonder** de details/inhoud ("Binnenkort" + lege pagina).
- Licht thema iets donkerder — al gedaan en live (`b2d321a`).

### Besluiten (met Ilan afgestemd)

- Maandweergave = **5 weken vanaf de maandag van deze week** (altijd vooruit), **zonder** bladeren naar
  latere maanden.
- Klik op een dag in de maand → **Dag**-weergave van die dag, met ‹ › en "Vandaag".
- Onderwerp-tegels: Doelen, Financiën, Notities, Projecten, elk met eigen illustratie, kerngetal
  "Binnenkort" en een eigen (lege) pagina.

### Buiten scope (ronde 2)

- Inhoud van Doelen/Financiën/Notities/Projecten (eigen rondes).
- Bladeren voorbij de 5 weken; afspraken maken of wijzigen (de iCal-link is alleen-lezen).
- De uitgestelde kleine punten uit ronde 1, behalve de twee die dit ontwerp vanzelf raakt (zie onderaan).

## Indeling (desktop eerst, 32" ± 2560×1440)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Maandag 5 okt · 11:27   │  VANDAAG  07 ──▮▮──── 12 ────│NU── 18 ──▮── 23  │ ☀ 18°  ⚙ │
│ Goedemorgen!            │  🎂 Verjaardag Sanne                             │ Zonnig   │
│ Volgende: 14:30 Sport…  │  14:30 Sportschool · 19:00 Etentje          ⤢    │ 12u 13u… │
├───────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ TO-DO                 │ 🎯 Doelen    Binnenkort  │ 🐷 Financiën   Binnenkort         │
│ 4 open · ★ Belasting  ├──────────────────────────┼───────────────────────────────────┤
│ + Nieuwe taak…        │ 📓 Notities  Binnenkort  │ 🗂 Projecten   Binnenkort         │
└───────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

- 12-koloms raster blijft (max ± 2300 px).
- **Rij 1 — kop** (12 kolommen): links datum/klok/begroeting/volgende afspraak (zoals nu), **midden de
  compacte agenda** (vult de lege ruimte, max ± 960 px breed), rechts het weer + tandwiel.
- **Rij 2 — tegels**: To-do-kaart + snel toevoegen (4 kolommen) en de vier onderwerp-tegels in een 2 × 2-blok
  (8 kolommen).
- Doel: op 2560×1440 én 1920×1080 past alles **zonder scrollen**.
- 1280–1800 px: zelfde indeling, compacter.
- 900–1280 px (iPad liggend): kop in twee regels (compacte agenda over de volle breedte onder links/weer);
  To-do over de volle breedte, tegels 2 × 2 eronder.
- < 900 px (iPad staand, telefoon): alles onder elkaar; tegels één kolom (telefoon) of 2 × 2 (≥ 600 px).
- Het grote tijdlijn-blok van ronde 1 verdwijnt van de homepagina.

## Compacte agenda (midden van de kop)

- **Dagbalk**: liggende balk 07:00–23:00 (uitgebreid zoals `dayWindow`), uurlabels om de 3 uur
  (09, 12, 15, 18, 21), afspraken als gekleurde blokjes (zelfde 6 tinten via `colorIndex`); overlappende
  afspraken in rijtjes boven elkaar (max. 3, uit `layoutDay`). Koraal **NU-streepje** schuift mee (elke 30 s).
  Afgelopen deel van de dag iets vager.
- **Hele-dag-afspraken**: max. 2 labeltjes boven de balk, daarna "+N".
- **Lijstje** onder de balk: de eerstvolgende **max. 3** afspraken van vandaag die nog niet voorbij zijn
  ("14:30 Sportschool"; een lopende afspraak met "nu"). Niets meer vandaag → "Niets meer vandaag · Morgen
  09:00 Tandarts" (eerste afspraak van morgen); helemaal niets vandaag én morgen → "Vrije dag 🌿".
- **Hele blok is één knop** (met ⤢-icoontje, `aria-label` "Agenda openen") → opent het agendavenster.
  Uitzondering: bij "geen agenda" en "mislukt zonder cache" is het blok géén knop (dan staan er eigen
  knoppen in, zie hieronder).
- Statussen: geen agenda → "Koppel je agenda →" (opent Instellingen, niet het venster); laden zonder cache →
  "Agenda laden…"; mislukt zonder cache → "Agenda niet bereikbaar · Opnieuw proberen"; verouderd →
  "niet bijgewerkt"-label (zoals nu).
- De regel "Volgende afspraak / Nu bezig" links in de kop blijft zoals in ronde 1.

## Agendavenster

- Native `<dialog>` zoals het Overzicht-venster: (bijna) volledig scherm — `min(1600px, 100vw − 48px)` ×
  `100dvh − 48px`. Sluiten met ×, Esc of klik naast het venster.
- Bovenaan: titel (bijv. "Maandag 5 oktober", "Week 41", "5 okt – 8 nov"), schakelaar **Dag | Week | Maand**
  (onthouden in `localStorage['dashboard.view']`), "niet bijgewerkt"-label indien van toepassing.
- **Dag**: het uurraster uit ronde 1 (blokken, overlap naast elkaar, NU-lijn alleen op vandaag), voor een
  **gekozen dag**. ‹ › bladert per dag, "Vandaag" springt terug; bladeren blijft binnen het opgehaalde bereik
  (knoppen uitgeschakeld aan de randen). Bij openen staat de dag op vandaag.
- **Week**: 7 kolommen ma–zo zoals ronde 1, met ‹ › per week binnen het bereik (5 weken) en "Vandaag".
- **Maand**: raster van 5 × 7 dagen vanaf de maandag van deze week. Per dag: dagnummer (op de 1e van een maand
  met maandnaam, "1 nov"), daaronder max. 3 regels — eerst hele-dag-afspraken als gekleurd labeltje, dan
  afspraken als "● 09:00 Titel" — en "+N meer". Vandaag uitgelicht, afgelopen dagen vager.
  **Klik op een dag** → Dag-weergave van die dag.
- Scrollen naar "nu" gebeurt alleen bij openen en bij wisselen van weergave/dag (niet meer na elke verversing —
  lost uitgesteld punt "tijdlijn springt terug" op).
- Lege staten zoals ronde 1 ("Niks in je agenda vandaag/deze week"; in maand: geen melding, gewoon lege dagen).

## Agenda-functie (server)

- Bereik wordt **maandag 00:00 van deze week t/m 35 dagen later** (Amsterdamse middernachten), via
  `calendarRange`. Al het andere blijft (auth-check, 15 MB-grens, 8 s timeout, foutcodes).
- Melding na koppelen: "Gekoppeld: N afspraken in de komende 5 weken" (lost uitgesteld punt "telt niet deze
  week" op).
- Rekentijd blijft ruim binnen de grens (nu ± 0,6 s inclusief ophalen); de bestaande test met een reeks sinds
  1990 bewaakt het uitvouwen.

## Onderwerp-tegels en pagina's

- Eén lijst met tegel-definities (`src/dashboard/topics.tsx`): `{ id, title, route, line, art }`:
  - Doelen — `#/doelen` — "Je doelen voor deze week" — vlaggetje op een heuvel
  - Financiën — `#/financien` — "Overzicht van je geld" — spaarvarken met muntjes
  - Notities — `#/notities` — "Losse gedachten en lijstjes" — opengeslagen schriftje met potlood
  - Projecten — `#/projecten` — "Waar je aan werkt" — stapeltje mapjes
- Tegel = bestaande `Tile` (illustratie, titel, kerngetal, regel, "Bekijk alles →"); kerngetal
  "Binnenkort" in rustige (muted) stijl.
- Router: routes `/doelen`, `/financien`, `/notities`, `/projecten` erbij; onbekend → dashboard.
- **Onderwerp-pagina** (één herbruikbaar component): "‹ Dashboard"-knop, grote illustratie, titel en
  "Hier komen straks je doelen." (per onderwerp), zelfde achtergrond/dag-nacht als de rest.

## Testen

- **Vitest (pure functies)**:
  - `upcoming(events, now, limit)` → resterende afspraken van vandaag / eerste van morgen / leeg (incl.
    lopende afspraak, afspraak van gisteren die nog loopt, hele-dag genegeerd).
  - `stripPosition(min, window)` → percentage op de dagbalk (begin, eind, NU, buiten venster).
  - `monthGrid(now)` → 35 datums vanaf maandag van deze week (ook over maand- en wintertijdgrens).
  - `eventsOnDay(events, day)` → hele-dag + meerdaagse + gewone afspraken van een dag, gesorteerd.
  - `calendarRange(now)` → maandag t/m +35 dagen (rond de wintertijd).
  - `parseRoute` → nieuwe routes.
- **Browser**: 2560×1440 en 1920×1080 zonder scrollen; 1280, iPad liggend/staand, telefoon zonder horizontale
  scroll. Venster opent/sluit (Esc, ×, buiten klikken); Maand → klik dag → Dag van die dag; ‹ › begrensd;
  tegels openen hun pagina en "‹ Dashboard" terug; licht en donker.

## Bestanden (globaal)

| Bestand | Wat |
|---|---|
| `src/dashboard/AgendaStrip.tsx` | compacte agenda in de kop |
| `src/dashboard/AgendaDialog.tsx` | groot venster met Dag/Week/Maand |
| `src/dashboard/Timeline.tsx` | aangepast: gekozen dag, ‹ ›, scroll alleen bij openen/wisselen |
| `src/dashboard/MonthView.tsx` | maandraster |
| `src/dashboard/topics.tsx` | tegel-definities + illustraties |
| `src/pages/TopicPage.tsx` | lege onderwerp-pagina |
| `src/lib/dayMath.ts` | `upcoming`, `stripPosition`, `monthGrid`, `eventsOnDay` |
| `src/lib/router.ts` | nieuwe routes |
| `supabase/functions/dashboard-calendar/expand.ts` | `calendarRange` → 35 dagen |
| `src/pages/DashboardPage.tsx`, `src/dashboard/TodayHeader.tsx`, `src/styles.css` | nieuwe indeling |
