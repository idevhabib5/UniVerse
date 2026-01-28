-- Fix overly permissive policies for conversations and participants

-- Drop the permissive policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;

-- Create proper policies that ensure only authenticated users can create conversations
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only add participants to conversations they're part of
-- This includes being able to add themselves and one other user when creating a new conversation
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    -- User is adding themselves
    user_id = auth.uid() OR
    -- Or user is already a participant in this conversation
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  )
);