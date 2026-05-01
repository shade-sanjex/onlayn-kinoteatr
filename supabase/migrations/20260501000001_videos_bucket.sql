-- ============================================================
-- Yorqin Tomosha — Videos Bucket Schema
-- ============================================================

-- -------------------------------------------------------
-- 1. STORAGE — VIDEOS BUCKET
-- -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Public read access for videos
create policy "videos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'videos');

-- Authenticated users can upload videos into their own folder
create policy "videos_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own videos
create policy "videos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own videos
create policy "videos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
