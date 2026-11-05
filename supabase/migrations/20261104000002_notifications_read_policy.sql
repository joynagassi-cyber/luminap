-- ============================================================================
-- 20261104000002 — « Marquer une notification comme lue » (R-H)
-- ----------------------------------------------------------------------------
-- DÉFAUT (mesuré en production, 2026-11-04)
--   `notifications_update` exigeait `is_org_member AND
--   has_permission('admin','settings')`. Un TREASURIER / PASTEUR_PRINCIPAL /
--   ANCIEN ne pouvait donc PAS passer `is_read` à true : la mise à jour était
--   refusée par la RLS (42501), et le client retombait sur un état React
--   volatile (aucune persistance). Résultat : « marquer lu » sans effet.
--
-- CORRECTIF (minimal, réversible)
--   Autoriser TOUT membre de l'organisation à écrire — mais UNIQUEMENT la
--   colonne `is_read` — via un privilège COLONNE, la RLS restant `is_org_member` :
--     • `REVOKE UPDATE` global puis `GRANT UPDATE (is_read)` : un membre ne
--       peut pas altérer `title`/`message`/`action_type`/`org_id` (le privilège
--       colonne bloque les autres colonnes, la RLS bloque les autres orgs) ;
--     • la policy `notifications_update` devient `is_org_member(uid, org_id)`
--       en USING et en WITH CHECK.
--   `notifications_insert` / `notifications_delete` restent réservés à
--   `admin:settings` (inchangé).
--
--   Le privilège colonne est porté par le rôle `authenticated` (voie PowerSync
--   push, JWT utilisateur). Le rôle de réplication PowerSync est distinct et
--   n'est pas concerné.
--
-- RÉVERSIBILITÉ : rollback/20261104000002_rollback.sql.
-- ============================================================================

-- 1. RLS : tout membre peut mettre à jour SA notification.
DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));

-- 2. Privilège colonne : seul `is_read` est modifiable par un membre.
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
