// Agenda-bestand (ICS) uitvouwen naar losse afspraken binnen een bereik.
// Draait zowel in de Edge Function (Deno) als in Vitest (Node): ical.js wordt daarom
// als parameter meegegeven in plaats van hier geïmporteerd.

export type CalEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
}

// deno-lint-ignore no-explicit-any
type Ical = any
// deno-lint-ignore no-explicit-any
type IcalTime = any

const TZ = 'Europe/Amsterdam'
const MAX_OCCURRENCES = 100_000 // veiligheidsgrens; een dagelijkse reeks sinds 1990 is ± 13.000
const DAY_MS = 24 * 60 * 60 * 1000

/** Verschil (ms) tussen Amsterdamse wandkloktijd en UTC op een bepaald moment. */
function amsterdamOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - utcMs
}

/** Amsterdamse wandkloktijd → UTC-moment (ms). */
function fromAmsterdamWallClock(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  const first = guess - amsterdamOffsetMs(guess)
  return guess - amsterdamOffsetMs(first)
}

/** Middernacht (Amsterdamse tijd) van de dag waarin `now` valt. */
export function amsterdamDayStart(now: Date): Date {
  const local = new Date(now.getTime() + amsterdamOffsetMs(now.getTime()))
  return new Date(fromAmsterdamWallClock(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate()))
}

/**
 * Op te halen bereik: maandag 00:00 van deze week (zodat de weekweergave ook de eerdere dagen toont)
 * tot en met 7 dagen na vandaag, in Amsterdamse middernachten.
 */
export function calendarRange(now: Date): { start: Date; end: Date } {
  const local = new Date(now.getTime() + amsterdamOffsetMs(now.getTime()))
  const y = local.getUTCFullYear()
  const m = local.getUTCMonth() + 1
  const d = local.getUTCDate()
  const sinceMonday = (local.getUTCDay() + 6) % 7
  return { start: new Date(fromAmsterdamWallClock(y, m, d - sinceMonday)), end: new Date(fromAmsterdamWallClock(y, m, d + 8)) }
}

/** ical.js-tijd → UTC-moment. Datums en "zwevende" tijden gelden als Amsterdamse tijd. */
function toUtcMs(time: IcalTime): number {
  const floating = !time.zone || time.zone.tzid === 'floating'
  if (time.isDate || floating) {
    return fromAmsterdamWallClock(time.year, time.month, time.day, time.hour ?? 0, time.minute ?? 0, time.second ?? 0)
  }
  return time.toUnixTime() * 1000
}

export function expandEvents(ICAL: Ical, ics: string, rangeStart: Date, rangeEnd: Date): CalEvent[] {
  let root: Ical
  try {
    root = new ICAL.Component(ICAL.parse(ics))
  } catch {
    throw new Error('parse_failed')
  }
  if (root.name !== 'vcalendar') throw new Error('parse_failed')

  for (const vtz of root.getAllSubcomponents('vtimezone')) {
    ICAL.TimezoneService.register(vtz)
  }

  // Per UID: de hoofdafspraak en eventuele aangepaste instanties (RECURRENCE-ID).
  const masters = new Map<string, Ical>()
  const exceptions: Ical[] = []
  for (const vevent of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent)
    if (event.isRecurrenceException()) exceptions.push(event)
    else masters.set(event.uid, event)
  }
  for (const ex of exceptions) masters.get(ex.uid)?.relateException(ex)

  const from = rangeStart.getTime()
  const to = rangeEnd.getTime()
  const out: CalEvent[] = []

  const push = (item: Ical, startTime: IcalTime, endTime: IcalTime) => {
    if (item.component.getFirstPropertyValue('status') === 'CANCELLED') return
    const start = toUtcMs(startTime)
    const end = Math.max(toUtcMs(endTime ?? startTime), start)
    if (end <= from && !(end === start && start >= from)) return
    if (start >= to) return
    const location = item.location || undefined
    out.push({
      id: `${item.uid}@${new Date(start).toISOString()}`,
      title: item.summary || '(geen titel)',
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      allDay: Boolean(startTime.isDate),
      ...(location ? { location } : {}),
    })
  }

  for (const event of masters.values()) {
    if (!event.isRecurring()) {
      push(event, event.startDate, event.endDate)
      continue
    }
    // Oude herhalingen alleen doorlopen, niet uitwerken (getOccurrenceDetails is duur): een reeks kan
    // tientallen jaren teruggaan. Marge van een dag voor verplaatste instanties.
    const duration = Math.max(0, toUtcMs(event.endDate ?? event.startDate) - toUtcMs(event.startDate))
    const skipBefore = from - duration - DAY_MS
    const it = event.iterator()
    for (let i = 0, next = it.next(); next && i < MAX_OCCURRENCES; i++, next = it.next()) {
      const t = toUtcMs(next)
      if (t >= to) break
      if (t < skipBefore) continue
      const details = event.getOccurrenceDetails(next)
      push(details.item, details.startDate, details.endDate)
    }
  }

  return out.sort((a, b) => a.start.localeCompare(b.start))
}
