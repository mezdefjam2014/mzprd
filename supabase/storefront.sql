-- Front page (storefront) settings: run once in Supabase > SQL Editor.
alter table public.site_settings add column if not exists home_hot text;          -- the 3 Hot Beats, as beat ids separated by commas
alter table public.site_settings add column if not exists home_feature text;      -- the big featured item, 'p:<pack id>' or 'b:<beat id>'
alter table public.site_settings add column if not exists home_feature_img text;  -- optional custom picture for the big featured block (storage path)
alter table public.site_settings add column if not exists slash_pct numeric;      -- show a slashed "was" price this % above the real price (0 / empty = off)
alter table public.site_settings add column if not exists drop_day int;           -- next-drop countdown: day of week (0 Sun .. 6 Sat), empty = off
alter table public.site_settings add column if not exists drop_hour int;          -- next-drop countdown: hour (0-23)
