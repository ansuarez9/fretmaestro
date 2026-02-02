-- Create storage buckets would be done via Supabase UI or SDK
-- This file documents the required setup:

-- user-uploads bucket (private):
-- - users/{user_id}/originals/*.pdf
-- - users/{user_id}/musicxml/*.musicxml
--
-- public-assets bucket (public):
-- - samples/*.musicxml
-- - audio-samples/*.wav

-- Storage RLS policies for user-uploads (via Supabase UI):
-- Authenticated users can only read/write to their own folder:
-- - Select: ((bucket_id = 'user-uploads'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))
-- - Insert: ((bucket_id = 'user-uploads'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))
-- - Update: ((bucket_id = 'user-uploads'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))
-- - Delete: ((bucket_id = 'user-uploads'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))
