export type Todo = {
  id: string
  title: string
  position: number
  created_at: string
  done_at: string | null
  /** Taken met een ster staan altijd bovenaan. */
  starred: boolean
  /** Vrije notities onder de taak (links worden klikbaar). */
  notes: string
}

export type TodoPatch = Partial<Pick<Todo, 'title' | 'position' | 'done_at' | 'starred' | 'notes'>>

/** Sterren eerst, daarna op positie. */
export function compareTodos(a: Todo, b: Todo) {
  return Number(!!b.starred) - Number(!!a.starred) || a.position - b.position
}

export interface TodoStore {
  /** Open taken, gesorteerd op positie. */
  list(): Promise<Todo[]>
  /** Nieuwe taak, of een verwijderde taak terugzetten (zelfde id en datum). */
  create(todo: Todo): Promise<void>
  update(id: string, patch: TodoPatch): Promise<void>
  remove(id: string): Promise<void>
  countDoneSince(sinceIso: string): Promise<number>
  /** Afgeronde taken sinds een moment, nieuwste eerst. */
  listDoneSince(sinceIso: string): Promise<Todo[]>
}
