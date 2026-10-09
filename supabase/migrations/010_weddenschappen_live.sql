-- Ilan Dashboard: weddenschap live (tijdens de wedstrijd) of pre-match.

alter table public.bets add column if not exists live boolean not null default false;
