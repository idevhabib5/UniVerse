-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'new_message', 'post_comment', 'post_vote', 'community_mention'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_user_id UUID,
  related_post_id UUID,
  related_community_id UUID,
  related_conversation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Trigger to create notification on new comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  commenter_name TEXT;
BEGIN
  -- Get post author and title
  SELECT user_id, title INTO post_author_id, post_title FROM posts WHERE id = NEW.post_id;
  
  -- Don't notify if commenting on own post
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter name
  SELECT COALESCE(full_name, username, 'Someone') INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, body, link, related_user_id, related_post_id)
  VALUES (
    post_author_id,
    'post_comment',
    'New comment on your post',
    commenter_name || ' commented on "' || LEFT(post_title, 50) || '"',
    '/problems/' || NEW.post_id,
    NEW.user_id,
    NEW.post_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_created
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_comment();

-- Trigger to create notification on post upvote
CREATE OR REPLACE FUNCTION public.notify_on_post_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  voter_name TEXT;
BEGIN
  -- Only notify on upvotes
  IF NEW.vote_type != 1 THEN
    RETURN NEW;
  END IF;

  -- Get post author and title
  SELECT user_id, title INTO post_author_id, post_title FROM posts WHERE id = NEW.post_id;
  
  -- Don't notify if voting on own post
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get voter name
  SELECT COALESCE(full_name, username, 'Someone') INTO voter_name FROM profiles WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, body, link, related_user_id, related_post_id)
  VALUES (
    post_author_id,
    'post_vote',
    'Your post was upvoted',
    voter_name || ' upvoted "' || LEFT(post_title, 50) || '"',
    '/problems/' || NEW.post_id,
    NEW.user_id,
    NEW.post_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_vote_created
AFTER INSERT ON public.post_votes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_post_vote();