create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(title) between 1 and 500),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  starred boolean not null default false,
  notes text not null default '' check (length(notes) <= 5000)
);

alter table public.todos enable row level security;

create policy "own todos" on public.todos for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists todos_open_idx on public.todos (user_id, position) where done_at is null;
create index if not exists todos_done_idx on public.todos (user_id, done_at) where done_at is not null;
