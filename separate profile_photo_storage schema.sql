-- ============================================================
-- BlinkBuy — Profile Photo Storage Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create the storage bucket (public so images load without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  2097152,  -- 2MB limit (matches app validation)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];


-- ============================================================
-- 2. Storage Policies
-- ============================================================

-- Allow anyone to VIEW profile photos (public bucket)
CREATE POLICY "Public can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

-- Allow authenticated users to UPLOAD their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] = 'avatars'
    AND auth.uid()::text = split_part(split_part(name, '/', 2), '.', 1)
  );

-- Allow authenticated users to UPDATE (overwrite) their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profiles'
    AND auth.uid()::text = split_part(split_part(name, '/', 2), '.', 1)
  );

-- Allow authenticated users to DELETE their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profiles'
    AND auth.uid()::text = split_part(split_part(name, '/', 2), '.', 1)
  );


-- ============================================================
-- 3. Make sure profiles table has profile_photo column
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo TEXT DEFAULT NULL;
