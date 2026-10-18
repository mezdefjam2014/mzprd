-- allow the CRATE DEAL bundle type (buy N single samples, the cheapest one is free)
alter table public.bundles drop constraint if exists bundles_kind_check;
alter table public.bundles add constraint bundles_kind_check check (kind in ('any_beats','any_packs','fixed','free_samples'));
