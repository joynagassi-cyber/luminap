-- RLS Policies for Lumina Platform
-- Generated during Sprint 13 Hardening

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE versements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;

-- Members policies
CREATE POLICY "Members: authenticated users can read own org members"
  ON members FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

CREATE POLICY "Members: authenticated users can insert own org members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Members: authenticated users can update own org members"
  ON members FOR UPDATE
  TO authenticated
  USING (org_id = get_organization_id())
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Members: authenticated users can delete own org members"
  ON members FOR DELETE
  TO authenticated
  USING (org_id = get_organization_id());

-- Groups policies
CREATE POLICY "Groups: authenticated users can read own org groups"
  ON groups FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

CREATE POLICY "Groups: authenticated users can insert own org groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Groups: authenticated users can update own org groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (org_id = get_organization_id())
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Groups: authenticated users can delete own org groups"
  ON groups FOR DELETE
  TO authenticated
  USING (org_id = get_organization_id());

-- Transactions policies
CREATE POLICY "Transactions: authenticated users can read own org transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

CREATE POLICY "Transactions: authenticated users can insert own org transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Transactions: authenticated users can update own org transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (org_id = get_organization_id())
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Transactions: authenticated users can delete own org transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (org_id = get_organization_id());

-- Accounts policies
CREATE POLICY "Accounts: authenticated users can read own org accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

CREATE POLICY "Accounts: authenticated users can insert own org accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Accounts: authenticated users can update own org accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (org_id = get_organization_id())
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Accounts: authenticated users can delete own org accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (org_id = get_organization_id());

-- Events policies
CREATE POLICY "Events: authenticated users can read own org events"
  ON events FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

CREATE POLICY "Events: authenticated users can insert own org events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Events: authenticated users can update own org events"
  ON events FOR UPDATE
  TO authenticated
  USING (org_id = get_organization_id())
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Events: authenticated users can delete own org events"
  ON events FOR DELETE
  TO authenticated
  USING (org_id = get_organization_id());

-- Cotisations policies
CREATE POLICY "Cotisations: authenticated users can read own org cotisations"
  ON cotisations FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

CREATE POLICY "Cotisations: authenticated users can insert own org cotisations"
  ON cotisations FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Cotisations: authenticated users can update own org cotisations"
  ON cotisations FOR UPDATE
  TO authenticated
  USING (org_id = get_organization_id())
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Cotisations: authenticated users can delete own org cotisations"
  ON cotisations FOR DELETE
  TO authenticated
  USING (org_id = get_organization_id());

-- Versements policies
CREATE POLICY "Versements: authenticated users can read own org versements"
  ON versements FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

CREATE POLICY "Versements: authenticated users can insert own org versements"
  ON versements FOR INSERT
  TO authenticated
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Versements: authenticated users can update own org versements"
  ON versements FOR UPDATE
  TO authenticated
  USING (org_id = get_organization_id())
  WITH CHECK (org_id = get_organization_id());

CREATE POLICY "Versements: authenticated users can delete own org versements"
  ON versements FOR DELETE
  TO authenticated
  USING (org_id = get_organization_id());

-- Audit entries policies (read-only for authenticated users)
CREATE POLICY "Audit: authenticated users can read audit entries"
  ON audit_entries FOR SELECT
  TO authenticated
  USING (org_id = get_organization_id());

-- Helper function to get current org ID from JWT claim
CREATE OR REPLACE FUNCTION get_organization_id()
RETURNS text AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.org_id', true), ''),
    (auth.jwt()->>'org_id')::text,
    'org-1'
  );
$$ LANGUAGE SQL STABLE;
