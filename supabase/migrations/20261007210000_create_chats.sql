-- Saved conversations owned by each signed-in user.
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chats_user_id_updated_at_idx on public.chats (user_id, updated_at desc);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  sources jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_chat_id_id_idx on public.chat_messages (chat_id, id);
create index chat_messages_user_id_idx on public.chat_messages (user_id);

alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;

revoke all on public.chats, public.chat_messages from anon;
grant select, insert, update, delete on public.chats to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;

create policy "Users can view their own chats"
  on public.chats for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own chats"
  on public.chats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own chats"
  on public.chats for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own chats"
  on public.chats for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own messages"
  on public.chat_messages for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Messages may only be added to a chat the user owns.
create policy "Users can add messages to their own chats"
  on public.chat_messages for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own messages"
  on public.chat_messages for delete
  to authenticated
  using ((select auth.uid()) = user_id);
