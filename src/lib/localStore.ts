import { compareTodos, type Todo, type TodoStore } from './types'

const KEY = 'notitie.todos.v1'

function read(): Todo[] {
  try {
    const raw = localStorage.getItem(KEY)
    // Oudere opgeslagen taken missen nieuwere velden; vul ze aan.
    return raw ? (JSON.parse(raw) as Todo[]).map((t) => ({ ...t, starred: !!t.starred, notes: t.notes ?? '' })) : []
  } catch {
    return []
  }
}

function write(todos: Todo[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos))
  } catch {
    /* opslag vol of geblokkeerd; niets aan te doen */
  }
}

export const localStore: TodoStore = {
  async list() {
    return read()
      .filter((t) => !t.done_at)
      .sort(compareTodos)
  },
  async update(id, patch) {
    write(read().map((t) => (t.id === id ? { ...t, ...patch } : t)))
  },
  async create(todo) {
    write([...read().filter((t) => t.id !== todo.id), todo])
  },
  async remove(id) {
    write(read().filter((t) => t.id !== id))
  },
  async countDoneSince(sinceIso) {
    return read().filter((t) => t.done_at && t.done_at >= sinceIso).length
  },
  async listDoneSince(sinceIso) {
    return read()
      .filter((t) => t.done_at && t.done_at >= sinceIso)
      .sort((a, b) => b.done_at!.localeCompare(a.done_at!))
  },
}
