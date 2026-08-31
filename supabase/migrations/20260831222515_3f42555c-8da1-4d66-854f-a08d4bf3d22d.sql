REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.horarios_ocupados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados() TO anon, authenticated;