-- ============================================================================
-- 20261029000002 — R137 CORRIGÉ : l'autorisation d'ÉCRITURE est appliquée en base
-- ----------------------------------------------------------------------------
-- DÉFAUT (mesuré 2026-10-29, R137)
--   `has_permission(uid, org, resource, action)` existe depuis la migration
--   `20261026000002`, mais AUCUNE politique d'écriture ne l'appelait (1 seule
--   l'utilise, en LECTURE). `transactions` / `versements` / `members` /
--   `events` / `groups` reposaient sur `is_org_member` SEUL : un `MEMBRE`
--   (permissions `event:read`, `transaction:read`) pouvait, via REST/PostgREST
--   direct, INSERT/UPDATE/DELETE une transaction de son organisation.
--
--   Note (limite honnête) : le chemin d'écriture de l'APPLICATION passe par
--   PowerSync, dont le rôle Postgres `powersync_role` porte `BYPASSRLS` — ces
--   politiques ne le concernent donc pas. Le défaut vise le client REST direct
--   (clé anon publique + JWT), c'est-à-dire un utilisateur légitime malveillant
--   ou un script. C'est néanmoins la barrière serveur attendue.
--
-- CORRECTIF
--   Chaque politique d'écriture devient :
--     is_org_member(uid, org) AND has_permission(uid, org, <res>, <act>)
--   Le rôle canon `ADMIN` (migration 20261029000001) détient toutes les
--   permissions → il passe partout.
--
--   Tables câblées : transactions, versements, members, events, groups.
--   Tables laissées en `is_org_member` seul (documenté, R137.a) : `documents`
--   et `accounts` — le modèle de permissions ne définit AUCUNE permission
--   `document:*` / `account:*` ; les y contraindre fermerait l'écriture à tous
--   les rôles. À traiter quand le vocabulaire de permissions sera étendu.
--
-- RÉVERSIBILITÉ : rollback/20261029000002_rollback.sql
-- ============================================================================

-- ── transactions ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
CREATE POLICY transactions_insert ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'transaction', 'create'));

DROP POLICY IF EXISTS transactions_update ON public.transactions;
CREATE POLICY transactions_update ON public.transactions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'transaction', 'update'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'transaction', 'update'));

DROP POLICY IF EXISTS transactions_delete ON public.transactions;
CREATE POLICY transactions_delete ON public.transactions
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'transaction', 'delete'));

-- ── versements ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS versements_insert ON public.versements;
CREATE POLICY versements_insert ON public.versements
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'versement', 'create'));

DROP POLICY IF EXISTS versements_update ON public.versements;
CREATE POLICY versements_update ON public.versements
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'versement', 'approve'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'versement', 'approve'));

DROP POLICY IF EXISTS versements_delete ON public.versements;
CREATE POLICY versements_delete ON public.versements
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'versement', 'approve'));

-- ── members ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS members_insert ON public.members;
CREATE POLICY members_insert ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'member', 'create'));

DROP POLICY IF EXISTS members_update ON public.members;
CREATE POLICY members_update ON public.members
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'member', 'update'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'member', 'update'));

DROP POLICY IF EXISTS members_delete ON public.members;
CREATE POLICY members_delete ON public.members
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'member', 'delete'));

-- ── events ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS events_insert ON public.events;
CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'event', 'create'));

DROP POLICY IF EXISTS events_update ON public.events;
CREATE POLICY events_update ON public.events
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'event', 'update'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'event', 'update'));

DROP POLICY IF EXISTS events_delete ON public.events;
CREATE POLICY events_delete ON public.events
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'event', 'delete'));

-- ── groups ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS groups_insert ON public.groups;
CREATE POLICY groups_insert ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'group', 'create'));

DROP POLICY IF EXISTS groups_update ON public.groups;
CREATE POLICY groups_update ON public.groups
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'group', 'update'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'group', 'update'));

DROP POLICY IF EXISTS groups_delete ON public.groups;
CREATE POLICY groups_delete ON public.groups
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'group', 'delete'));
