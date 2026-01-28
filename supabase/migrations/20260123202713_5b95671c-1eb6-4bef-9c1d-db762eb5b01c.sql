-- Function to get all communities with pagination (for admin)
CREATE OR REPLACE FUNCTION public.admin_get_communities(
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
        'communities', (
            SELECT json_agg(community_data)
            FROM (
                SELECT 
                    c.id,
                    c.name,
                    c.slug,
                    c.description,
                    c.icon_url,
                    c.banner_url,
                    c.member_count,
                    c.community_type,
                    c.is_private,
                    c.created_at,
                    c.created_by,
                    p.full_name as creator_name,
                    p.username as creator_username,
                    (SELECT COUNT(*) FROM public.posts WHERE community_id = c.id) as post_count
                FROM public.communities c
                LEFT JOIN public.profiles p ON p.id = c.created_by
                WHERE 
                    search_query IS NULL 
                    OR c.name ILIKE '%' || search_query || '%'
                    OR c.slug ILIKE '%' || search_query || '%'
                ORDER BY c.member_count DESC, c.created_at DESC
                LIMIT page_size
                OFFSET offset_val
            ) community_data
        ),
        'total_count', (
            SELECT COUNT(*)
            FROM public.communities c
            WHERE 
                search_query IS NULL 
                OR c.name ILIKE '%' || search_query || '%'
                OR c.slug ILIKE '%' || search_query || '%'
        ),
        'page', page_number,
        'page_size', page_size
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Function to update a community (admin)
CREATE OR REPLACE FUNCTION public.admin_update_community(
    target_community_id UUID,
    new_name TEXT DEFAULT NULL,
    new_description TEXT DEFAULT NULL,
    new_community_type community_type DEFAULT NULL,
    new_is_private BOOLEAN DEFAULT NULL
)
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
    
    UPDATE public.communities SET
        name = COALESCE(new_name, name),
        description = COALESCE(new_description, description),
        community_type = COALESCE(new_community_type, community_type),
        is_private = COALESCE(new_is_private, is_private),
        updated_at = now()
    WHERE id = target_community_id;
    
    RETURN true;
END;
$$;

-- Function to delete a community (admin)
CREATE OR REPLACE FUNCTION public.admin_delete_community(target_community_id UUID)
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
    
    -- Delete the community (cascades to members, posts, etc. based on FK constraints)
    DELETE FROM public.communities WHERE id = target_community_id;
    
    RETURN true;
END;
$$;