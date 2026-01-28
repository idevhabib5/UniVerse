-- Create community-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow community moderators to upload images for their community
CREATE POLICY "Moderators can upload community images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'community-images' 
  AND public.is_community_moderator(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Allow community moderators to update images
CREATE POLICY "Moderators can update community images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'community-images' 
  AND public.is_community_moderator(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Allow community moderators to delete images
CREATE POLICY "Moderators can delete community images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'community-images' 
  AND public.is_community_moderator(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Allow public read access to community images
CREATE POLICY "Community images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-images');