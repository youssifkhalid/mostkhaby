-- Lock down public bucket listing: only allow direct file access via known path
DROP POLICY IF EXISTS "Posts media public read" ON storage.objects;
CREATE POLICY "Posts media public read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'posts-media'
    AND (storage.foldername(name))[1] IS NOT NULL
  );

-- Restrict SECURITY DEFINER fn to authenticated only
REVOKE EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) TO authenticated;