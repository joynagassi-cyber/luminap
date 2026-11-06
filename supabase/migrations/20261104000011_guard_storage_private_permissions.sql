-- ============================================================================
-- 20261104000011 — R171 : aligner les permissions des BLOBS Storage sur celles
--                  des MÉTADONNÉES (justificatifs & archives)
-- ----------------------------------------------------------------------------
-- DÉFAUT (asymétrie blob/métadonnée)
--   La migration 20261022000013 a corrigé une faille inter-organisations
--   (un visiteur anon lisait les documents privés ; tout `authenticated`
--   supprimait les documents de N'IMPORTE QUELLE organisation) en bornant
--   chaque accès à `is_org_member(initplan_uid(), <org du chemin>)`. Mais elle
--   s'est arrêtée à l'axe ORGANISATION : elle n'a pas tenu compte de l'axe
--   RÔLE. Résultat, pour un même fichier, la MÉTADONNÉE et le BLOB n'exigent
--   pas la même permission :
--     * `transaction_attachments` (justificatifs) : INSERT/DELETE exigent
--       `has_permission(uid, org, 'transaction', 'update')` ;
--     * `documents` (archives)                     : INSERT/UPDATE exigent
--       `has_permission(uid, org, 'admin', 'settings')` ;
--     * or les blobs `expense_proofs` / `archives` n'exigeaient qu'
--       `is_org_member` pour INSERT **et** DELETE.
--   ⇒ un simple `MEMBRE` (sans `transaction:update` ni `admin:settings`)
--   pouvait, via un appel Storage direct (SDK/PostgREST), **supprimer ou
--   écraser** les justificatifs de dépense et les archives de son
--   organisation — alors que la suppression de la ligne de métadonnée, elle,
--   est refusée. Dégât d'intégrité : perte de preuves financières / documents
--   archivés (la ligne survit, le fichier disparaît → justificatif cassé).
--   (Le client, lui, n'a aucune garde de rôle : `JustificatifsSection` ne
--   désactive les boutons que pendant l'opération.)
--
-- CORRECTIF
--   Aligner chaque policy d'écriture/suppression de blob sur la permission
--   exigée par la table de métadonnées correspondante :
--     * `expense_proofs` → `has_permission(uid, org, 'transaction', 'update')` ;
--     * `archives`       → `has_permission(uid, org, 'admin', 'settings')`.
--   La LECTURE (`lumina_private_read`, SELECT) reste `is_org_member` : tout
--   membre peut CONSULTER les justificatifs/archives de son organisation — on
--   ne restreint que l'écriture et la suppression.
--
-- HORS PÉRIMÈTRE (assumé)
--   `logos` (bucket public par conception) et `org_reports` (rapports dont la
--   table `org_reports` autorise déjà tout membre de l'org émettrice) gardent
--   `is_org_member`, cohérent avec leur métadonnée.
--
-- RÉVERSIBILITÉ : rollback/20261104000011_rollback.sql (restaure les policies
--   `lumina_private_write`/`lumina_private_delete` scoppées à `is_org_member`).
-- ============================================================================

-- On remplace les policies génériques archives+expense_proofs par une policy
-- par bucket (permissions distinctes).
DROP POLICY IF EXISTS lumina_private_write ON storage.objects;
DROP POLICY IF EXISTS lumina_private_delete ON storage.objects;

-- ── archives : écriture/suppression réservées à `admin:settings` ────────────
CREATE POLICY lumina_archives_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'archives'
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
    AND public.has_permission(
          initplan_uid(), (storage.foldername(name))[1], 'admin', 'settings')
  );

CREATE POLICY lumina_archives_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'archives'
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
    AND public.has_permission(
          initplan_uid(), (storage.foldername(name))[1], 'admin', 'settings')
  );

-- ── expense_proofs : écriture/suppression réservées à `transaction:update` ──
CREATE POLICY lumina_expense_proofs_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'expense_proofs'
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
    AND public.has_permission(
          initplan_uid(), (storage.foldername(name))[1], 'transaction', 'update')
  );

CREATE POLICY lumina_expense_proofs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'expense_proofs'
    AND public.is_org_member(initplan_uid(), (storage.foldername(name))[1])
    AND public.has_permission(
          initplan_uid(), (storage.foldername(name))[1], 'transaction', 'update')
  );
