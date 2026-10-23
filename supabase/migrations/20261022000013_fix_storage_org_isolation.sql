-- ============================================================================
-- 20261022000013 — fix: aucune isolation par organisation dans Storage
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE)
--   Les policies de `storage.objects` ne regardaient que le `bucket_id` :
--     * `lumina_storage_read`  : SELECT pour {anon, authenticated} sur
--       logos/archives/expense_proofs → **un visiteur NON authentifié** peut
--       télécharger n'importe quel document privé (`archives`,
--       `expense_proofs` = justificatifs de dépense) dès qu'il connaît le
--       chemin ;
--     * `lumina_storage_delete` : DELETE pour tout `authenticated` sur ces
--       buckets → n'importe quel membre d'une organisation peut supprimer les
--       documents d'une autre ;
--     * `lumina_storage_write`  : INSERT pour {anon, authenticated} sans
--       contrôle du chemin ;
--     * idem pour `org_reports` (rapports financiers inter-organisations) :
--       lecture/suppression par tout authentifié.
--
--   Les chemins sont préfixés par l'organisation :
--     * logos/archives/expense_proofs : `<org_id>/<…>`        (dossier 1)
--     * org_reports                   : `org_reports/<from_org>/<…>` (dossier 2)
--
-- PREUVE
--   `pg_policies` : `lumina_storage_read` avait `roles = {anon, authenticated}`
--   et `qual = bucket_id = ANY(...)`, sans aucune condition de chemin.
--   (Aucun objet n'existe actuellement dans ces buckets : pas de fuite réelle
--   de données, mais la faille était exploitable dès le premier dépôt.)
--
-- CORRECTIF
--   Chaque accès est borné à l'organisation du chemin, via `is_org_member` :
--     * logos          : lecture publique conservée (bucket public par
--                        conception) ; écriture réservée aux membres ;
--     * archives /
--       expense_proofs : lecture/écriture/suppression réservées aux membres de
--                        l'organisation du dossier 1 ;
--     * org_reports    : lecture réservée à l'organisation émettrice OU
--                        destinataire (jointure sur la table `org_reports`,
--                        qui porte sa propre RLS) ; écriture à l'émetteur.
--
-- RÉVERSIBILITÉ : rollback/20261022000013_rollback.sql
-- ============================================================================

-- ── logos : lecture publique, écriture par l'organisation du chemin ─────────
DROP POLICY IF EXISTS lumina_storage_read ON storage.objects;
DROP POLICY IF EXISTS lumina_storage_write ON storage.objects;
DROP POLICY IF EXISTS lumina_storage_delete ON storage.objects;
DROP POLICY IF EXISTS lumina_storage_read_org_reports ON storage.objects;
DROP POLICY IF EXISTS lumina_storage_write_org_reports ON storage.objects;
DROP POLICY IF EXISTS lumina_storage_delete_org_reports ON storage.objects;

CREATE POLICY lumina_logos_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'logos');

CREATE POLICY lumina_logos_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
  );

-- ── archives / expense_proofs : strictement internes à l'organisation ───────
CREATE POLICY lumina_private_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('archives', 'expense_proofs')
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
  );

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

-- ── org_reports : émetteur OU destinataire ──────────────────────────────────
CREATE POLICY lumina_org_reports_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'org_reports'
    AND EXISTS (
      SELECT 1 FROM public.org_reports r
       WHERE r.from_org_id = (storage.foldername(name))[2]
         AND (public.is_org_member(initplan_uid(), r.from_org_id)
              OR public.is_org_member(initplan_uid(), r.to_org_id))
    )
  );

CREATE POLICY lumina_org_reports_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org_reports'
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[2])
  );

CREATE POLICY lumina_org_reports_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'org_reports'
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[2])
  );
