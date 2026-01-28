-- Create global bans table for platform-wide bans (different from community bans)
CREATE TABLE public.global_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    banned_by UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.global_bans ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage global bans
CREATE POLICY "Super admins can view global bans"
ON public.global_bans
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create global bans"
ON public.global_bans
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete global bans"
ON public.global_bans
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Function to get all users with pagination (for admin)
CREATE OR REPLACE FUNCTION public.admin_get_users(
    page_number INT DEFAULT 1,
    page_size INT DEFAULT 20,
    search_query TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    offset_val INT;
BEGIN
    -- Check if user is super admin
    IF NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    offset_val := (page_number - 1) * page_size;
    
    SELECT json_build_object(
        'users', (
            SELECT json_agg(user_data)
            FROM (
                SELECT 
                    p.id,
                    p.username,
                    p.full_name,
                    p.avatar_url,
                    p.university,
                    p.degree,
                    p.created_at,
                    CASE WHEN gb.id IS NOT NULL THEN true ELSE false END as is_banned,
                    gb.reason as ban_reason,
                    gb.created_at as banned_at
                FROM public.profiles p
                LEFT JOIN public.global_bans gb ON gb.user_id = p.id
                WHERE 
                    search_query IS NULL 
                    OR p.full_name ILIKE '%' || search_query || '%'
                    OR p.username ILIKE '%' || search_query || '%'
                ORDER BY p.created_at DESC
                LIMIT page_size
                OFFSET offset_val
            ) user_data
        ),
        'total_count', (
            SELECT COUNT(*)
            FROM public.profiles p
            WHERE 
                search_query IS NULL 
                OR p.full_name ILIKE '%' || search_query || '%'
                OR p.username ILIKE '%' || search_query || '%'
        ),
        'page', page_number,
        'page_size', page_size
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Function to ban a user globally
CREATE OR REPLACE FUNCTION public.admin_ban_user(
    target_user_id UUID,
    ban_reason TEXT DEFAULT NULL,
    ban_duration_days INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expires TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if user is super admin
    IF NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Cannot ban yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot ban yourself';
    END IF;
    
    -- Calculate expiry
    IF ban_duration_days IS NOT NULL THEN
        expires := now() + (ban_duration_days || ' days')::INTERVAL;
    END IF;
    
    -- Insert or update ban
    INSERT INTO public.global_bans (user_id, banned_by, reason, expires_at)
    VALUES (target_user_id, auth.uid(), ban_reason, expires)
    ON CONFLICT (user_id) DO UPDATE SET
        reason = EXCLUDED.reason,
        expires_at = EXCLUDED.expires_at,
        created_at = now();
    
    RETURN true;
END;
$$;

-- Function to unban a user
CREATE OR REPLACE FUNCTION public.admin_unban_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is super admin
    IF NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    DELETE FROM public.global_bans WHERE user_id = target_user_id;
    
    RETURN true;
END;
$$;

-- Function to delete a user (removes their profile and related data)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is super admin
    IF NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Cannot delete yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete yourself';
    END IF;
    
    -- Delete profile (cascades to related data based on FK constraints)
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    RETURN true;
END;
$$;