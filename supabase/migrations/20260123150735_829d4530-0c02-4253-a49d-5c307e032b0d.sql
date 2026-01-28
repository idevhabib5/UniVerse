-- Create community bans table
CREATE TABLE public.community_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Create community rules table
CREATE TABLE public.community_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  rule_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, rule_number)
);

-- Enable RLS
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rules ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is moderator/owner
CREATE OR REPLACE FUNCTION public.is_community_moderator(_user_id UUID, _community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = _user_id
      AND community_id = _community_id
      AND role IN ('owner', 'moderator')
  )
$$;

-- RLS policies for community_bans
CREATE POLICY "Bans viewable by moderators"
ON public.community_bans FOR SELECT
USING (public.is_community_moderator(auth.uid(), community_id));

CREATE POLICY "Moderators can ban users"
ON public.community_bans FOR INSERT
WITH CHECK (public.is_community_moderator(auth.uid(), community_id));

CREATE POLICY "Moderators can update bans"
ON public.community_bans FOR UPDATE
USING (public.is_community_moderator(auth.uid(), community_id));

CREATE POLICY "Moderators can remove bans"
ON public.community_bans FOR DELETE
USING (public.is_community_moderator(auth.uid(), community_id));

-- RLS policies for community_rules
CREATE POLICY "Rules viewable by everyone"
ON public.community_rules FOR SELECT
USING (true);

CREATE POLICY "Moderators can create rules"
ON public.community_rules FOR INSERT
WITH CHECK (public.is_community_moderator(auth.uid(), community_id));

CREATE POLICY "Moderators can update rules"
ON public.community_rules FOR UPDATE
USING (public.is_community_moderator(auth.uid(), community_id));

CREATE POLICY "Moderators can delete rules"
ON public.community_rules FOR DELETE
USING (public.is_community_moderator(auth.uid(), community_id));

-- Update posts policy to allow moderators to update (for pinning)
DROP POLICY IF EXISTS "Authors can update posts" ON public.posts;
CREATE POLICY "Authors and moderators can update posts"
ON public.posts FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_community_moderator(auth.uid(), community_id)
);

-- Update posts delete policy to allow moderators to delete
DROP POLICY IF EXISTS "Authors can delete posts" ON public.posts;
CREATE POLICY "Authors and moderators can delete posts"
ON public.posts FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.is_community_moderator(auth.uid(), community_id)
);

-- Update comments delete policy to allow moderators
DROP POLICY IF EXISTS "Authors can delete comments" ON public.comments;
CREATE POLICY "Authors and moderators can delete comments"
ON public.comments FOR DELETE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id 
    AND public.is_community_moderator(auth.uid(), p.community_id)
  )
);

-- Add trigger for rules updated_at
CREATE TRIGGER update_community_rules_updated_at
BEFORE UPDATE ON public.community_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_community_bans_community ON public.community_bans(community_id);
CREATE INDEX idx_community_bans_user ON public.community_bans(user_id);
CREATE INDEX idx_community_rules_community ON public.community_rules(community_id);