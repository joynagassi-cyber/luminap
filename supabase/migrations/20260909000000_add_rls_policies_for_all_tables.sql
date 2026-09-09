-- Migration: Add proper RLS policies for all tables
-- Replaces open (USING true) policies with org-scoped access control.
-- Membership is derived from public.profiles (id = auth user, org_id = org).
-- Tables without direct org_id derive it via FK joins.

-- ============================================================
-- HELPERS: shared org-membership expression used across policies
-- ============================================================

-- profiles table
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "open_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "open_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "open_profile_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = profiles.org_id));

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

-- categories table
-- ============================================================
DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
DROP POLICY IF EXISTS "open_cat_select" ON public.categories;
DROP POLICY IF EXISTS "open_cat_insert" ON public.categories;
DROP POLICY IF EXISTS "open_cat_update" ON public.categories;

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = categories.org_id));

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = categories.org_id));

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = categories.org_id));

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = categories.org_id));

-- org_units table
-- ============================================================
DROP POLICY IF EXISTS "org_units_select" ON public.org_units;
DROP POLICY IF EXISTS "org_units_insert" ON public.org_units;
DROP POLICY IF EXISTS "org_units_update" ON public.org_units;
DROP POLICY IF EXISTS "org_units_delete" ON public.org_units;
DROP POLICY IF EXISTS "open_ou_select" ON public.org_units;
DROP POLICY IF EXISTS "open_ou_insert" ON public.org_units;
DROP POLICY IF EXISTS "open_ou_update" ON public.org_units;
DROP POLICY IF EXISTS "org_units_open_all" ON public.org_units;

CREATE POLICY "org_units_select" ON public.org_units
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = org_units.org_id));

CREATE POLICY "org_units_insert" ON public.org_units
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = org_units.org_id));

CREATE POLICY "org_units_update" ON public.org_units
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = org_units.org_id));

CREATE POLICY "org_units_delete" ON public.org_units
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = org_units.org_id));

-- transactions table
-- ============================================================
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;
DROP POLICY IF EXISTS "open_tx_select" ON public.transactions;
DROP POLICY IF EXISTS "open_tx_insert" ON public.transactions;
DROP POLICY IF EXISTS "open_tx_update" ON public.transactions;
DROP POLICY IF EXISTS "open_tx_delete" ON public.transactions;

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = transactions.org_id));

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = transactions.org_id));

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = transactions.org_id));

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = transactions.org_id));

-- audit_entries table
-- ============================================================
DROP POLICY IF EXISTS "audit_entries_select" ON public.audit_entries;
DROP POLICY IF EXISTS "audit_entries_insert" ON public.audit_entries;
DROP POLICY IF EXISTS "open_audit_select" ON public.audit_entries;
DROP POLICY IF EXISTS "open_audit_insert" ON public.audit_entries;

CREATE POLICY "audit_entries_select" ON public.audit_entries
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = audit_entries.org_id));

CREATE POLICY "audit_entries_insert" ON public.audit_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = audit_entries.org_id));

-- role_assignments table
-- ============================================================
DROP POLICY IF EXISTS "role_assignments_insert" ON public.role_assignments;
DROP POLICY IF EXISTS "role_assignments_select" ON public.role_assignments;
DROP POLICY IF EXISTS "role_assignments_update" ON public.role_assignments;
DROP POLICY IF EXISTS "role_assignments_insert_anon" ON public.role_assignments;
DROP POLICY IF EXISTS "role_assignments_select_anon" ON public.role_assignments;
DROP POLICY IF EXISTS "role_assignments_update_anon" ON public.role_assignments;

CREATE POLICY "role_assignments_select" ON public.role_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = role_assignments.org_id));

CREATE POLICY "role_assignments_insert" ON public.role_assignments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = role_assignments.org_id));

CREATE POLICY "role_assignments_update" ON public.role_assignments
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = role_assignments.org_id));

-- notifications table
-- ============================================================
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_anon" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_anon" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_anon" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = notifications.org_id));

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = notifications.org_id));

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = notifications.org_id));

-- events table
-- ============================================================
DROP POLICY IF EXISTS "events_open_all" ON public.events;

CREATE POLICY "events_select" ON public.events
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = events.org_id));

