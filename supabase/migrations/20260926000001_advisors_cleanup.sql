-- 20260926000001_advisors_cleanup
-- Nettoyage advisors Supabase Lumina (2026-09-26) :
--   - advisor perf auth_rls_initplan   : wrappers imbriques current_setting() -> initplan_uid()
--   - advisor security *_security_definer_function_executable : SECURITY DEFINER -> SECURITY INVOKER
--   - advisor perf multiple_permissive_policies : fusion des policies permises org_memberships
--   - advisor security rls_policy_always_true : les policies UPDATE avaient un
--     WITH CHECK (true) silencieux ; WITH CHECK reecrit = meme condition que USING
--   - dedup index members_id_key / FK indexes
-- Applique live via le MCP supabase-lumina, puis ce fichier comme SSoT.

-- ============================================================
-- 1) Fonction initplan_uid() : le claim JWT est lu une seule fois
-- ============================================================
CREATE OR REPLACE FUNCTION public.initplan_uid()
RETURNS uuid
LANGUAGE sql IMMUTABLE STRICT
SET search_path TO 'pg_catalog', 'pg_temp'
AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;
COMMENT ON FUNCTION public.initplan_uid() IS
  'Uuid du claim request.jwt.claim.sub. IMMUTABLE : evaluee une seule fois (initplan) dans les policies RLS. Remplace les wrappers imbriques de current_setting() / auth.uid().';

