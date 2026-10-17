-- WHAT'S INSIDE list for sample packs (made by the Pack Builder on publish). Run once in Supabase -> SQL Editor.
alter table public.packs add column if not exists contents jsonb;
