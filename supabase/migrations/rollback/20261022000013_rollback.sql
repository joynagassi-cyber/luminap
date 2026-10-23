-- ============================================================================
-- ROLLBACK de 20261022000013
-- ----------------------------------------------------------------------------
-- Rétablit les policies Storage d'origine (NON SÛRES : lecture anonyme des
-- buckets privés, suppression par tout authentifié).
-- ============================================================================
DROP POLICY IF EXISTS lumina_logos_read ON storage.objects;
DROP POLICY IF EXISTS lumina_logos_write ON storage.objects;
DROP POLICY IF EXISTS lumina_private_read ON storage.objects;
DROP POLICY IF EXISTS lumina_private_write ON storage.objects;
DROP POLICY IF EXISTS lumina_private_delete ON storage.objects;
DROP POLICY IF EXISTS lumina_org_reports_read ON storage.objects;
DROP POLICY IF EXISTS lumina_org_reports_write ON storage.objects;
DROP POLICY IF EXISTS lumina_org_reports_delete ON storage.objects;

CREATE POLICY lumina_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = ANY (ARRAY['logos','archives','expense_proofs']));

CREATE POLICY lumina_storage_delete_org_reports ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'org_reports');

CREATE POLICY lumina_storage_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = ANY (ARRAY['logos','archives','expense_proofs']));

CREATE POLICY lumina_storage_read_org_reports ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'org_reports');

CREATE POLICY lumina_storage_write ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = ANY (ARRAY['logos','archives','expense_proofs']));

CREATE POLICY lumina_storage_write_org_reports ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org_reports');
