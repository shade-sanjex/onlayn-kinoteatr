-- ============================================================
-- Yorqin Tomosha — RLS Policy Fixes & Schema Additions
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- -------------------------------------------------------
-- 1. ADD MISSING COLUMNS (safe — uses IF NOT EXISTS logic)
-- -------------------------------------------------------

-- profiles: add 'role' column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- rooms: add 'host_name' column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'host_name'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN host_name text NOT NULL DEFAULT '';
  END IF;
END $$;

-- -------------------------------------------------------
-- 2. FRIENDS TABLE (if not exists)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friends (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Drop old policies first (idempotent)
DROP POLICY IF EXISTS "friends_select" ON public.friends;
DROP POLICY IF EXISTS "friends_insert" ON public.friends;
DROP POLICY IF EXISTS "friends_update" ON public.friends;
DROP POLICY IF EXISTS "friends_delete" ON public.friends;

CREATE POLICY "friends_select" ON public.friends
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friends_insert" ON public.friends
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "friends_update" ON public.friends
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friends_delete" ON public.friends
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- -------------------------------------------------------
-- 3. ROOM JOIN REQUESTS TABLE (if not exists)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_join_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.room_join_requests ENABLE ROW LEVEL SECURITY;

-- Drop old policies first (idempotent)
DROP POLICY IF EXISTS "join_requests_select" ON public.room_join_requests;
DROP POLICY IF EXISTS "join_requests_insert" ON public.room_join_requests;
DROP POLICY IF EXISTS "join_requests_update" ON public.room_join_requests;

CREATE POLICY "join_requests_select" ON public.room_join_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms r 
      WHERE r.id = room_id AND r.host_id = auth.uid()
    )
  );

CREATE POLICY "join_requests_insert" ON public.room_join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "join_requests_update" ON public.room_join_requests
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms r 
      WHERE r.id = room_id AND r.host_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 4. FIX ROOMS RLS — allow viewing ALL rooms (not just active)
--    The app fetches all rooms on Dashboard; previous policy
--    blocked non-active rooms from being seen.
-- -------------------------------------------------------

-- Drop old restrictive policies
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;

-- New: authenticated users see all rooms (public ones + their own)
CREATE POLICY "rooms_select"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (
    is_private = false        -- any public room
    OR host_id = auth.uid()   -- or rooms they host
  );

-- -------------------------------------------------------
-- 5. FIX PROFILES RLS — ensure trigger-created rows are readable
-- -------------------------------------------------------

-- Drop and recreate to ensure correctness
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- All authenticated users can read any profile
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users update their own profile only
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert own profile (trigger does this, but just in case)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------
-- 6. STORAGE — ensure videos & avatars policies exist
-- -------------------------------------------------------

-- Videos bucket (recreate idempotently)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos', 'videos', true, 
  524288000,  -- 500MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000;

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  5242880,    -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop & recreate video storage policies
DROP POLICY IF EXISTS "videos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "videos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "videos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "videos_owner_delete" ON storage.objects;

CREATE POLICY "videos_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'videos');

CREATE POLICY "videos_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "videos_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "videos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Drop & recreate avatar storage policies
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- -------------------------------------------------------
-- 7. UPDATE handle_new_user TRIGGER — include role & host_name
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- -------------------------------------------------------
-- DONE — Apply this SQL in Supabase SQL Editor
-- -------------------------------------------------------
