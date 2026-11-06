-- Rollback R171 — restaure les policies d'écriture/suppression Storage scoppées
-- à `is_org_member` (état mesuré avant 20261104000011).

DROP POLICY IF EXISTS lumina_archives_write ON storage.objects;
DROP POLICY IF EXISTS lumina_archives_delete ON storage.objects;
DROP POLICY IF EXISTS lumina_expense_proofs_write ON storage.objects;
DROP POLICY IF EXISTS lumina_expense_proofs_delete ON storage.objects;

CREATE POLICY lumina_private_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('archives', 'expense_proofs')
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
  );

CREATE POLICY lumina_private_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('archives', 'expense_proofs')
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
  );
