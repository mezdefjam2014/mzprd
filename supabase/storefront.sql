-- Front page (storefront) settings: run once in Supabase > SQL Editor.
alter table public.site_settings add column if not exists home_hot text;          -- the 3 Hot Beats, as beat ids separated by commas
alter table public.site_settings add column if not exists home_feature text;      -- the big featured item, 'p:<pack id>' or 'b:<beat id>'
alter table public.site_settings add column if not exists home_feature_img text;  -- optional custom picture for the big featured block (storage path)
