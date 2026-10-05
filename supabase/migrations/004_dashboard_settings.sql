-- Dashboard-instellingen per gebruiker: geheime iCal-link en woonplaats voor het weer.
-- Alleen de eigenaar kan zijn eigen rij lezen/schrijven; anoniem geen toegang.
create table if not exists public.dashboard_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  ical_url text,
  city_name text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz not null default now()
);

comment on table public.dashboard_settings is 'Ilan''s To-Do lijst: dashboard-instellingen (iCal-link is geheim, alleen eigenaar)';

alter table public.dashboard_settings enable row level security;

create policy "own dashboard settings" on public.dashboard_settings for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.dashboard_settings from anon;
grant select, insert, update, delete on public.dashboard_settings to authenticated;
