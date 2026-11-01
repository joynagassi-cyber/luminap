-- ============================================================================
-- 20261031000006 — Réconciliation R17 : vue `org_federation`.
-- ----------------------------------------------------------------------------
-- DÉRIVE (mesurée 2026-10-31) : la vue `public.org_federation` existe en base
-- mais n'a AUCUN `CREATE ... VIEW` dans le dépôt (créée hors migration
-- versionnée — cf. `20261022000008_fix_org_family_view_rls.sql` qui la mentionne
-- comme déjà présente). Une base reconstruite depuis les migrations du dépôt ne
-- la recréerait pas → écart de reproductibilité (R17).
--
-- CORRECTIF : recréation idempotente. `CREATE OR REPLACE VIEW` conserve l'OID
-- de la relation et donc les PRIVILÈGES existants (aucun impact sur les grants).
-- La définition est copiée **à l'identique** de `pg_get_viewdef` (mêmes colonnes,
-- même ordre, mêmes types) → no-op sur la base, mais dépôt auto-cohérent.
--
-- SÉCURITÉ : `security_invoker=true` (comme en base) → la vue s'exécute avec
-- les droits de l'appelant et respecte donc la RLS de `organizations` (aucune
-- fuite inter-organisations).
--
-- RÉVERSIBILITÉ : rollback/20261031000006_rollback.sql (DROP VIEW).
-- ============================================================================

CREATE OR REPLACE VIEW public.org_federation
WITH (security_invoker = true) AS
SELECT
  o.id            AS org_id,
  o.name          AS org_name,
  o.type          AS org_type,
  o.status        AS org_status,
  o.parent_org_id AS parent_org_id,
  parent.name     AS parent_name,
  parent.id       AS parent_id,
  (SELECT count(*) FROM public.organizations ch WHERE ch.parent_org_id = o.id) AS child_count
FROM public.organizations o
LEFT JOIN public.organizations parent ON parent.id = o.parent_org_id;
