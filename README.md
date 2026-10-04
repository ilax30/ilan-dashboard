# Ilan's To-Do lijst

Een rustige, persoonlijke to-do app. Je zet taken erin, ziet hoe lang ze er al staan, en sleept ze naar **Gedaan**. Ze verdwijnen dan meteen, en tot 5 seconden later kun je dat nog ongedaan maken.

Gebouwd met Vite, React en TypeScript, `@dnd-kit` voor het slepen en (optioneel) Supabase voor opslag en login.

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
| Dag/nacht | Schuifje linksboven |
| Afgerond (72 uur) | Vaste kolom links op brede schermen, anders de knop **Afgerond** |
| Overzicht per maand | Kalender-knopje bij **Deze week** (of in de Afgerond-lade) |
| Links | `https://…` of `www.…` wordt vanzelf een klikbare link |

Op een telefoon houd je een taak even vast om hem te slepen.

## Supabase koppelen

1. Maak een project aan op [supabase.com](https://supabase.com).
2. Ga naar **SQL Editor** en voer [`supabase/migrations/001_todos.sql`](supabase/migrations/001_todos.sql) uit.
3. Kopieer `.env.example` naar `.env` en vul de Project URL en de anon/publishable key in (te vinden onder *Project Settings → API*).
4. Start de app en log in via de e-mail-link.
5. Zet daarna onder **Authentication → Sign In / Providers** de optie *Allow new users to sign up* uit, zodat alleen jij erin kunt.

Row Level Security staat aan: iedere gebruiker ziet alleen zijn eigen taken. Afgeronde taken blijven in de database bewaard (`done_at`), ze worden alleen niet meer getoond.

> Let op: taken die je lokaal (zonder Supabase) hebt aangemaakt, gaan niet automatisch mee naar Supabase.

## Online zetten met Cloudflare Pages

1. Zet het project op GitHub.
2. Ga in Cloudflare naar **Workers & Pages → Create → Pages** en koppel de repo.
3. Gebruik deze build-instellingen:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Voeg bij *Environment variables* `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` toe.
5. Zet in Supabase onder **Authentication → URL Configuration** de Cloudflare-URL (bijv. `https://mijn-lijstje.pages.dev`) als *Site URL*, zodat de login-link daarheen terugstuurt.
