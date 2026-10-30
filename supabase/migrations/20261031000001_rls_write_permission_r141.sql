-- ============================================================================
-- 20261031000001 — R141 CORRIGÉ : l'autorisation d'ÉCRITURE est étendue aux
-- tables restées en `is_org_member` SEUL (suite de R137, qui n'avait couvert
-- que 15 politiques : transactions, versements, members, events, groups).
-- ----------------------------------------------------------------------------
-- DÉFAUT (mesuré 2026-10-30, R141)
--   14 tables (dont des tables FINANCIÈRES : `accounts`, `caisses`,
--   `org_budgets`, `tax_receipts`, `pledges`, `giving_*`) avaient leurs
--   politiques INSERT/UPDATE/DELETE fondées sur `is_org_member(...)` SEUL :
--   tout MEMBRE, quel que soit son rôle, pouvait écrire au niveau base (REST
--   direct). Exploitabilité prouvée : `INSERT INTO accounts` accepté par la RLS.
--
--   L'escalade de privilèges par ces tables est IMPOSSIBLE (vérifié) :
--   `org_memberships`/`grants`/`org_admins` sont gardés par `is_org_admin`,
--   `profiles.role` est immuable (`guard_profile_role_immutable` → 42501).
--
-- PÉRIMÈTRE (décision 2026-10-30) — 2 lots :
--   Lot 1 (permission canon EXISTANTE) :
--     * cotisations        → cotisation:manage
--     * group_memberships  → group:update
--     * org_units          → admin:settings
--   Lot 2 (permission NOUVELLE, ajoutée à `role_permissions`) :
--     * finance:manage  → accounts, caisses, org_budgets, org_budget_lines,
--       budget_lines, event_budgets, pledges, giving_campaigns, giving_donors,
--       transaction_giving, tax_receipts
--
--   Détenteurs de `finance:manage` : ADMIN, PASTEUR_PRINCIPAL, TREASURIER,
--   TREASURIER_ADJOINT (miroir TS `PERMISSION_MATRIX`). `ADMIN` détient déjà
--   toutes les permissions (R109) ; `admin:settings` est détenue par ADMIN et
--   PASTEUR_PRINCIPAL.
--
--   Hors périmètre (justifié) : `categories` (écrite dynamiquement par le
--   cycle de vie `UPDATE ${table}`), `role_assignments` (table morte : 0
--   référence client, hors sync-config), `notifications`/`custom_field_*`/
--   `form_*`/`report_definitions` (pas de permission canon ; traiter en R141.c).
--
-- SÛRETÉ : le chemin d'écriture de l'APPLICATION passe par PowerSync, dont le
--   rôle `powersync_role` porte BYPASSRLS (vérifié) — ces politiques ne le
--   concernent donc pas et ne peuvent pas casser un flux applicatif. Elles
--   ferment le client REST direct (clé anon publique + JWT).
--
-- RÉVERSIBILITÉ : rollback/20261031000001_rollback.sql
-- ============================================================================

-- ── Nouvelle permission (Lot 2) ─────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('ADMIN', 'finance:manage'),
  ('PASTEUR_PRINCIPAL', 'finance:manage'),
  ('TREASURIER', 'finance:manage'),
  ('TREASURIER_ADJOINT', 'finance:manage')
ON CONFLICT DO NOTHING;

-- ── accounts (finance:manage) ──
DROP POLICY IF EXISTS accounts_insert ON public.accounts;
CREATE POLICY accounts_insert ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS accounts_update ON public.accounts;
CREATE POLICY accounts_update ON public.accounts
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS accounts_delete ON public.accounts;
CREATE POLICY accounts_delete ON public.accounts
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── caisses (finance:manage) ──
DROP POLICY IF EXISTS caisses_insert ON public.caisses;
CREATE POLICY caisses_insert ON public.caisses
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS caisses_update ON public.caisses;
CREATE POLICY caisses_update ON public.caisses
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS caisses_delete ON public.caisses;
CREATE POLICY caisses_delete ON public.caisses
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── org_budgets (finance:manage) ──
DROP POLICY IF EXISTS org_budgets_insert ON public.org_budgets;
CREATE POLICY org_budgets_insert ON public.org_budgets
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS org_budgets_update ON public.org_budgets;
CREATE POLICY org_budgets_update ON public.org_budgets
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS org_budgets_delete ON public.org_budgets;
CREATE POLICY org_budgets_delete ON public.org_budgets
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── org_budget_lines (finance:manage) ──
DROP POLICY IF EXISTS org_budget_lines_insert ON public.org_budget_lines;
CREATE POLICY org_budget_lines_insert ON public.org_budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS org_budget_lines_update ON public.org_budget_lines;
CREATE POLICY org_budget_lines_update ON public.org_budget_lines
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS org_budget_lines_delete ON public.org_budget_lines;
CREATE POLICY org_budget_lines_delete ON public.org_budget_lines
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── pledges (finance:manage) ──
DROP POLICY IF EXISTS pledges_insert ON public.pledges;
CREATE POLICY pledges_insert ON public.pledges
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS pledges_update ON public.pledges;
CREATE POLICY pledges_update ON public.pledges
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS pledges_delete ON public.pledges;
CREATE POLICY pledges_delete ON public.pledges
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── giving_campaigns (finance:manage) ──
DROP POLICY IF EXISTS giving_campaigns_insert ON public.giving_campaigns;
CREATE POLICY giving_campaigns_insert ON public.giving_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS giving_campaigns_update ON public.giving_campaigns;
CREATE POLICY giving_campaigns_update ON public.giving_campaigns
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS giving_campaigns_delete ON public.giving_campaigns;
CREATE POLICY giving_campaigns_delete ON public.giving_campaigns
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── giving_donors (finance:manage) ──
DROP POLICY IF EXISTS giving_donors_insert ON public.giving_donors;
CREATE POLICY giving_donors_insert ON public.giving_donors
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS giving_donors_update ON public.giving_donors;
CREATE POLICY giving_donors_update ON public.giving_donors
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS giving_donors_delete ON public.giving_donors;
CREATE POLICY giving_donors_delete ON public.giving_donors
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── transaction_giving (finance:manage) ──
DROP POLICY IF EXISTS transaction_giving_insert ON public.transaction_giving;
CREATE POLICY transaction_giving_insert ON public.transaction_giving
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS transaction_giving_update ON public.transaction_giving;
CREATE POLICY transaction_giving_update ON public.transaction_giving
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS transaction_giving_delete ON public.transaction_giving;
CREATE POLICY transaction_giving_delete ON public.transaction_giving
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── tax_receipts (finance:manage) ──
DROP POLICY IF EXISTS tax_receipts_insert ON public.tax_receipts;
CREATE POLICY tax_receipts_insert ON public.tax_receipts
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS tax_receipts_update ON public.tax_receipts;
CREATE POLICY tax_receipts_update ON public.tax_receipts
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

