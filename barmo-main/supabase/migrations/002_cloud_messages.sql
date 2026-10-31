-- BARMO accounts, step 2: cloud friends backup + private messages between signed-in people.
-- Run after 001. Safe to run twice.

-- Friends / blocked / muted backup lives on your own profile row.
alter table public.lounge_profiles
  add column if not exists social jsonb not null default '{}'::jsonb check (pg_column_size(social) < 60000);

-- "Which lounge id am I?" for the signed-in user (reads only their own row via RLS).
create or replace function public.my_uid() returns text language sql stable as $$
  select uid from public.lounge_profiles where user_id = (select auth.uid())
$$;

-- Routing helper: of these lounge ids, which belong to accounts? Returns ids only, max 50 per call.
create or replace function public.account_uids(uids text[]) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(uid), '{}') from public.lounge_profiles where uid = any (uids[1:50])
$$;
revoke all on function public.account_uids(text[]) from public, anon;
grant execute on function public.account_uids(text[]) to authenticated;

create table if not exists public.direct_messages (
  id         text primary key check (char_length(id) between 8 and 64),
  from_uid   text not null,
  to_uid     text not null check (to_uid <> from_uid),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists dm_to_idx   on public.direct_messages (to_uid, created_at desc);
create index if not exists dm_from_idx on public.direct_messages (from_uid, created_at desc);

alter table public.direct_messages enable row level security;
drop policy if exists "dm: read mine"   on public.direct_messages;
drop policy if exists "dm: send as me"  on public.direct_messages;
drop policy if exists "dm: delete mine" on public.direct_messages;
create policy "dm: read mine"   on public.direct_messages for select to authenticated using (from_uid = public.my_uid() or to_uid = public.my_uid());
create policy "dm: send as me"  on public.direct_messages for insert to authenticated with check (from_uid = public.my_uid());
create policy "dm: delete mine" on public.direct_messages for delete to authenticated using (from_uid = public.my_uid());

-- Spam guard: at most 30 messages a minute per sender.
create or replace function public.dm_rate_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.direct_messages where from_uid = new.from_uid and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Slow down: too many messages' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists dm_rate on public.direct_messages;
create trigger dm_rate before insert on public.direct_messages for each row execute function public.dm_rate_limit();

-- Live delivery (Realtime respects the read policy above).
do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null; end $$;
