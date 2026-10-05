-- Ilan Dashboard: notities (Apple Notes-simpel). Alleen de eigenaar; realtime voor sync pc <-> iPad.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null default '' check (length(title) <= 300),
  body text not null default '' check (length(body) <= 100000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notes is 'Ilan Dashboard: notities per gebruiker (niet versleuteld: geen wachtwoorden)';

alter table public.notes enable row level security;

create policy "own notes" on public.notes for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

create index if not exists notes_user_idx on public.notes (user_id, pinned desc, updated_at desc);

alter table public.notes replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;
