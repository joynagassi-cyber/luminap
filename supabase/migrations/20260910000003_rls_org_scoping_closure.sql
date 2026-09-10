-- ============================================================================
-- T3 — Clôture du scoping RLS par organisation (socle + admin central)
-- ----------------------------------------------------------------------------
-- État constaté en base vivante : la plupart des tables métier avaient des
-- policies ouvertes (`*_open_all` = USING (true)) — le scoping par membership
-- (migration 20260909000000 du dépôt) n'était pas effectif sur l'instance.
-- Cette migration est le socle unique et idempotent du scoping :
--
--   1. Helper STABLE `public.is_org_member(uid, org_id)` :
--        est membre de l'org  OU  admin central gérant l'org (grant actif).
--   2. Suppression de TOUTES les policies ouvertes / membership-only existantes
--      sur les tables concernées (boucle générique, sans ordre imposé).
--   3. Recréation des policies scoping par org via le helper (lequel intègre
--      déjà la branche « admin central avec grant »).
--
-- Séparations garanties (spec §6/§21) :
--   * Membre d'org A → lecture B : INTERDIT (ni membership ni grant)
--   * Central admin, grant actif sur B → lecture B : AUTORISÉ
--   * Central admin, sans grant sur B → INTERDIT
--   * Grant REVOKED → accès retiré immédiatement (status non ACTIF)
--
-- Les ÉCRITURES de cycle de vie (suspend/rearchiver org, assign/revoke admin)
-- ne passent PAS par des policies ouvertes : fonctions SECURITY DEFINER
-- (migration T6) qui vérifient le grant elles-mêmes — le rôle central ne
-- reçoit aucune permission financière automatique.
-- ============================================================================

-- ── 1. Helper stable (SECURITY DEFINER : contourne RLS, schema verrouillé) ──
CREATE OR REPLACE FUNCTION public.is_org_member(uid UUID, org_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = $1 AND org_id = $2
  )
  OR EXISTS (
    SELECT 1 FROM public.org_admins
    WHERE admin_profile_id = $1 AND org_id = $2 AND status = 'ACTIVE'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, TEXT) TO authenticated;

-- ── 2. Nettoyage de toutes les policies existantes (ouvertes ou obsolètes) ──
DO $$
DECLARE
  t TEXT;
  p RECORD;
  tables_org TEXT[] := ARRAY[
    'transactions','members','groups','events','caisses','accounts',
    'versements','audit_entries','categories','org_units','notifications',
    'role_assignments','report_definitions','form_definitions',
    'form_submissions','custom_field_definitions','custom_field_values',
    'cotisations','invitations','invitation_claims','group_memberships',
    'event_budgets','budget_lines','profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables_org LOOP
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ── 3. Recreation scoped (direct org_id + derived via FK) ─────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caisses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

-- profiles : soi-même OU member/grant de sa (ses) org
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'transactions','members','groups','events','caisses','accounts',
    'versements','audit_entries','categories','org_units','notifications',
    'role_assignments','report_definitions','form_definitions',
    'form_submissions','custom_field_definitions','invitations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "%1$s_select" ON public.%1$I
         FOR SELECT TO authenticated
         USING (public.is_org_member(auth.uid(), %1$I.org_id))', t);
    EXECUTE format(
      'CREATE POLICY "%1$s_insert" ON public.%1$I
         FOR INSERT TO authenticated
         WITH CHECK (public.is_org_member(auth.uid(), %1$I.org_id))', t);
    EXECUTE format(
      'CREATE POLICY "%1$s_update" ON public.%1$I
         FOR UPDATE TO authenticated
         USING (public.is_org_member(auth.uid(), %1$I.org_id))', t);
    EXECUTE format(
      'CREATE POLICY "%1$s_delete" ON public.%1$I
         FOR DELETE TO authenticated
         USING (public.is_org_member(auth.uid(), %1$I.org_id))', t);
  END LOOP;
END $$;

-- ── 3b. Tables dérivées (pas d'org_id direct : dérivation via FK) ────────
CREATE POLICY "group_memberships_select" ON public.group_memberships
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.members WHERE id = group_memberships.member_id)));
CREATE POLICY "group_memberships_insert" ON public.group_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.members WHERE id = group_memberships.member_id)));
CREATE POLICY "group_memberships_update" ON public.group_memberships
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.members WHERE id = group_memberships.member_id)));
CREATE POLICY "group_memberships_delete" ON public.group_memberships
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.members WHERE id = group_memberships.member_id)));

