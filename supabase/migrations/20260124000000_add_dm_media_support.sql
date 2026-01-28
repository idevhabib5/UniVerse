-- Add media support to direct_messages table
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'link')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS link_preview JSONB;

-- Create storage bucket for direct message media
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-media', 'dm-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload media to their own conversations
CREATE POLICY "Users can upload DM media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'dm-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view media from their conversations
CREATE POLICY "Users can view DM media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'dm-media' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.conversation_participants cp ON cp.conversation_id = dm.conversation_id
      WHERE dm.media_url LIKE '%' || storage.objects.name || '%'
      AND cp.user_id = auth.uid()
    )
  )
);

-- Allow users to delete their own media
CREATE POLICY "Users can delete their own DM media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'dm-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