CREATE POLICY "events_insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = events.org_id));

CREATE POLICY "events_update" ON public.events
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = events.org_id));

CREATE POLICY "events_delete" ON public.events
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = events.org_id));

-- caisses table (legacy, replaced by accounts)
-- ============================================================
DROP POLICY IF EXISTS "caisses_select" ON public.caisses;
DROP POLICY IF EXISTS "caisses_insert" ON public.caisses;
DROP POLICY IF EXISTS "caisses_update" ON public.caisses;
DROP POLICY IF EXISTS "caisses_delete" ON public.caisses;

CREATE POLICY "caisses_select" ON public.caisses
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = caisses.org_id));

CREATE POLICY "caisses_insert" ON public.caisses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = caisses.org_id));

CREATE POLICY "caisses_update" ON public.caisses
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = caisses.org_id));

CREATE POLICY "caisses_delete" ON public.caisses
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = caisses.org_id));

-- members table
-- ============================================================
DROP POLICY IF EXISTS "members_open_all" ON members;

CREATE POLICY "members_select" ON members
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = members.org_id));

CREATE POLICY "members_insert" ON members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = members.org_id));

CREATE POLICY "members_update" ON members
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = members.org_id));

CREATE POLICY "members_delete" ON members
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = members.org_id));

-- groups table
-- ============================================================
DROP POLICY IF EXISTS "groups_open_all" ON groups;

CREATE POLICY "groups_select" ON groups
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = groups.org_id));

CREATE POLICY "groups_insert" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = groups.org_id));

CREATE POLICY "groups_update" ON groups
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = groups.org_id));

CREATE POLICY "groups_delete" ON groups
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = groups.org_id));

-- accounts table
-- ============================================================
DROP POLICY IF EXISTS "accounts_open_all" ON accounts;

CREATE POLICY "accounts_select" ON accounts
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = accounts.org_id));

CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = accounts.org_id));

CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = accounts.org_id));

CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = accounts.org_id));

-- group_memberships table (no direct org_id; derive via members or groups)
-- ============================================================
DROP POLICY IF EXISTS "gm_open_all" ON group_memberships;

CREATE POLICY "group_memberships_select" ON group_memberships
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM members WHERE id = group_memberships.member_id
    )
  ));

CREATE POLICY "group_memberships_insert" ON group_memberships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM members WHERE id = group_memberships.member_id
    )
  ));

CREATE POLICY "group_memberships_update" ON group_memberships
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM members WHERE id = group_memberships.member_id
    )
  ));

CREATE POLICY "group_memberships_delete" ON group_memberships
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM members WHERE id = group_memberships.member_id
    )
  ));

-- versements table
-- ============================================================
DROP POLICY IF EXISTS "versements_open_all" ON versements;

CREATE POLICY "versements_select" ON versements
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = versements.org_id));

CREATE POLICY "versements_insert" ON versements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = versements.org_id));

CREATE POLICY "versements_update" ON versements
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = versements.org_id));

CREATE POLICY "versements_delete" ON versements
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = versements.org_id));

-- event_budgets table (no direct org_id; derive via events)
-- ============================================================
DROP POLICY IF EXISTS "eb_open_all" ON event_budgets;

CREATE POLICY "event_budgets_select" ON event_budgets
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = event_budgets.event_id
    )
  ));

CREATE POLICY "event_budgets_insert" ON event_budgets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = event_budgets.event_id
    )
  ));

CREATE POLICY "event_budgets_update" ON event_budgets
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = event_budgets.event_id
    )
  ));

CREATE POLICY "event_budgets_delete" ON event_budgets
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = event_budgets.event_id
    )
  ));

-- budget_lines table (no direct org_id; derive via event_budgets -> events)
-- ============================================================
DROP POLICY IF EXISTS "bl_open_all" ON budget_lines;

CREATE POLICY "budget_lines_select" ON budget_lines
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events e
      JOIN event_budgets eb ON e.id = eb.event_id
      WHERE eb.id = budget_lines.event_budget_id
    )
  ));

CREATE POLICY "budget_lines_insert" ON budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events e
      JOIN event_budgets eb ON e.id = eb.event_id
      WHERE eb.id = budget_lines.event_budget_id
    )
  ));

