-- Single samples for the CRATE DIG page (back office: SINGLE SAMPLES tab). Run once in Supabase -> SQL Editor.
create table if not exists public.samples(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique,
  kind text,                       -- Soul chop, Drum break, Vocal loop, Keys loop, Horn stab, Guitar loop, One-shot...
  bpm int,
  musical_key text,                -- e.g. C min
  price numeric not null default 4.99,
  cover_path text,                 -- not used yet (every record uses the shared crate sleeve)
  preview_path text,               -- public-media: short tagged preview
  file_path text,                  -- private-files / Cloudflare R2 ('r2:...'): the full WAV buyers get
  published boolean not null default true,
  free_download boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.samples enable row level security;
drop policy if exists "public read samples" on public.samples;
create policy "public read samples" on public.samples for select using (published or public.is_admin());
drop policy if exists "admin all samples" on public.samples;
create policy "admin all samples" on public.samples for all to authenticated using (public.is_admin()) with check (public.is_admin());
