-- Ilan Dashboard: vaste lasten (abonnementen, huur, verzekeringen). Alleen de eigenaar; realtime voor sync.
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 120),
  amount numeric(10, 2) not null check (amount >= 0),
  cadence text not null check (cadence in ('week', 'maand', 'kwartaal', 'jaar')),
  next_due date not null,
  due_day smallint not null check (due_day between 1 and 31),
  category text not null default 'Overig' check (length(category) <= 40),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.bills is 'Ilan Dashboard: vaste lasten per gebruiker';

alter table public.bills enable row level security;

create policy "own bills" on public.bills for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.bills from anon;
grant select, insert, update, delete on public.bills to authenticated;

create index if not exists bills_user_due_idx on public.bills (user_id, next_due);

alter table public.bills replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bills'
  ) then
    alter publication supabase_realtime add table public.bills;
  end if;
end $$;