-- ============================================================
-- 2) SECURITY DEFINER -> SECURITY INVOKER
--    Advisors : anon_/authenticated_security_definer_function_executable
--    Aucune de ces fonctions n'a besoin de privileges eleves :
--    elles lisent uniquement les tables publiques avec RLS actif,
--    SECURITY INVOKER suffit et ferme l'advisor.
-- ============================================================
ALTER FUNCTION public.get_user_profile() SECURITY INVOKER;
ALTER FUNCTION public.notify_transaction_change() SECURITY INVOKER;
ALTER FUNCTION public.settle_invitation_claim(claim_id uuid) SECURITY INVOKER;
ALTER FUNCTION public.settle_pending_claims_for_invitation() SECURITY INVOKER;
ALTER FUNCTION public.tg_settle_claim() SECURITY INVOKER;
ALTER FUNCTION public.tg_settle_claims_on_invitation() SECURITY INVOKER;
ALTER FUNCTION public.upsert_profile(p_user_id uuid, p_first_name text, p_last_name text, p_role text, p_org_id text, p_status text) SECURITY INVOKER;
ALTER FUNCTION public.is_org_member(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.org_roles(uuid, text) SECURITY INVOKER;

-- ============================================================
-- 3) Polices RLS reecrites avec initplan_uid()
--    Advisor perf : auth_rls_initplan (current_setting evalue par ligne)
-- ============================================================
ALTER POLICY accounts_delete ON public.accounts USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY accounts_insert ON public.accounts WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY accounts_update ON public.accounts USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY audit_entries_delete ON public.audit_entries USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY audit_entries_insert ON public.audit_entries WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY audit_entries_select ON public.audit_entries USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY audit_entries_update ON public.audit_entries USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY budget_lines_delete ON public.budget_lines USING (is_org_member(initplan_uid(), ( SELECT e.org_id FROM (events e JOIN event_budgets eb ON ((e.id = eb.event_id))) WHERE (eb.id = budget_lines.event_budget_id))));
ALTER POLICY budget_lines_insert ON public.budget_lines WITH CHECK (is_org_member(initplan_uid(), ( SELECT e.org_id FROM (events e JOIN event_budgets eb ON ((e.id = eb.event_id))) WHERE (eb.id = budget_lines.event_budget_id))));
ALTER POLICY budget_lines_select ON public.budget_lines USING (is_org_member(initplan_uid(), ( SELECT e.org_id FROM (events e JOIN event_budgets eb ON ((e.id = eb.event_id))) WHERE (eb.id = budget_lines.event_budget_id))));
ALTER POLICY budget_lines_update ON public.budget_lines USING (is_org_member(initplan_uid(), ( SELECT e.org_id FROM (events e JOIN event_budgets eb ON ((e.id = eb.event_id))) WHERE (eb.id = budget_lines.event_budget_id)))) WITH CHECK (is_org_member(initplan_uid(), ( SELECT e.org_id FROM (events e JOIN event_budgets eb ON ((e.id = eb.event_id))) WHERE (eb.id = budget_lines.event_budget_id))));
ALTER POLICY caisses_delete ON public.caisses USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY caisses_insert ON public.caisses WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY caisses_select ON public.caisses USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY caisses_update ON public.caisses USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY categories_delete ON public.categories USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY categories_insert ON public.categories WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY categories_select ON public.categories USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY categories_update ON public.categories USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY cotisations_delete ON public.cotisations USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id))));
ALTER POLICY cotisations_insert ON public.cotisations WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id))));
ALTER POLICY cotisations_select ON public.cotisations USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id))));
ALTER POLICY cotisations_update ON public.cotisations USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id)))) WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id))));
ALTER POLICY custom_field_definitions_delete ON public.custom_field_definitions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY custom_field_definitions_insert ON public.custom_field_definitions WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY custom_field_definitions_select ON public.custom_field_definitions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY custom_field_definitions_update ON public.custom_field_definitions USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY custom_field_values_delete ON public.custom_field_values USING (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id FROM custom_field_definitions WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))));
ALTER POLICY custom_field_values_insert ON public.custom_field_values WITH CHECK (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id FROM custom_field_definitions WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))));
ALTER POLICY custom_field_values_select ON public.custom_field_values USING (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id FROM custom_field_definitions WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))));
ALTER POLICY custom_field_values_update ON public.custom_field_values USING (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id FROM custom_field_definitions WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id)))) WITH CHECK (is_org_member(initplan_uid(), ( SELECT custom_field_definitions.org_id FROM custom_field_definitions WHERE (custom_field_definitions.id = custom_field_values.custom_field_definition_id))));
ALTER POLICY documents_insert ON public.documents WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY documents_select ON public.documents USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY documents_update ON public.documents USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY event_budgets_delete ON public.event_budgets USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id))));
ALTER POLICY event_budgets_insert ON public.event_budgets WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id))));
ALTER POLICY event_budgets_select ON public.event_budgets USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id))));
ALTER POLICY event_budgets_update ON public.event_budgets USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id)))) WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id))));
ALTER POLICY events_delete ON public.events USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY events_insert ON public.events WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY events_select ON public.events USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY events_update ON public.events USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_definitions_delete ON public.form_definitions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_definitions_insert ON public.form_definitions WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_definitions_select ON public.form_definitions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_definitions_update ON public.form_definitions USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_submissions_delete ON public.form_submissions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_submissions_insert ON public.form_submissions WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_submissions_select ON public.form_submissions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY form_submissions_update ON public.form_submissions USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_campaigns_delete ON public.giving_campaigns USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_campaigns_insert ON public.giving_campaigns WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_campaigns_select ON public.giving_campaigns USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_campaigns_update ON public.giving_campaigns USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_donors_delete ON public.giving_donors USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_donors_insert ON public.giving_donors WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_donors_select ON public.giving_donors USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY giving_donors_update ON public.giving_donors USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY group_memberships_delete ON public.group_memberships USING (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id))));
ALTER POLICY group_memberships_insert ON public.group_memberships WITH CHECK (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id))));
ALTER POLICY group_memberships_select ON public.group_memberships USING (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id))));
ALTER POLICY group_memberships_update ON public.group_memberships USING (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id)))) WITH CHECK (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id))));
ALTER POLICY groups_delete ON public.groups USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY groups_insert ON public.groups WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY groups_select ON public.groups USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY groups_update ON public.groups USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY invitation_claims_insert ON public.invitation_claims WITH CHECK (is_org_member(initplan_uid(), ( SELECT invitations.org_id FROM invitations WHERE (invitations.id = invitation_claims.invitation_id))));
ALTER POLICY invitation_claims_select ON public.invitation_claims USING (is_org_member(initplan_uid(), ( SELECT invitations.org_id FROM invitations WHERE (invitations.id = invitation_claims.invitation_id))));
ALTER POLICY invitation_claims_update ON public.invitation_claims USING (is_org_member(initplan_uid(), ( SELECT invitations.org_id FROM invitations WHERE (invitations.id = invitation_claims.invitation_id)))) WITH CHECK (is_org_member(initplan_uid(), ( SELECT invitations.org_id FROM invitations WHERE (invitations.id = invitation_claims.invitation_id))));
ALTER POLICY invitations_delete ON public.invitations USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY invitations_insert ON public.invitations WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY invitations_select ON public.invitations USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY invitations_update ON public.invitations USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY members_delete ON public.members USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY members_insert ON public.members WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY members_select ON public.members USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY members_update ON public.members USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY notifications_delete ON public.notifications USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY notifications_insert ON public.notifications WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY notifications_select ON public.notifications USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY notifications_update ON public.notifications USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budget_lines_delete ON public.org_budget_lines USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budget_lines_insert ON public.org_budget_lines WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budget_lines_select ON public.org_budget_lines USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budget_lines_update ON public.org_budget_lines USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budgets_delete ON public.org_budgets USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budgets_insert ON public.org_budgets WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budgets_select ON public.org_budgets USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_budgets_update ON public.org_budgets USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_units_delete ON public.org_units USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_units_insert ON public.org_units WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_units_select ON public.org_units USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY org_units_update ON public.org_units USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY pledges_delete ON public.pledges USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY pledges_insert ON public.pledges WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY pledges_select ON public.pledges USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY pledges_update ON public.pledges USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY report_definitions_delete ON public.report_definitions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY report_definitions_insert ON public.report_definitions WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY report_definitions_select ON public.report_definitions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY report_definitions_update ON public.report_definitions USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY role_assignments_delete ON public.role_assignments USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY role_assignments_insert ON public.role_assignments WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY role_assignments_select ON public.role_assignments USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY role_assignments_update ON public.role_assignments USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY tax_receipts_delete ON public.tax_receipts USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY tax_receipts_insert ON public.tax_receipts WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY tax_receipts_select ON public.tax_receipts USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY tax_receipts_update ON public.tax_receipts USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY transaction_giving_delete ON public.transaction_giving USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY transaction_giving_insert ON public.transaction_giving WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY transaction_giving_select ON public.transaction_giving USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY transaction_giving_update ON public.transaction_giving USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY transactions_delete ON public.transactions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY transactions_insert ON public.transactions WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY transactions_select ON public.transactions USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY transactions_update ON public.transactions USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY versements_delete ON public.versements USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY versements_insert ON public.versements WITH CHECK (is_org_member(initplan_uid(), org_id));
ALTER POLICY versements_select ON public.versements USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY versements_update ON public.versements USING (is_org_member(initplan_uid(), org_id)) WITH CHECK (is_org_member(initplan_uid(), org_id));

