import type { SupabaseClient } from '@supabase/supabase-js'
import type { Todo, TodoStore } from './types'

const COLUMNS = 'id, title, position, created_at, done_at, starred, notes'

export function createSupabaseStore(db: SupabaseClient): TodoStore {
  const todos = () => db.from('todos')

  return {
    async list() {
      const { data, error } = await todos()
        .select(COLUMNS)
        .is('done_at', null)
        .order('starred', { ascending: false })
        .order('position', { ascending: true })
      if (error) throw error
      return data as Todo[]
    },
    async update(id, patch) {
      const { error } = await todos().update(patch).eq('id', id)
      if (error) throw error
    },
    async create(todo) {
      const { error } = await todos().upsert(todo)
      if (error) throw error
    },
    async remove(id) {
      const { error } = await todos().delete().eq('id', id)
      if (error) throw error
    },
    async countDoneSince(sinceIso) {
      const { count, error } = await todos()
        .select('id', { count: 'exact', head: true })
        .gte('done_at', sinceIso)
      if (error) throw error
      return count ?? 0
    },
    async listDoneSince(sinceIso) {
      const { data, error } = await todos()
        .select(COLUMNS)
        .gte('done_at', sinceIso)
        .order('done_at', { ascending: false })
      if (error) throw error
      return data as Todo[]
    },
  }
}
