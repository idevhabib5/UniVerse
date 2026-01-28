-- First, fix the foreign key relationships for existing tables
-- Add foreign key from problems.user_id to profiles.id
ALTER TABLE public.problems 
ADD CONSTRAINT fk_problems_user_profile 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from solutions.user_id to profiles.id  
ALTER TABLE public.solutions
ADD CONSTRAINT fk_solutions_user_profile
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create community-related enums
CREATE TYPE public.community_type AS ENUM ('general', 'study_help', 'interest', 'gaming', 'tech', 'creative');

-- Create communities table
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  community_type community_type NOT NULL DEFAULT 'general',
  is_private BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create community memberships
CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Create posts table (Reddit-style threaded discussions)
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  post_type TEXT NOT NULL DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'question', 'announcement', 'link')),
  link_url TEXT,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create comments table (threaded)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create post votes table
CREATE TABLE public.post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comment votes table
CREATE TABLE public.comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create chat messages table (Discord-style real-time)
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create message reactions table
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on all new tables
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Communities policies
CREATE POLICY "Communities are viewable by everyone" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Community creators can update" ON public.communities FOR UPDATE USING (auth.uid() = created_by);

-- Community members policies
CREATE POLICY "Members are viewable by everyone" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave communities" ON public.community_members FOR DELETE USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Members can create posts" ON public.posts FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.community_members WHERE community_id = posts.community_id AND user_id = auth.uid())
);
CREATE POLICY "Authors can update posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Post votes policies
CREATE POLICY "Votes are viewable by everyone" ON public.post_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change votes" ON public.post_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove votes" ON public.post_votes FOR DELETE USING (auth.uid() = user_id);

-- Comment votes policies
CREATE POLICY "Comment votes viewable by everyone" ON public.comment_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote on comments" ON public.comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update comment votes" ON public.comment_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove comment votes" ON public.comment_votes FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Chat messages viewable by members" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members WHERE community_id = chat_messages.community_id AND user_id = auth.uid())
);
CREATE POLICY "Members can send messages" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.community_members WHERE community_id = chat_messages.community_id AND user_id = auth.uid())
);
CREATE POLICY "Authors can edit messages" ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Message reactions policies
CREATE POLICY "Reactions are viewable by members" ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can react" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_community_members_community ON public.community_members(community_id);
CREATE INDEX idx_community_members_user ON public.community_members(user_id);
CREATE INDEX idx_posts_community ON public.posts(community_id);
CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);
CREATE INDEX idx_chat_messages_community ON public.chat_messages(community_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Functions to update vote counts
CREATE OR REPLACE FUNCTION public.update_post_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      UPDATE public.posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE public.posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE public.posts SET upvotes = upvotes - 1 WHERE id = OLD.post_id;
    ELSE
      UPDATE public.posts SET downvotes = downvotes - 1 WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 1 AND NEW.vote_type = -1 THEN
      UPDATE public.posts SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.post_id;
    ELSIF OLD.vote_type = -1 AND NEW.vote_type = 1 THEN
      UPDATE public.posts SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_post_vote_change
AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
FOR EACH ROW EXECUTE FUNCTION public.update_post_votes();

-- Function to update member count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_member_change
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();