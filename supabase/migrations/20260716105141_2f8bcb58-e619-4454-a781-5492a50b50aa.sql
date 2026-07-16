CREATE OR REPLACE FUNCTION public.get_club_admin_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin';
$$;

GRANT EXECUTE ON FUNCTION public.get_club_admin_ids() TO authenticated;