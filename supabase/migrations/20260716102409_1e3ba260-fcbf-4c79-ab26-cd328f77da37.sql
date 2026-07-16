
CREATE POLICY "Club members read club-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'club-media' AND public.is_club_member(auth.uid()));

CREATE POLICY "Club members upload club-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'club-media' AND public.is_club_member(auth.uid()));

CREATE POLICY "Users delete own club-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'club-media' AND owner = auth.uid());
