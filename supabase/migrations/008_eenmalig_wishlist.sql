-- Ilan Dashboard: eenmalige betalingen bij de vaste lasten, en een verlanglijstje. Alleen de eigenaar; realtime voor sync.

alter table public.bills drop constraint if exists bills_cadence_check;
alter table public.bills add constraint bills_cadence_check
  check (cadence in ('week', 'maand', 'kwartaal', 'jaar', 'eenmalig'));

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(title) between 1 and 200),
  url text not null default '' check (length(url) <= 2000 and (url = '' or url ~* '^https?://')),
  price numeric(10, 2) not null default 0 check (price >= 0),
  group_name text not null default '' check (length(group_name) <= 60),
  bought_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.wishlist is 'Ilan Dashboard: verlanglijstje per gebruiker';

alter table public.wishlist enable row level security;

create policy "own wishlist" on public.wishlist for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.wishlist from anon;
grant select, insert, update, delete on public.wishlist to authenticated;

create index if not exists wishlist_user_idx on public.wishlist (user_id, created_at);

alter table public.wishlist replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wishlist'
  ) then
    alter publication supabase_realtime add table public.wishlist;
  end if;
end $$;
