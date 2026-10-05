# Ilan Dashboard

Een persoonlijk dashboard: agenda, taken, notities, financiën, weer en (later) doelen en projecten. Op de takenpagina zet je taken erin, zie je hoe lang ze er al staan, en sleep je ze naar **Gedaan**. Ze verdwijnen dan meteen, en tot 5 seconden later kun je dat nog ongedaan maken.

Gebouwd met Vite, React en TypeScript, `@dnd-kit` voor het slepen en (optioneel) Supabase voor opslag en login.

## Dashboard

Na het inloggen kom je op het **dashboard** (`#/`). Links staat op elke pagina een **zijbalk** met Home, Taken
(`#/todo`), Agenda, Notities, Financiën, Doelen en Projecten (die twee volgen later), plus snel een taak toevoegen,
het dag/nacht-schuifje, Instellingen (ook vergrendelen, pincode en uitloggen) en Indeling aanpassen. Op de iPad is de zijbalk een icoonbalk (⋯ klapt hem uit),
op de telefoon een menuknop.

- **Kop**: datum en klok, begroeting, je volgende afspraak met aftellen ("over 1u 14m") en hoeveel van je dag
  (07:00–23:00) voorbij is. Daarnaast de eerstvolgende afspraak en betaling, ook als die pas over dagen zijn.
  Rechts het **weer** voor je woonplaats.
- **Tegels** op vaste plekken: 1 groot, 1 middel en 4 klein. Standaard Agenda groot, To-do middel en Financiën,
  Doelen, Notities en Projecten klein. Elke tegel past zich aan de maat aan (Agenda klein = volgende afspraak +
  dagbalk, groot = uurrooster; To-do middel = 5 taken met vinkje, groot = 10 + toevoegen).
- **Indeling aanpassen** (in de zijbalk): sleep een tegel op een andere plek en ze ruilen. "Standaardindeling"
  zet alles terug. Je indeling wordt in je account bewaard (zelfde op pc en iPad) én op het apparaat.
- **Agenda** (`#/agenda`): links een mini-maand en de komende 14 dagen, rechts Dag, Week en Maand met een
  NU-lijn. 13 weken vooruit vanaf deze maandag; dagen daarbuiten zijn gearceerd.
- **Notities** (`#/notities`): simpel zoals Apple Notes. Zoeken, vastpinnen, verwijderen met ongedaan maken,
  automatisch opslaan en vinkjes met `[ ]` / `[x]` aan het begin van een regel. Lukt opslaan niet (offline), dan
  blijft je tekst op het apparaat bewaard en wordt hij bij het volgende bezoek alsnog opgeslagen.
  **Let op: notities zijn niet versleuteld. Zet er geen wachtwoorden of pincodes in.**
- **Financiën** (`#/financien`): je vaste lasten (huur, abonnementen, verzekeringen), met de hand bijgehouden,
  zonder bankkoppeling. Bovenaan openstaand deze maand, vaste lasten per maand en de volgende betaling. Met
  **Betaald** schuift een last door naar de volgende datum (een last op de 31e komt na februari weer op de 31e).
- Doelen en Projecten zijn er nog als lege pagina; de inhoud volgt later.

**Look**: licht thema "Zandsteen", donker thema neutraal antraciet, lettertype Inter en Phosphor-iconen. Op de achtergrond
een natuurfoto per dagdeel (ochtend, dag, avond, nacht; op basis van zonsopkomst en -ondergang in je woonplaats) en
in de weerkaart een foto bij het weer. Bronnen: `public/landschap/BRONNEN.md`. Tijdens het
ontwikkelen kun je een dagdeel bekijken met `?dagdeel=ochtend|dag|avond|nacht` in de adresbalk.

**Instellingen** (zijbalk):

- **Agenda**: plak het geheime iCal-adres van Google Agenda. Je vindt het op de computer via Google Agenda →
  Instellingen (tandwiel) → links je agenda onder "Instellingen voor mijn agenda's" → "Agenda integreren" →
  **Geheim adres in iCal-indeling**. De link wordt eerst getest en alleen opgeslagen als hij werkt. Hij staat in
  `public.dashboard_settings` (alleen jij kunt hem lezen) en wordt opgehaald door de Edge Function
  [`dashboard-calendar`](supabase/functions/dashboard-calendar/index.ts). Deel deze link met niemand.
