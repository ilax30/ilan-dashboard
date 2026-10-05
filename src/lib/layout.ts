import { useCallback, useEffect, useRef, useState } from 'react'
import { getSettings, saveSettings } from './settings'

// Indeling van het dashboard: welke tegel op welke plek staat (1 groot, 1 middel, 4 klein).
// Opgeslagen in je account (dashboard_settings.layout) én op het apparaat, voor direct en offline openen.

export type WidgetId = 'agenda' | 'todo' | 'doelen' | 'financien' | 'notities' | 'projecten'
export type SlotSize = 'groot' | 'middel' | 'klein'
export type Layout = { groot: WidgetId; middel: WidgetId; klein: [WidgetId, WidgetId, WidgetId, WidgetId] }
/** Een plek: 'groot', 'middel' of de index (0–3) van een kleine plek. */
export type SlotRef = 'groot' | 'middel' | 0 | 1 | 2 | 3

export const DEFAULT_LAYOUT: Layout = {
  groot: 'agenda',
  middel: 'todo',
  klein: ['financien', 'doelen', 'notities', 'projecten'],
}

const ORDER: WidgetId[] = [DEFAULT_LAYOUT.groot, DEFAULT_LAYOUT.middel, ...DEFAULT_LAYOUT.klein]

const get = (l: Layout, ref: SlotRef): WidgetId => (typeof ref === 'number' ? l.klein[ref] : l[ref])

function set(l: Layout, ref: SlotRef, id: WidgetId) {
  if (typeof ref === 'number') l.klein[ref] = id
  else l[ref] = id
}

/** Twee plekken ruilen van tegel; geeft een nieuw object. */
export function swapSlots(layout: Layout, a: SlotRef, b: SlotRef): Layout {
  const next: Layout = { ...layout, klein: [...layout.klein] }
  const first = get(layout, a)
  set(next, a, get(layout, b))
  set(next, b, first)
  return next
}

/** Maak van wat er ook opgeslagen is een geldige indeling: elke tegel precies één keer. */
export function normalizeLayout(raw: unknown): Layout {
  if (!raw || typeof raw !== 'object') return DEFAULT_LAYOUT
  const r = raw as { groot?: unknown; middel?: unknown; klein?: unknown }
  const wanted = [r.groot, r.middel, ...(Array.isArray(r.klein) ? r.klein.slice(0, 4) : [])]
  while (wanted.length < 6) wanted.push(undefined)
  const used = new Set<WidgetId>()
  const slots = wanted.map((id) => {
    if (typeof id === 'string' && (ORDER as string[]).includes(id) && !used.has(id as WidgetId)) {
      used.add(id as WidgetId)
      return id as WidgetId
    }
    return null
  })
  const missing = ORDER.filter((id) => !used.has(id))
  const filled = slots.map((id) => id ?? (missing.shift() as WidgetId))
  return { groot: filled[0], middel: filled[1], klein: [filled[2], filled[3], filled[4], filled[5]] }
}

const LOCAL_KEY = 'dashboard.layout'
const PENDING_KEY = 'dashboard.layout.pending'

function readLocal(): Layout {
  try {
    return normalizeLayout(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null'))
  } catch {
    return DEFAULT_LAYOUT
  }
}

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // alleen een gemak
  }
}

const isPending = () => {
  try {
    return localStorage.getItem(PENDING_KEY) === '1'
  } catch {
    return false
  }
}

/** De indeling: direct uit het apparaat, daarna bijgewerkt uit je account; wijzigingen gaan naar beide. */
export function useLayout(): { layout: Layout; setLayout: (l: Layout) => void } {
  const [layout, setState] = useState<Layout>(readLocal)
  const current = useRef(layout)
  current.current = layout

  const push = useCallback(() => {
    saveSettings({ layout: current.current })
      .then(() => store(PENDING_KEY, null))
      .catch(() => {}) // blijft "nog op te slaan"; volgende keer opnieuw
  }, [])

  const sync = useCallback(() => {
    if (isPending()) return push()
    getSettings()
      .then((s) => {
        if (!s.layout || isPending()) return
        const l = normalizeLayout(s.layout)
        store(LOCAL_KEY, JSON.stringify(l))
        setState(l)
      })
      .catch(() => {})
  }, [push])

  useEffect(() => {
    sync()
    const onVisible = () => {
      if (!document.hidden) sync()
    }
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  const setLayout = useCallback(
    (l: Layout) => {
      current.current = l
      setState(l)
      store(LOCAL_KEY, JSON.stringify(l))
      store(PENDING_KEY, '1')
      push()
    },
    [push],
  )

  return { layout, setLayout }
}
