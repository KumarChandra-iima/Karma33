-- Karma33 — initial backend schema
--
-- Two tables, both with Row Level Security enabled and scoped to
-- auth.uid() = owner. This matters because the app only ever uses the
-- publishable/anon key client-side — without RLS, that key would let
-- any visitor read or write every user's data.
--
-- Design choice: user_state stores the whole app-state blob as jsonb,
-- mirroring the existing karma33_v1 localStorage shape, rather than a
-- fully normalized relational schema. This lets multi-device sync land
-- without first rewriting how src/App.jsx models its state — a later
-- migration can normalize specific tables (e.g. completions, streaks)
-- once sync is proven out, without changing this one's contract.

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  persona text not null default 'adult' check (persona in ('adult','teens')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── user_state ──────────────────────────────────────────────
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "user_state: select own"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "user_state: insert own"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "user_state: update own"
  on public.user_state for update
  using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_state_touch_updated_at on public.user_state;
create trigger user_state_touch_updated_at
  before update on public.user_state
  for each row execute procedure public.touch_updated_at();
