-- Site visits: one row per real visit (new browser session), never per refresh.
create table if not exists public.visits(
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  src text,      -- where they came from: instagram, google, youtube, direct...
  ref text,      -- referring domain
  page text,     -- landing page path
  utm text,      -- utm_campaign if present
  device text    -- mobile / desktop
);
alter table public.visits enable row level security;
drop policy if exists "anyone logs a visit" on public.visits;
create policy "anyone logs a visit" on public.visits for insert to anon, authenticated with check (true);
drop policy if exists "admin reads visits" on public.visits;
create policy "admin reads visits" on public.visits for select to authenticated using (public.is_admin());
create index if not exists visits_created_idx on public.visits(created_at);
