-- ============================================================================
-- 20261003000004 — Bucket privé `org_reports` : container + RLS storage
-- ----------------------------------------------------------------------------
-- Feature « Rapports inter-organisations » (plan
-- docs/plans/2026-10-03-lumina-rapports-organisations.md, Phase 1 T1.3).
--
-- Contenu : les rapports de gestion émis entre orgs (pdf/docx/xlsx/png)
-- sont uploadés dans un bucket PRIVÉ (`org_reports`). La lecture / écriture
-- / suppression se font via des URL signées (cf. `storageService.ts`
-- `uploadReportFile` / `getReportUrl` — signed 30 min) ; les policies
-- storage ci-dessous autorisent `authenticated` à accéder au bucket via
-- l'API PostgREST (upload + retrieval signée), sans l'exposer publiquement.
--
-- Conventions reprises des migrations 0051/0052/0053 (storage.objects) :
--   * `USING/WITH CHECK` restreints à `bucket_id IN (...)` — jamais de
--     `USING(true)`.
--   * Pas d'auto-superposition sur les policies existantes 0051-0053 : on
--     crée 3 policies DÉDIÉES au bucket `org_reports` (naming
--     `lumina_storage_<cmd>_org_reports`) pour rester additif et
--     réversible sans toucher le bucket `logos`/`archives`/`expense_proofs`.
--
-- Le bucket lui-même est créé avec `file_size_limit = 20 971 520` (20 Mo)
-- et `public = false`. Rationale 20 Mo : plafond raisonnable pour un rapport
-- de gestion compressé (un xlsx de 1000 lignes < 1 Mo ; un pdf A4 ~200 Ko) ;
-- au-delà, le client doit chunker (hors périmètre Phase 1).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Le bucket — INSERT idempotent (DO NOTHING si déjà créé,
--    le bucket a été créé manuellement dans le dashboard Supabase
--    le 2026-10-03, ce fichier documente l'état final)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('org_reports', 'org_reports', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2) Policies storage.objects DÉDIÉES au bucket org_reports
--    (additif — ne modifie PAS les policies 0051/0052/0053 sur les autres
--    buckets, qui restent le SSOT pour ceux-ci)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS lumina_storage_read_org_reports ON storage.objects;
CREATE POLICY lumina_storage_read_org_reports ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'org_reports');

DROP POLICY IF EXISTS lumina_storage_write_org_reports ON storage.objects;
CREATE POLICY lumina_storage_write_org_reports ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org_reports');

DROP POLICY IF EXISTS lumina_storage_delete_org_reports ON storage.objects;
CREATE POLICY lumina_storage_delete_org_reports ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'org_reports');
