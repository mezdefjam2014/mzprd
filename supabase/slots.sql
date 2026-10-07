-- MZPRD Slots: run this ONCE in Supabase > SQL Editor > New query > Run.
-- Creates the settings, spin log and coupons tables. Only admins can read or change them from the site;
-- the `slots` edge function uses the service role and does all the game logic on the server.

create table if not exists public.slot_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,          -- game is open to visitors
  checkout_ready boolean not null default false,   -- turn on AFTER the checkout function is updated for coupons
  win_chance numeric not null default 0.125,       -- chance a spin wins, 0 to 1 (0.125 = 1 in 8)
  jackpot_chance numeric not null default 0.10,    -- chance a win is the crown jackpot, 0 to 1
  win_pct int not null default 15,                 -- percent off one beat for a normal win
  jackpot_pct int not null default 30,             -- percent off one beat for the jackpot
  coupon_hours int not null default 48,            -- how long a coupon lasts
  spins_per_day int not null default 5,            -- spins per browser per 24 hours
  daily_coupon_cap int not null default 10,        -- max coupons given out per day, all browsers
  cooldown_days int not null default 14,           -- days before the same browser can win again
  updated_at timestamptz not null default now()
);
insert into public.slot_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.slot_spins (
  id bigserial primary key,
  browser_id text not null,
  created_at timestamptz not null default now(),
  reels int[],
  outcome text not null,            -- lose | win | jackpot
  coupon_code text,
  is_test boolean not null default false
);
create index if not exists slot_spins_browser on public.slot_spins (browser_id, created_at desc);
create index if not exists slot_spins_created on public.slot_spins (created_at desc);

create table if not exists public.coupons (
  code text primary key,
  browser_id text not null,
  pct int not null,
  kind text not null,               -- win | jackpot
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reserved_order text,              -- set when a checkout is created with this code
  reserved_at timestamptz,
  used_at timestamptz,              -- set when the payment is captured: the code is then dead
  order_id text,
  is_test boolean not null default false
);
create index if not exists coupons_browser on public.coupons (browser_id, created_at desc);

alter table public.slot_settings enable row level security;
alter table public.slot_spins enable row level security;
alter table public.coupons enable row level security;

drop policy if exists "admin all slot_settings" on public.slot_settings;
create policy "admin all slot_settings" on public.slot_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all slot_spins" on public.slot_spins;
create policy "admin all slot_spins" on public.slot_spins for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all coupons" on public.coupons;
create policy "admin all coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
