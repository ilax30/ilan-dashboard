import { localStore } from './localStore'
import { supabase } from './supabase'
import { createSupabaseStore } from './supabaseStore'

export const usingSupabase = supabase !== null
export const store = supabase ? createSupabaseStore(supabase) : localStore
