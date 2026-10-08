-- MZPRD customer accounts (optional). Run once in Supabase SQL editor.
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx on public.orders(user_id);

create table if not exists public.favorites (
  user_id uuid primary key references auth.users(id) on delete cascade,
  likes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.favorites enable row level security;
drop policy if exists fav_own_select on public.favorites;
drop policy if exists fav_own_insert on public.favorites;
drop policy if exists fav_own_update on public.favorites;
create policy fav_own_select on public.favorites for select using (auth.uid() = user_id);
create policy fav_own_insert on public.favorites for insert with check (auth.uid() = user_id);
create policy fav_own_update on public.favorites for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.site_settings add column if not exists accounts_redownload boolean not null default true;