CREATE POLICY "event_budgets_select" ON public.event_budgets
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = event_budgets.event_id)));
CREATE POLICY "event_budgets_insert" ON public.event_budgets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = event_budgets.event_id)));
CREATE POLICY "event_budgets_update" ON public.event_budgets
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = event_budgets.event_id)));
CREATE POLICY "event_budgets_delete" ON public.event_budgets
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = event_budgets.event_id)));

CREATE POLICY "budget_lines_select" ON public.budget_lines
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events e
         JOIN public.event_budgets eb ON e.id = eb.event_id
         WHERE eb.id = budget_lines.event_budget_id)));
CREATE POLICY "budget_lines_insert" ON public.budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events e
         JOIN public.event_budgets eb ON e.id = eb.event_id
         WHERE eb.id = budget_lines.event_budget_id)));
CREATE POLICY "budget_lines_update" ON public.budget_lines
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events e
         JOIN public.event_budgets eb ON e.id = eb.event_id
         WHERE eb.id = budget_lines.event_budget_id)));
CREATE POLICY "budget_lines_delete" ON public.budget_lines
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events e
         JOIN public.event_budgets eb ON e.id = eb.event_id
         WHERE eb.id = budget_lines.event_budget_id)));

CREATE POLICY "custom_field_values_select" ON public.custom_field_values
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.custom_field_definitions
         WHERE id = custom_field_values.custom_field_definition_id)));
CREATE POLICY "custom_field_values_insert" ON public.custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.custom_field_definitions
         WHERE id = custom_field_values.custom_field_definition_id)));
CREATE POLICY "custom_field_values_update" ON public.custom_field_values
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.custom_field_definitions
         WHERE id = custom_field_values.custom_field_definition_id)));
CREATE POLICY "custom_field_values_delete" ON public.custom_field_values
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.custom_field_definitions
         WHERE id = custom_field_values.custom_field_definition_id)));

-- cotisations : dérivation via culte_id → events.org_id (pas de org_id direct)
CREATE POLICY "cotisations_select" ON public.cotisations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = cotisations.culte_id)));
CREATE POLICY "cotisations_insert" ON public.cotisations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = cotisations.culte_id)));
CREATE POLICY "cotisations_update" ON public.cotisations
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = cotisations.culte_id)));
CREATE POLICY "cotisations_delete" ON public.cotisations
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.events WHERE id = cotisations.culte_id)));

CREATE POLICY "invitation_claims_select" ON public.invitation_claims
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.invitations WHERE id = invitation_claims.invitation_id)));
CREATE POLICY "invitation_claims_insert" ON public.invitation_claims
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.invitations WHERE id = invitation_claims.invitation_id)));
CREATE POLICY "invitation_claims_update" ON public.invitation_claims
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(),
        (SELECT org_id FROM public.invitations WHERE id = invitation_claims.invitation_id)));

-- ── 3c. Registre organizations : l'admin central lit les orgs qu'il gère ──
CREATE POLICY "orgs_select_admin_grant" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));

-- Création d'une organisation : réservé à un admin central qui détient au
-- moins un grant actif (remplace l'ancienne policy « orgs_insert_authenticated »
-- qui autorisait n'importe quel user authentifié).
DROP POLICY IF EXISTS "orgs_insert_authenticated" ON public.organizations;
CREATE POLICY "orgs_insert_admin" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT admin_profile_id FROM public.org_admins WHERE status = 'ACTIVE'
  ));
-- UPDATE du registre : réservé aux admins locaux (voir T1) + fonctions T6.
