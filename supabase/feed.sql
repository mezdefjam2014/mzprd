-- MZPRD Feed: swipe feed, public like counts, comments and the back office FEED tab. Run once in Supabase -> SQL Editor.
-- Kept small on purpose: short text rows only. Videos live in Cloudflare R2. Saved items stay in public.favorites.
alter table public.site_settings add column if not exists feed_auto_beats boolean not null default true;
alter table public.site_settings add column if not exists feed_auto_packs boolean not null default true;
alter table public.site_settings add column if not exists feed_auto_samples boolean not null default true;

-- only items you changed get a row. shown: null = follow the auto switch, true = always in the feed, false = never
create table if not exists public.feed_items(
  item_key text primary key,       -- b:<id>, p:<id> or s:<id>
  shown boolean,
  pinned boolean not null default false,
  video_path text                  -- r2:previews/feed/... made by Send to Feed
);
alter table public.feed_items enable row level security;
drop policy if exists "public read feed items" on public.feed_items;
create policy "public read feed items" on public.feed_items for select using (true);
drop policy if exists "admin all feed items" on public.feed_items;
create policy "admin all feed items" on public.feed_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.feed_likes(
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  primary key(user_id,item_key)
);
create index if not exists feed_likes_item_idx on public.feed_likes(item_key);
alter table public.feed_likes enable row level security;
drop policy if exists feed_likes_own_select on public.feed_likes;
drop policy if exists feed_likes_own_insert on public.feed_likes;
drop policy if exists feed_likes_own_delete on public.feed_likes;
create policy feed_likes_own_select on public.feed_likes for select to authenticated using (auth.uid()=user_id);
create policy feed_likes_own_insert on public.feed_likes for insert to authenticated with check (auth.uid()=user_id);
create policy feed_likes_own_delete on public.feed_likes for delete to authenticated using (auth.uid()=user_id);

create table if not exists public.feed_comments(
  id uuid primary key default gen_random_uuid(),
  item_key text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 24),
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists feed_comments_item_idx on public.feed_comments(item_key,created_at desc);
create index if not exists feed_comments_user_idx on public.feed_comments(user_id,created_at desc);
alter table public.feed_comments enable row level security;
drop policy if exists feed_comments_read on public.feed_comments;
drop policy if exists feed_comments_insert on public.feed_comments;
drop policy if exists feed_comments_delete on public.feed_comments;
create policy feed_comments_read on public.feed_comments for select using (true);
-- nobody but an admin can post under the MZPRD name
create policy feed_comments_insert on public.feed_comments for insert to authenticated
  with check (auth.uid()=user_id and (public.is_admin() or name !~* 'mzprd|meztheprod'));
create policy feed_comments_delete on public.feed_comments for delete to authenticated using (auth.uid()=user_id or public.is_admin());

-- slow down comment spam: 5 a minute per account
create or replace function public.feed_comment_limit() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from public.feed_comments where user_id=new.user_id and created_at>now()-interval '1 minute')>=5 then
    raise exception 'Too many comments. Wait a minute.';
  end if;
  return new;
end $$;
drop trigger if exists feed_comment_limit on public.feed_comments;
create trigger feed_comment_limit before insert on public.feed_comments for each row execute function public.feed_comment_limit();

-- counts for everyone, without showing who liked what
create or replace function public.feed_stats() returns table(item_key text,likes bigint,comments bigint)
language sql stable security definer set search_path=public as $$
  select k,coalesce(l.n,0),coalesce(c.n,0) from
    (select item_key k from feed_likes union select item_key from feed_comments) a
    left join (select item_key,count(*) n from feed_likes group by 1) l on l.item_key=a.k
    left join (select item_key,count(*) n from feed_comments group by 1) c on c.item_key=a.k
$$;
grant execute on function public.feed_stats() to anon,authenticated;