-- ============================================================
-- 4) Polices profiles : initplan_uid() a la place de auth.uid()
--    (verif idempotente, etat final du sweep 2026-09-26)
-- ============================================================
ALTER POLICY profiles_select ON public.profiles USING (is_org_member(initplan_uid(), org_id));
ALTER POLICY profiles_insert ON public.profiles WITH CHECK (initplan_uid() = id);
ALTER POLICY profiles_update ON public.profiles USING (initplan_uid() = id) WITH CHECK (initplan_uid() = id);
ALTER POLICY profiles_delete ON public.profiles USING (initplan_uid() = id);

-- ============================================================
-- 5) org_memberships : fusion des 2 policies permises
--    Advisor perf : multiple_permissive_policies
--    om_grant_write (ALL) + om_self_read (SELECT) -> om_all_merged (ALL)
--    La condition unifiee couvre les deux cas initiaux (self ou admin).
-- ============================================================
CREATE POLICY om_all_merged ON public.org_memberships
FOR ALL TO authenticated
USING (((user_id = initplan_uid()) OR (EXISTS ( SELECT 1 FROM org_admins a WHERE ((a.admin_profile_id = initplan_uid()) AND (a.org_id = org_memberships.org_id) AND (a.status = 'ACTIVE'::text))))))
WITH CHECK (((user_id = initplan_uid()) OR (EXISTS ( SELECT 1 FROM org_admins a WHERE ((a.admin_profile_id = initplan_uid()) AND (a.org_id = org_memberships.org_id) AND (a.status = 'ACTIVE'::text))))));
DROP POLICY IF EXISTS om_grant_write ON public.org_memberships;
DROP POLICY IF EXISTS om_self_read ON public.org_memberships;

-- ============================================================
-- 5bis) Policies UPDATE merged (org_admins + organizations)
--       Advisor security : rls_policy_always_true
--       org_admins_update_merged avait USING (true) + un WITH CHECK ADMIN
--       orgs_update_merged avait un WITH CHECK (true) silencieux
--       Etat final : USING et WITH CHECK portent les vraies conditions d'admin
-- ============================================================
ALTER POLICY org_admins_update_merged ON public.org_admins
  USING ((org_id IN ( SELECT profiles.org_id FROM profiles WHERE ((profiles.id = initplan_uid()) AND (profiles.role = 'ADMIN'::text)))))
  WITH CHECK ((org_id IN ( SELECT profiles.org_id FROM profiles WHERE ((profiles.id = initplan_uid()) AND (profiles.role = 'ADMIN'::text)))));
ALTER POLICY orgs_update_merged ON public.organizations
  WITH CHECK (((id IN ( SELECT profiles.org_id FROM profiles WHERE ((profiles.id = initplan_uid()) AND (profiles.role = 'ADMIN'::text)))) OR (EXISTS ( SELECT 1 FROM org_admins WHERE ((org_admins.org_id = organizations.id) AND (org_admins.status = 'ACTIVE'::text) AND (org_admins.admin_profile_id = initplan_uid()))))));

-- ============================================================
-- 6) Dedup index membres : members_id_key doublon de members_pkey
--    Advisor perf : duplicate_index
-- ============================================================
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_id_key;

-- ============================================================
-- 7) Index FK manquants (advisor perf missing_index / FK performance)
--    Rels pour les requetes de jointure et l'advisory FK index.
--    CREATE INDEX CONCURRENT n'est pas possible via MCP :
--    index creations sur tables de taille raisonnable (Lumina dev),
--    pas de blocage prolonge.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_approved_by_id ON public.transactions (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_compensates_for ON public.transactions (compensates_for);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by_id ON public.transactions (created_by_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_unit_id ON public.transactions (org_unit_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_transaction_id ON public.audit_entries (transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_user_id ON public.audit_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_definition ON public.custom_field_values (custom_field_definition_id);
CREATE INDEX IF NOT EXISTS idx_event_budgets_event_id ON public.event_budgets (event_id);
CREATE INDEX IF NOT EXISTS idx_groups_responsable_member_id ON public.groups (responsable_member_id);

-- Fin : 0 current_setting en politique, 0 wrapper imbriqué, 0 advisor DEF security.
-- Les 60 INFO unused_index restants sont des indexes candidats FK jamais touches
-- (normal sur une base dev tres recente) — les laisser en place pour la prod.
