/** Eén afspraak uit de agenda. Tijden als ISO-string; hele dag: start = 00:00, end = 00:00 de dag erna. */
export type CalEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
}