CREATE POLICY "budget_lines_update" ON budget_lines
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events e
      JOIN event_budgets eb ON e.id = eb.event_id
      WHERE eb.id = budget_lines.event_budget_id
    )
  ));

CREATE POLICY "budget_lines_delete" ON budget_lines
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events e
      JOIN event_budgets eb ON e.id = eb.event_id
      WHERE eb.id = budget_lines.event_budget_id
    )
  ));

-- report_definitions table
-- ============================================================
DROP POLICY IF EXISTS "rd_open_all" ON report_definitions;

CREATE POLICY "report_definitions_select" ON report_definitions
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = report_definitions.org_id));

CREATE POLICY "report_definitions_insert" ON report_definitions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = report_definitions.org_id));

CREATE POLICY "report_definitions_update" ON report_definitions
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = report_definitions.org_id));

CREATE POLICY "report_definitions_delete" ON report_definitions
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = report_definitions.org_id));

-- form_definitions table
-- ============================================================
DROP POLICY IF EXISTS "fd_open_all" ON form_definitions;

CREATE POLICY "form_definitions_select" ON form_definitions
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_definitions.org_id));

CREATE POLICY "form_definitions_insert" ON form_definitions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_definitions.org_id));

CREATE POLICY "form_definitions_update" ON form_definitions
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_definitions.org_id));

CREATE POLICY "form_definitions_delete" ON form_definitions
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_definitions.org_id));

-- form_submissions table
-- ============================================================
DROP POLICY IF EXISTS "fs_open_all" ON form_submissions;

CREATE POLICY "form_submissions_select" ON form_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_submissions.org_id));

CREATE POLICY "form_submissions_insert" ON form_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_submissions.org_id));

CREATE POLICY "form_submissions_update" ON form_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_submissions.org_id));

CREATE POLICY "form_submissions_delete" ON form_submissions
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = form_submissions.org_id));

-- custom_field_definitions table
-- ============================================================
DROP POLICY IF EXISTS "cfd_open_all" ON custom_field_definitions;

CREATE POLICY "custom_field_definitions_select" ON custom_field_definitions
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = custom_field_definitions.org_id));

CREATE POLICY "custom_field_definitions_insert" ON custom_field_definitions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = custom_field_definitions.org_id));

CREATE POLICY "custom_field_definitions_update" ON custom_field_definitions
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = custom_field_definitions.org_id));

CREATE POLICY "custom_field_definitions_delete" ON custom_field_definitions
  FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE org_id = custom_field_definitions.org_id));

-- custom_field_values table (no direct org_id; derive via custom_field_definitions)
-- ============================================================
DROP POLICY IF EXISTS "cfv_open_all" ON custom_field_values;

CREATE POLICY "custom_field_values_select" ON custom_field_values
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM custom_field_definitions
      WHERE id = custom_field_values.custom_field_definition_id
    )
  ));

CREATE POLICY "custom_field_values_insert" ON custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM custom_field_definitions
      WHERE id = custom_field_values.custom_field_definition_id
    )
  ));

CREATE POLICY "custom_field_values_update" ON custom_field_values
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM custom_field_definitions
      WHERE id = custom_field_values.custom_field_definition_id
    )
  ));

CREATE POLICY "custom_field_values_delete" ON custom_field_values
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM custom_field_definitions
      WHERE id = custom_field_values.custom_field_definition_id
    )
  ));

-- cotisations table (no direct org_id; derive via events.culte_id or members.membre_id)
-- ============================================================
DROP POLICY IF EXISTS "cotisations_open_all" ON public.cotisations;

CREATE POLICY "cotisations_select" ON public.cotisations
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = cotisations.culte_id
    )
  ));

CREATE POLICY "cotisations_insert" ON public.cotisations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = cotisations.culte_id
    )
  ));

CREATE POLICY "cotisations_update" ON public.cotisations
  FOR UPDATE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = cotisations.culte_id
    )
  ));

CREATE POLICY "cotisations_delete" ON public.cotisations
  FOR DELETE TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE org_id = (
      SELECT org_id FROM public.events WHERE id = cotisations.culte_id
    )
  ));
