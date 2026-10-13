-- Black 1 community schema for Supabase (run in SQL Editor as project owner).
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_.]{3,24}$'),
  display_name text not null default 'مستخدم جديد' check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

-- Every new Supabase Auth user gets a discoverable, public profile, without exposing their email.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username text;
  v_name text;
begin
  v_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if v_username !~ '^[a-zA-Z0-9_.]{3,24}$' then
    v_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 19);
  end if;
  insert into public.profiles(id, username, display_name)
  values(new.id, v_username, coalesce(v_name, v_username));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_black1 on auth.users;
create trigger on_auth_user_created_black1 after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Security-definer helper avoids recursive RLS policies on conversation_members.
create or replace function public.is_conversation_member(p_conversation uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation and cm.user_id = p_user
  );
$$;
revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;
grant usage, select on sequence public.messages_id_seq to authenticated;

drop policy if exists "Profiles searchable by signed-in users" on public.profiles;
create policy "Profiles searchable by signed-in users" on public.profiles
for select to authenticated using (true);
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Conversation visible to members" on public.conversations;
create policy "Conversation visible to members" on public.conversations
for select to authenticated using (public.is_conversation_member(id, auth.uid()));
drop policy if exists "Members can see shared conversation members" on public.conversation_members;
create policy "Members can see shared conversation members" on public.conversation_members
for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
drop policy if exists "Members can read messages" on public.messages;
create policy "Members can read messages" on public.messages
for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
drop policy if exists "Members can send as themselves" on public.messages;
create policy "Members can send as themselves" on public.messages
for insert to authenticated with check (
  sender_id = auth.uid() and char_length(trim(body)) between 1 and 5000 and
  exists (select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
);

-- RPC creates a private one-to-one conversation; clients cannot add arbitrary members directly.
create or replace function public.start_conversation(target_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_conversation uuid;
begin
  if v_me is null then raise exception 'يجب تسجيل الدخول أولاً'; end if;
  if target_user is null or target_user = v_me then raise exception 'لا يمكن بدء محادثة مع هذا الحساب'; end if;
  if not exists (select 1 from public.profiles p where p.id = target_user) then raise exception 'الحساب غير موجود'; end if;
  select a.conversation_id into v_conversation
  from public.conversation_members a
  join public.conversation_members b on b.conversation_id = a.conversation_id
  where a.user_id = v_me and b.user_id = target_user
  limit 1;
  if v_conversation is not null then return v_conversation; end if;
  insert into public.conversations default values returning id into v_conversation;
  insert into public.conversation_members(conversation_id,user_id) values(v_conversation,v_me),(v_conversation,target_user);
  return v_conversation;
end;
$$;

grant execute on function public.start_conversation(uuid) to authenticated;

-- Maintain conversation ordering when a new message arrives.
create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists on_message_touch_conversation on public.messages;
create trigger on_message_touch_conversation after insert on public.messages
for each row execute procedure public.touch_conversation_on_message();

-- Enable Supabase Realtime for the messages table once (safe to re-run).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