- **Woonplaats**: zoek en kies je plaats; het weer komt van [Open-Meteo](https://open-meteo.com) (gratis, geen sleutel).

Agenda, weer, woonplaats en indeling worden onthouden op het apparaat, dus het dashboard werkt ook offline
(met "niet bijgewerkt").

Tests: `npm test` (Vitest, altijd in Amsterdamse tijd: dag-logica, dagdelen, indeling, agenda-bladeren, weer, iCal-uitvouwing incl. zomer-/wintertijd).

## Lokaal draaien

```bash
npm install
npm run dev -- --port 5174
```

Zonder `.env` slaat de app alles op in de browser (localStorage). Login is dan niet nodig.

> **Let op de poorten:** de geïnstalleerde app draait op `http://localhost:5173` (`npm run build` + `npm run preview -- --port 5173`) en heeft daar een service worker. Ontwikkel daarom op poort **5174**, anders krijg je de opgeslagen app-versie te zien in plaats van je wijzigingen.

## Als app installeren (gratis, PWA)

1. `npm run build` en daarna `npm run preview -- --port 5173`.
2. Open `http://localhost:5173` in **Chrome** of **Edge**.
3. Klik op het **installeer-icoon** rechts in de adresbalk (of menu ⋮ → *App installeren*).
4. De app krijgt een eigen venster en icoon in je Startmenu/taakbalk en **werkt daarna ook als de server uit staat**.

Updates: opnieuw bouwen en de preview starten; de app haalt de nieuwe versie bij de volgende keer openen vanzelf op.

Telefoon/tablet volgt zodra de app online staat (Cloudflare Pages): daar is "Zet op beginscherm" / "App installeren" mogelijk.

Losse HTML (om te delen/testen): `npm run build:single` → `dist-single/index.html`.

## Bediening

| Actie | Hoe |
|---|---|
| Taak toevoegen | Typ bovenin en druk op Enter |
| Afronden | Sleep naar **Gedaan**, of klap de kaart open en klik **Afronden** (of sneltoets `X`) |
| Favoriet | Klik het sterretje links: favorieten staan altijd bovenaan |
| Volgorde aanpassen | Sleep binnen de lijst |
| Notities | Klik op een taak om hem open te klappen (of `Enter`); links worden klikbaar |
| Bewerken | Het potlood ✎ (Enter = opslaan, Esc = annuleren) |
| Verwijderen | Het × (de kaart scheurt; je kunt het nog ongedaan maken) |
| Touch | Veeg → om af te ronden, ← om te verwijderen; houd vast om te slepen |
| Dag/nacht | Schuifje in de zijbalk |
| Afgerond (72 uur) | Vaste kolom links op brede schermen, anders de knop **Afgerond** |
| Overzicht per maand | Kalender-knopje bij **Deze week** (of in de Afgerond-lade) |
| Links | `https://…` of `www.…` wordt vanzelf een klikbare link |

Op een telefoon houd je een taak even vast om hem te slepen.

## Supabase (opslag + inloggen)

De app gebruikt de tabel `public.todos` in het Supabase-project **Woolley project** (zie [`supabase/migrations/001_todos.sql`](supabase/migrations/001_todos.sql)). Row Level Security staat aan: je ziet alleen je eigen taken, anoniem is er geen toegang.

Lokaal: zet in `.env.local` (wordt niet gecommit):

```
VITE_SUPABASE_URL=https://ifyexmxsueatoaeoxici.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

Dit zijn publieke sleutels; de beveiliging zit in de database-regels.

**Inloggen gaat alleen met een pincode.** De Edge Function [`todo-pin-login`](supabase/functions/todo-pin-login/index.ts) controleert hem op de server (gehasht in `public.todo_pin`, zie [`002_pin_login.sql`](supabase/migrations/002_pin_login.sql)) en geeft bij een goede code een sessie uit, zonder e-mail. Na elke 5 foute pogingen volgt een slot dat steeds verdubbelt (15 min → max. 24 uur).

Daarna blijf je ingelogd; de app vraagt bij openen dezelfde pincode als slot, ook offline (op de pc pas na 2 uur weg, op telefoon/iPad na 10 minuten op de achtergrond). Pincode wijzigen: **Instellingen → Account → Pincode wijzigen** (geldt dan op alle apparaten).

Alle apparaten gebruiken hetzelfde account en dus dezelfde lijst; de lijst ververst zodra je de app weer voor je haalt.

## Online zetten met Cloudflare Pages

1. Zet het project op GitHub.
2. Ga in Cloudflare naar **Workers & Pages → Create → Pages** en koppel de repo.
3. Gebruik deze build-instellingen:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Voeg bij *Environment variables* `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` toe.
5. Zet in Supabase onder **Authentication → URL Configuration** de Cloudflare-URL (bijv. `https://mijn-lijstje.pages.dev`) als *Site URL*, zodat de login-link daarheen terugstuurt.
