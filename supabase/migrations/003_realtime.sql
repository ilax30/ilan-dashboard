-- Live-sync tussen apparaten: wijzigingen in todos doorsturen via Supabase Realtime.
-- replica identity full: ook bij verwijderen gaat user_id mee, zodat het filter per gebruiker werkt.
alter table public.todos replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todos'
  ) then
    alter publication supabase_realtime add table public.todos;
  end if;
end $$;
