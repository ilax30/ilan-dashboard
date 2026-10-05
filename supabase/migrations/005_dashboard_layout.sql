-- Indeling van het dashboard (welke tegel op welke plek). Valt onder dezelfde RLS-regel als de rest van de rij.
alter table public.dashboard_settings add column if not exists layout jsonb;
