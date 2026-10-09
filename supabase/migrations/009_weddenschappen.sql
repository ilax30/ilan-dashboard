-- Ilan Dashboard: tennisweddenschappen met bookmakers en bankroll. Alleen de eigenaar; realtime voor sync.

create table if not exists public.bookmakers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 60),
  start_bankroll numeric(12, 2) not null default 0 check (start_bankroll >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  bookmaker_id uuid not null references public.bookmakers on delete restrict,
  category text not null check (category in ('ATP', 'Challenger', 'ITF')),
  match text not null default '' check (length(match) <= 200),
  stake numeric(12, 2) not null check (stake > 0),
  odds numeric(8, 3) not null check (odds > 1),
  placed_on date not null default current_date,
  result text not null default 'open' check (result in ('open', 'won', 'lost')),
  created_at timestamptz not null default now()
);

comment on table public.bookmakers is 'Ilan Dashboard: bookmakers met startbankroll';
comment on table public.bets is 'Ilan Dashboard: tennisweddenschappen';

alter table public.bookmakers enable row level security;
alter table public.bets enable row level security;

create policy "own bookmakers" on public.bookmakers for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own bets" on public.bets for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.bookmakers from anon;
revoke all on public.bets from anon;
grant select, insert, update, delete on public.bookmakers to authenticated;
grant select, insert, update, delete on public.bets to authenticated;

create index if not exists bets_user_idx on public.bets (user_id, placed_on desc);
create index if not exists bets_bookmaker_idx on public.bets (bookmaker_id);
create index if not exists bookmakers_user_idx on public.bookmakers (user_id, created_at);

alter table public.bookmakers replica identity full;
alter table public.bets replica identity full;
do $$
declare t text;
begin
  foreach t in array array['bookmakers', 'bets'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
