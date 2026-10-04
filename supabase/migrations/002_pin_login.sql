-- Inloggen met alleen een pincode (zie supabase/functions/todo-pin-login).
-- Eén rij voor de eigenaar; alleen de server-functie (service role) kan erbij.
create table if not exists public.todo_pin (
  id int primary key default 1 check (id = 1),
  user_id uuid not null references auth.users on delete cascade,
  salt text not null,
  hash text not null,          -- sha256(salt || pincode), hex
  failed int not null default 0,
  locked_until timestamptz
);

alter table public.todo_pin enable row level security;
revoke all on public.todo_pin from anon, authenticated;

-- Eerste pincode instellen (vervang <PINCODE> en het e-mailadres; niet committen met echte waarde):
-- insert into public.todo_pin (id, user_id, salt, hash)
-- select 1, u.id, s.salt, encode(extensions.digest(s.salt || '<PINCODE>', 'sha256'), 'hex')
-- from auth.users u, (select gen_random_uuid()::text as salt) s
-- where u.email = 'jouw@email.nl';
