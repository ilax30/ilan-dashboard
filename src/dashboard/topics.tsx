import type { Route } from '../lib/router'

// Onderwerpen van het dashboard. Een nieuw onderwerp = één regel hier (+ route in router.ts).

export type Topic = {
  id: 'doelen' | 'financien' | 'notities' | 'projecten'
  title: string
  route: Route
  /** Korte regel op de tegel. */
  line: string
  /** Tekst op de (nog) lege pagina. */
  empty: string
  /** Nog niet aan begonnen: grijs in zijbalk en op het dashboard. */
  later?: boolean
}

export const TOPICS: Topic[] = [
  { id: 'notities', title: 'Notities', route: '/notities', line: 'Losse gedachten en lijstjes', empty: 'Hier komen straks je notities.' },
  { id: 'financien', title: 'Financiën', route: '/financien', line: 'Overzicht van je geld', empty: 'Hier komt straks je geldoverzicht.' },
  { id: 'doelen', title: 'Doelen', route: '/doelen', line: 'Je doelen voor deze week', empty: 'Hier komen straks je doelen.', later: true },
  { id: 'projecten', title: 'Projecten', route: '/projecten', line: 'Waar je aan werkt', empty: 'Hier komen straks je projecten.', later: true },
]

export const topicFor = (route: Route) => TOPICS.find((t) => t.route === route)