DROP POLICY IF EXISTS tax_receipts_delete ON public.tax_receipts;
CREATE POLICY tax_receipts_delete ON public.tax_receipts
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'finance', 'manage'));

-- ── budget_lines (finance:manage) ──
DROP POLICY IF EXISTS budget_lines_insert ON public.budget_lines;
CREATE POLICY budget_lines_insert ON public.budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ))
              AND has_permission(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ), 'finance', 'manage'));

DROP POLICY IF EXISTS budget_lines_update ON public.budget_lines;
CREATE POLICY budget_lines_update ON public.budget_lines
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ))
         AND has_permission(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ), 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ))
              AND has_permission(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ), 'finance', 'manage'));

DROP POLICY IF EXISTS budget_lines_delete ON public.budget_lines;
CREATE POLICY budget_lines_delete ON public.budget_lines
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ))
         AND has_permission(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) ), 'finance', 'manage'));

-- ── event_budgets (finance:manage) ──
DROP POLICY IF EXISTS event_budgets_insert ON public.event_budgets;
CREATE POLICY event_budgets_insert ON public.event_budgets
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ))
              AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ), 'finance', 'manage'));

DROP POLICY IF EXISTS event_budgets_update ON public.event_budgets;
CREATE POLICY event_budgets_update ON public.event_budgets
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ))
         AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ), 'finance', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ))
              AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ), 'finance', 'manage'));

DROP POLICY IF EXISTS event_budgets_delete ON public.event_budgets;
CREATE POLICY event_budgets_delete ON public.event_budgets
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ))
         AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) ), 'finance', 'manage'));

-- ── cotisations (cotisation:manage) ──
DROP POLICY IF EXISTS cotisations_insert ON public.cotisations;
CREATE POLICY cotisations_insert ON public.cotisations
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ))
              AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ), 'cotisation', 'manage'));

DROP POLICY IF EXISTS cotisations_update ON public.cotisations;
CREATE POLICY cotisations_update ON public.cotisations
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ))
         AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ), 'cotisation', 'manage'))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ))
              AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ), 'cotisation', 'manage'));

DROP POLICY IF EXISTS cotisations_delete ON public.cotisations;
CREATE POLICY cotisations_delete ON public.cotisations
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ))
         AND has_permission(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) ), 'cotisation', 'manage'));

-- ── group_memberships (group:update) ──
DROP POLICY IF EXISTS group_memberships_insert ON public.group_memberships;
CREATE POLICY group_memberships_insert ON public.group_memberships
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ))
              AND has_permission(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ), 'group', 'update'));

DROP POLICY IF EXISTS group_memberships_update ON public.group_memberships;
CREATE POLICY group_memberships_update ON public.group_memberships
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ))
         AND has_permission(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ), 'group', 'update'))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ))
              AND has_permission(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ), 'group', 'update'));

DROP POLICY IF EXISTS group_memberships_delete ON public.group_memberships;
CREATE POLICY group_memberships_delete ON public.group_memberships
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ))
         AND has_permission(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) ), 'group', 'update'));

-- ── org_units (admin:settings) ──
DROP POLICY IF EXISTS org_units_insert ON public.org_units;
CREATE POLICY org_units_insert ON public.org_units
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS org_units_update ON public.org_units;
CREATE POLICY org_units_update ON public.org_units
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS org_units_delete ON public.org_units;
CREATE POLICY org_units_delete ON public.org_units
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

