-- BARMO accounts, step 3: tokens, shop and leaderboard. Run after 001 and 002. Safe to run twice.
-- Nothing here can be changed straight from the browser: balances only move through the functions below.

create table if not exists public.wallets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  tokens     int  not null default 0 check (tokens >= 0),
  earned     int  not null default 0 check (earned >= 0),      -- lifetime, drives the leaderboard
  last_daily date,
  equipped   jsonb not null default '{}'::jsonb check (pg_column_size(equipped) < 1000),
  on_board   boolean not null default true,                    -- show my name on the leaderboard
  updated_at timestamptz not null default now()
);
create table if not exists public.quest_rewards (quest_id text primary key, tokens int not null check (tokens between 1 and 100));
create table if not exists public.quest_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_id text not null references public.quest_rewards (quest_id),
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);
create table if not exists public.shop_items (
  id text primary key, name text not null,
  kind text not null check (kind in ('hoverboard','pet','aura')),
  price int not null check (price > 0), rarity text not null default 'common', active boolean not null default true
);
create table if not exists public.purchases (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.shop_items (id),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.wallets enable row level security;
alter table public.quest_rewards enable row level security;
alter table public.quest_claims enable row level security;
alter table public.shop_items enable row level security;
alter table public.purchases enable row level security;
drop policy if exists "wallet: read own" on public.wallets;
drop policy if exists "claims: read own" on public.quest_claims;
drop policy if exists "purchases: read own" on public.purchases;
drop policy if exists "rewards: read all" on public.quest_rewards;
drop policy if exists "items: read all" on public.shop_items;
create policy "wallet: read own"    on public.wallets      for select to authenticated using ((select auth.uid()) = user_id);
create policy "claims: read own"    on public.quest_claims for select to authenticated using ((select auth.uid()) = user_id);
create policy "purchases: read own" on public.purchases    for select to authenticated using ((select auth.uid()) = user_id);
create policy "rewards: read all"   on public.quest_rewards for select to anon, authenticated using (true);
create policy "items: read all"     on public.shop_items    for select to anon, authenticated using (true);
-- no insert/update/delete policies on purpose: only the functions below can write.

insert into public.quest_rewards (quest_id, tokens) values
 ('profile',20),('walk',10),('zone_coffee',10),('zone_games',10),('zone_ideas',10),('zone_chill',10),('zone_orb',10),('zone_pod',10),('zone_roof',10),
 ('orb',20),('wave',10),('dance',10),('dice',10),('idea',15),('chat',10),('community',15),('request',20),('friend',30),('dm',15),
 ('game',20),('win',30),('style',15),('group',25)
on conflict (quest_id) do update set tokens = excluded.tokens;

insert into public.shop_items (id, name, kind, price, rarity) values
 ('hb_terminal','Terminal','hoverboard',50,'common'),('hb_gradient','Gradient Descent','hoverboard',100,'rare'),('hb_tensor','Tensor Core','hoverboard',180,'epic'),
 ('pet_byte','Byte','pet',60,'common'),('pet_glitch','Glitch','pet',110,'rare'),('pet_neuron','Neuron','pet',200,'epic'),
 ('aura_attention','Attention Halo','aura',70,'common'),('aura_stream','Token Stream','aura',120,'rare'),('aura_latent','Latent Space','aura',220,'epic')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, price = excluded.price, rarity = excluded.rarity;

-- One-time reward per quest. Unknown or repeated claims pay 0.
create or replace function public.claim_quest(q text) returns int language plpgsql security definer set search_path = public as $$
declare r int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select tokens into r from public.quest_rewards where quest_id = q;
  if r is null then return 0; end if;
  insert into public.quest_claims (user_id, quest_id) values (auth.uid(), q) on conflict do nothing;
  if not found then return 0; end if;
  insert into public.wallets (user_id, tokens, earned) values (auth.uid(), r, r)
    on conflict (user_id) do update set tokens = public.wallets.tokens + r, earned = public.wallets.earned + r, updated_at = now();
  return r;
end $$;

-- +10 once per UTC day.
create or replace function public.claim_daily() returns int language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'utc')::date; n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.wallets (user_id) values (auth.uid()) on conflict do nothing;
  update public.wallets set tokens = tokens + 10, earned = earned + 10, last_daily = d, updated_at = now()
    where user_id = auth.uid() and (last_daily is null or last_daily < d);
  get diagnostics n = row_count;
  return case when n > 0 then 10 else 0 end;
end $$;

create or replace function public.buy_item(i text) returns int language plpgsql security definer set search_path = public as $$
declare p int; bal int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select price into p from public.shop_items where id = i and active;
  if p is null then raise exception 'unknown item'; end if;
  if exists (select 1 from public.purchases where user_id = auth.uid() and item_id = i) then raise exception 'already owned'; end if;
  update public.wallets set tokens = tokens - p, updated_at = now() where user_id = auth.uid() and tokens >= p returning tokens into bal;
  if bal is null then raise exception 'not enough tokens'; end if;
  insert into public.purchases (user_id, item_id) values (auth.uid(), i);
  return bal;
end $$;

create or replace function public.equip_item(i text, on_ boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare k text; e jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select kind into k from public.shop_items where id = i;
  if k is null then raise exception 'unknown item'; end if;
  if on_ then
    if not exists (select 1 from public.purchases where user_id = auth.uid() and item_id = i) then raise exception 'not owned'; end if;
    update public.wallets set equipped = equipped || jsonb_build_object(k, i) where user_id = auth.uid() returning equipped into e;
  else
    update public.wallets set equipped = equipped - k where user_id = auth.uid() and equipped ->> k = i returning equipped into e;
  end if;
  return coalesce(e, '{}'::jsonb);
end $$;

create or replace function public.set_board_visibility(v boolean) returns void language sql security definer set search_path = public as $$
  update public.wallets set on_board = v where user_id = auth.uid()
$$;

-- Public top list: display name, avatar and lifetime tokens only, and only for people who left it on.
create or replace function public.leaderboard(lim int default 20) returns table (rnk bigint, nm text, avatar text, total int)
language sql stable security definer set search_path = public as $$
  select row_number() over (order by w.earned desc, w.updated_at asc),
         left(coalesce(p.pub ->> 'name', 'Anon'), 20), coalesce(p.pub ->> 'av', 'atlas'), w.earned
  from public.wallets w join public.lounge_profiles p on p.user_id = w.user_id
  where w.on_board and w.earned > 0
  order by 1 limit least(coalesce(lim, 20), 50)
$$;

revoke all on function public.claim_quest(text), public.claim_daily(), public.buy_item(text), public.equip_item(text, boolean), public.set_board_visibility(boolean) from public, anon;
grant execute on function public.claim_quest(text), public.claim_daily(), public.buy_item(text), public.equip_item(text, boolean), public.set_board_visibility(boolean) to authenticated;
grant execute on function public.leaderboard(int) to anon, authenticated;
