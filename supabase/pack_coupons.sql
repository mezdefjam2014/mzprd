-- Sample pack coupon codes (set in the back office PROMO tab). Run once in Supabase -> SQL Editor.
create table if not exists public.pack_coupons(
  code text primary key check (code ~ '^[A-Z0-9-]{3,20}$'),
  pct numeric not null check (pct > 0 and pct <= 90),
  active boolean not null default true,
  banner boolean not null default true,   -- show the code in the strip at the top of the site
  ends_at timestamptz,                     -- empty = no end date
  uses integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.pack_coupons enable row level security;
drop policy if exists "anyone sees live pack codes" on public.pack_coupons;
create policy "anyone sees live pack codes" on public.pack_coupons for select to anon, authenticated
  using (active and (ends_at is null or ends_at > now()) or public.is_admin());
drop policy if exists "admin manages pack codes" on public.pack_coupons;
create policy "admin manages pack codes" on public.pack_coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.pack_coupons (code, pct, active, banner) values ('MZPRD10', 10, true, true) on conflict (code) do nothing;
