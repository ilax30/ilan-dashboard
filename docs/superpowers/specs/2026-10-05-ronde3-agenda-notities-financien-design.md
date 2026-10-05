# Ronde 3 — Agendapagina, Notities en Financiën

Datum: 2026-10-05 · Status: ontwerp, wacht op review · Bouwt voort op ronde 2 (live: ilax30.github.io/ilan-dashboard).
Focus: **desktop** (muis, 1280–2560 px). Touch/telefoon blijft werken maar wordt later verfijnd.

## Wat Ilan zei / koos

- "Ik ben ook niet fan dat agenda geen eigen pagina heeft" + Fantastical-voorbeeld: links mini-maand en lijst van
  komende dagen, rechts Dag/Week/Maand met NU-lijn. Vooruitkijken: **3 maanden**.
- Notities: **simpel zoals Apple Notes**. Financiën: **vaste lasten + betalingen** (zelf invoeren, geen bank).
- Doelen en Projecten: volgende week (staan al grijs).

## A. Agendapagina (`#/agenda`)

Vervangt het agendavenster. Zijbalk "Agenda" en de Agenda-tegel openen deze pagina.

```
┌─────────────────────────┬──────────────────────────────────────────────────────────┐
│  oktober 2026   ‹  ›    │ ‹ Vandaag ›   Week 41 · 5 – 11 okt      [Dag|Week|Maand] │
│ ma di wo do vr za zo    │ hele dag │ Verjaardag Sanne │            │               │
│  •5  6  7 …  (stip =    │ 09:00 ┃ Werk ┃            ┃ Tandarts   ┃               │
│   dag met afspraken)    │ NU ───●────────────────────────────────────────────────  │
│ VANDAAG 5 okt           │ …                                                        │
│ ● 09:00 Werk            │                                                          │
│ MORGEN 6 okt            │                                                          │
│ ● 08:30 Tandarts        │                                                          │
│ WOENSDAG 7 okt …        │                                                          │
└─────────────────────────┴──────────────────────────────────────────────────────────┘
```

- **Links (± 320 px)**: mini-maand (‹ › per maand binnen het bereik; vandaag uitgelicht, gekozen dag/week
  gemarkeerd, stip onder dagen met afspraken; klik = die dag/week rechts). Daaronder **lijst** van de komende
  14 dagen, per dag een kop ("Vandaag 5 okt", "Morgen 6 okt", "Woensdag 7 okt"), hele-dag-labels en
  afspraken als "● 09:00 Titel" (kleur per titel). Lege dagen overslaan.
- **Rechts**: Dag / Week / Maand met ‹ Vandaag ›. Dag en Week = bestaand uurrooster (NU-lijn, overlap naast
  elkaar, hele-dag-rij). Maand = **echte kalendermaand** (ma–zo-raster), max. 3 regels per dag + "+N meer";
  klik op een dag → Dag.
- **Bereik: maandag van deze week t/m 13 weken later** (Edge Function `calendarRange` → 91 dagen); bladeren
  stopt aan de randen.
- Weergave onthouden (`localStorage['agenda.view']`, los van de tegel — lost uitgesteld punt op).

## B. Notities (`#/notities`)

- **Tabel `public.notes`**: `id uuid`, `user_id` (default `auth.uid()`), `title text`, `body text`,
  `pinned bool`, `created_at`, `updated_at`; RLS alleen eigenaar; realtime aan (sync pc ↔ iPad).
- **Pagina**: links lijst (zoekveld, vastgepinde eerst, daarna laatst bewerkt; per notitie titel, eerste regel
  en datum), rechts de notitie: titel + tekst, **automatisch opslaan** (± 0,6 s na typen), links klikbaar.
  **Lijstjes met vinkjes**: een regel die begint met `[ ]` of `[x]` wordt een aanvinkbaar vakje (klik = wisselen
  en opslaan). Knoppen: Nieuwe notitie, Vastpinnen, Verwijderen (met "Ongedaan maken").
- **Tegel**: klein = aantal + laatste titel; middel = 4 laatste notities; groot = 6 + "Nieuwe notitie".
- Lokale testmodus: in localStorage (zoals taken).
- Let op: notities zijn niet versleuteld — **geen wachtwoorden** in notities zetten (melding bij een notitie
  met "wachtwoord" in de titel is niet nodig; wel in de README).

## C. Financiën (`#/financien`)

- **Tabel `public.bills`** (vaste lasten): `id`, `user_id`, `name text`, `amount numeric(10,2)`,
  `cadence text` (`week|maand|kwartaal|jaar`), `next_due date`, `category text` (Wonen, Abonnementen, Verzekering,
  Overig), `active bool`, `created_at`; RLS alleen eigenaar; realtime aan.
- **Betaald markeren** zet `next_due` één periode verder (zelfde dag van de maand; 31 → laatste dag van
  kortere maanden).
- **Pagina**: bovenaan drie cijfers — **Openstaand deze maand** (som van wat deze kalendermaand nog vervalt),
  **Vaste lasten per maand** (genormaliseerd: week × 52/12, kwartaal ÷ 3, jaar ÷ 12), **Volgende betaling**.
  Daaronder de lijst gesorteerd op vervaldatum met badge (te laat / vandaag / binnen 7 dagen), knop
  **Betaald**, bewerken en verwijderen; **+ Vaste last** opent een formulier (naam, bedrag €, frequentie,
  volgende datum, categorie).
- **Tegel** (zoals voorbeeld): "Openstaand € 47,50" + badge "2 betalingen" (binnen 7 dagen), daaronder de
  eerstvolgende 3 met initiaal-avatar, datum en bedrag.
- Bedragen in euro's, Nederlandse notatie (`€ 11,99`).

## Testen

- **Vitest**: `nextDueAfter(date, cadence)` (31 jan + maand → 28/29 feb, jaar, week, kwartaal),
  `openThisMonth`, `monthlyTotal`, `dueSoon(bills, now, 7)`; notities `parseChecklist`/`toggleLine`,
  sorteren (pinned, updated_at), zoeken; agenda `agendaList(events, now, 14)`, `monthMatrix(month)`
  (ma-start, 5 of 6 weken), `calendarRange` 91 dagen.
- **Browser** (desktop 1280/1920/2560): pagina's, opslaan/sync, tegels in 3 maten, licht/donker.

## Volgorde

1. Agendapagina (+ functie 13 weken). 2. Notities. 3. Financiën. Na elk deel live.
