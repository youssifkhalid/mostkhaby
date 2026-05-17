
REVOKE EXECUTE ON FUNCTION public.can_view_story(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_story(uuid, uuid) TO authenticated;
