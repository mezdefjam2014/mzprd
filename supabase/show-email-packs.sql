-- MZPRD: weekly Show, email list, pack size tracking. Already run once in Supabase SQL Editor (safe to run again).

-- ===== Shows (the weekly 5 minute pixel performance) =====
create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text not null default 'city',
  script jsonb not null default '{}'::jsonb,   -- setlist, timeline, effects, milestones (tiny, no big files)
  schedule_at timestamptz,                     -- when the show goes live
  status text not null default 'draft' check (status in ('draft','published','archived')),
  hearts bigint not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.shows enable row level security;
drop policy if exists "public read shows" on public.shows;
create policy "public read shows" on public.shows for select using (status in ('published','archived'));
drop policy if exists "admin all shows" on public.shows;
create policy "admin all shows" on public.shows for all using (public.is_admin()) with check (public.is_admin());

-- heart tap rate limiting (written only by the edge function)
create table if not exists public.show_heart_log (
  browser_id text primary key,
  window_start timestamptz not null default now(),
  taps int not null default 0
);
alter table public.show_heart_log enable row level security;

create or replace function public.add_hearts(sid uuid, n int)
returns bigint language sql security definer set search_path = public as $$
  update public.shows set hearts = hearts + greatest(0, least(n, 200))
  where id = sid and status = 'published' returning hearts;
$$;
revoke all on function public.add_hearts(uuid, int) from public, anon, authenticated;

-- ===== Email list (only people who opted in) =====
create table if not exists public.email_list (
  id bigserial primary key,
  email text not null,
  source text not null default 'site',     -- site | checkout | show | admin
  created_at timestamptz not null default now(),
  unsub_at timestamptz
);
create unique index if not exists email_list_email on public.email_list (lower(email));
alter table public.email_list enable row level security;
drop policy if exists "admin all email_list" on public.email_list;
create policy "admin all email_list" on public.email_list for all using (public.is_admin()) with check (public.is_admin());

alter table public.orders add column if not exists optin boolean not null default false;

-- ===== Packs: remember how much cloud space each published pack uses =====
alter table public.packs add column if not exists size_bytes bigint not null default 0;
