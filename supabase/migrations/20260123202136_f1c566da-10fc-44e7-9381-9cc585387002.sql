-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- RLS policies for user_roles
-- Only super admins can view all roles
CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only super admins can insert roles
CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Only super admins can delete roles
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Create a view for admin statistics (accessible via function)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats JSON;
BEGIN
  -- Check if user is super admin
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_communities', (SELECT COUNT(*) FROM public.communities),
    'total_posts', (SELECT COUNT(*) FROM public.posts),
    'total_problems', (SELECT COUNT(*) FROM public.problems),
    'total_solutions', (SELECT COUNT(*) FROM public.solutions),
    'total_comments', (SELECT COUNT(*) FROM public.comments),
    'users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'posts_today', (SELECT COUNT(*) FROM public.posts WHERE created_at >= CURRENT_DATE),
    'communities_by_type', (
      SELECT json_agg(json_build_object('type', community_type, 'count', cnt))
      FROM (SELECT community_type, COUNT(*) as cnt FROM public.communities GROUP BY community_type) t
    ),
    'recent_users', (
      SELECT json_agg(json_build_object('id', id, 'full_name', full_name, 'username', username, 'created_at', created_at))
      FROM (SELECT id, full_name, username, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10) t
    ),
    'top_communities', (
      SELECT json_agg(json_build_object('id', id, 'name', name, 'member_count', member_count, 'slug', slug))
      FROM (SELECT id, name, member_count, slug FROM public.communities ORDER BY member_count DESC LIMIT 5) t
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$;