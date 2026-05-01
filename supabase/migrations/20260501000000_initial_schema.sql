-- ============================================================
-- Yorqin Tomosha — Initial Database Schema
-- ============================================================

-- -------------------------------------------------------
-- 1. PROFILES TABLE
-- -------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'User profile data linked to auth.users';

-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update the updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- -------------------------------------------------------
-- 2. ROOMS TABLE
-- -------------------------------------------------------
create type public.video_kind_enum as enum ('file', 'youtube', 'iframe');

create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Yangi Xona',
  host_id     uuid not null references public.profiles(id) on delete cascade,
  is_private  boolean not null default true,
  is_active   boolean not null default false,
  video_kind  public.video_kind_enum not null default 'file',
  video_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.rooms is 'Watch party rooms created by hosts';

create trigger rooms_updated_at
  before update on public.rooms
  for each row execute function public.update_updated_at_column();

-- Index for fetching active public rooms efficiently
create index if not exists idx_rooms_active_public
  on public.rooms (is_active, is_private)
  where is_active = true and is_private = false;

-- -------------------------------------------------------
-- 3. ROW LEVEL SECURITY — PROFILES
-- -------------------------------------------------------
alter table public.profiles enable row level security;

-- Anyone authenticated can read any profile (for presence, avatars, etc.)
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but just in case)
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- -------------------------------------------------------
-- 4. ROW LEVEL SECURITY — ROOMS
-- -------------------------------------------------------
alter table public.rooms enable row level security;

-- Authenticated users can view public active rooms, or rooms they host
create policy "rooms_select"
  on public.rooms for select
  to authenticated
  using (
    (is_private = false and is_active = true)
    or host_id = auth.uid()
  );

-- Authenticated users can create rooms
create policy "rooms_insert"
  on public.rooms for insert
  to authenticated
  with check (host_id = auth.uid());

-- Only the host can update their room
create policy "rooms_update_host"
  on public.rooms for update
  to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

-- Only the host can delete their room
create policy "rooms_delete_host"
  on public.rooms for delete
  to authenticated
  using (host_id = auth.uid());

-- -------------------------------------------------------
-- 5. STORAGE — AVATARS BUCKET
-- -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read access for avatar images
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
create policy "avatars_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own avatar
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own avatar
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
