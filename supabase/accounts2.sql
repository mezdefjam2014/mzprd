-- Messages from the back office to customer accounts (user_id null = everyone).
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null default 'message',
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
drop policy if exists msg_read on public.messages;
create policy msg_read on public.messages for select using (user_id is null or user_id = auth.uid());
alter table public.favorites add column if not exists msgs_read_at timestamptz not null default 'epoch';
