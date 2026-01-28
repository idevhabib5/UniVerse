-- Drop the overly permissive INSERT policy
DROP POLICY "System can create notifications" ON public.notifications;

-- The INSERT will be handled by database triggers with SECURITY DEFINER
-- No direct INSERT policy needed since triggers handle notification creation