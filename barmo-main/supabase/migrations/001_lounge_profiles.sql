-- BARMO accounts, step 1: one private row per signed-in user (profile + quest progress).
-- Run in Supabase: SQL Editor -> paste -> Run. Safe to run twice.
create table if not exists public.lounge_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  uid        text not null unique check (char_length(uid) between 8 and 64), -- the lounge id friends know you by
  pub        jsonb not null default '{}'::jsonb check (pg_column_size(pub) < 8000),
  quests     jsonb not null default '{}'::jsonb check (pg_column_size(quests) < 8000),
  updated_at timestamptz not null default now()
);

alter table public.lounge_profiles enable row level security;

drop policy if exists "own profile: read" on public.lounge_profiles;
drop policy if exists "own profile: insert" on public.lounge_profiles;
drop policy if exists "own profile: update" on public.lounge_profiles;
drop policy if exists "own profile: delete" on public.lounge_profiles;

create policy "own profile: read"   on public.lounge_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profile: insert" on public.lounge_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profile: update" on public.lounge_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile: delete" on public.lounge_profiles for delete to authenticated using ((select auth.uid()) = user_id);
