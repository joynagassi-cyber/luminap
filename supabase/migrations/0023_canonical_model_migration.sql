-- Phase 2 Migration: AuditLog enrichment + new entities
-- Date: 2025-01-XX

-- === AUDIT ENRICHED ===
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS before_state JSONB;
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS after_state JSONB;
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS actor_role_at_time TEXT;
ALTER TABLE audit_entries ALTER COLUMN transaction_id DROP NOT NULL;

-- === TRANSACTIONS: add reversalOfId ===
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversal_of_id TEXT REFERENCES transactions(id);
CREATE INDEX IF NOT EXISTS idx_transactions_reversal_of_id ON transactions(reversal_of_id);

-- === MEMBERS TABLE ===
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by TEXT,
  archive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE members TO authenticated;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_open_all" ON members FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- === GROUPS TABLE (replaces org_units for canonical model) ===
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  name TEXT NOT NULL,
  parent_group_id TEXT REFERENCES groups(id),
  responsable_member_id TEXT REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by TEXT,
  archive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE groups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE groups TO authenticated;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_open_all" ON groups FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_groups_org_id ON groups(org_id);
CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_group_id);

-- === ACCOUNTS TABLE (replaces caisses with canonical model) ===
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  owner_type TEXT NOT NULL CHECK (owner_type IN ('ORGANIZATION', 'GROUP')),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by TEXT,
  archive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE accounts TO authenticated;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_open_all" ON accounts FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_accounts_org_id ON accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_type, owner_id);

-- === GROUP_MEMBERSHIPS TABLE ===
CREATE TABLE IF NOT EXISTS group_memberships (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  group_id TEXT NOT NULL REFERENCES groups(id),
  role_in_group TEXT NOT NULL DEFAULT 'MEMBRE' CHECK (role_in_group IN ('MEMBRE', 'RESPONSABLE')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE group_memberships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE group_memberships TO authenticated;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm_open_all" ON group_memberships FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_gm_member ON group_memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_gm_group ON group_memberships(group_id);

-- === VERSEMENTS TABLE ===
CREATE TABLE IF NOT EXISTS versements (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  from_account_id TEXT NOT NULL REFERENCES accounts(id),
  to_account_id TEXT NOT NULL REFERENCES accounts(id),
  amount_cents BIGINT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE versements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE versements TO authenticated;
ALTER TABLE versements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versements_open_all" ON versements FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_versements_org_id ON versements(org_id);
CREATE INDEX IF NOT EXISTS idx_versements_from ON versements(from_account_id);
CREATE INDEX IF NOT EXISTS idx_versements_to ON versements(to_account_id);
CREATE INDEX IF NOT EXISTS idx_versements_status ON versements(status);

-- === EVENT_BUDGETS TABLE ===
CREATE TABLE IF NOT EXISTS event_budgets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'XOF',
  revised_at TIMESTAMP WITH TIME ZONE,
  revised_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE event_budgets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE event_budgets TO authenticated;
ALTER TABLE event_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eb_open_all" ON event_budgets FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- === BUDGET_LINES TABLE ===
CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  event_budget_id TEXT NOT NULL REFERENCES event_budgets(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  planned_amount_cents BIGINT NOT NULL,
  actual_amount_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE budget_lines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE budget_lines TO authenticated;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bl_open_all" ON budget_lines FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_bl_budget ON budget_lines(event_budget_id);
CREATE INDEX IF NOT EXISTS idx_bl_category ON budget_lines(category_id);

-- === REPORT_DEFINITIONS TABLE ===
CREATE TABLE IF NOT EXISTS report_definitions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  name TEXT NOT NULL,
  data_source TEXT NOT NULL,
  dimensions TEXT[] NOT NULL DEFAULT '{}',
  metrics TEXT[] NOT NULL DEFAULT '{}',
  filters JSONB NOT NULL DEFAULT '[]',
  group_by TEXT[] NOT NULL DEFAULT '{}',
  sort_by TEXT,
  saved_by TEXT,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE report_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE report_definitions TO authenticated;
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rd_open_all" ON report_definitions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- === FORM_DEFINITIONS TABLE ===
CREATE TABLE IF NOT EXISTS form_definitions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  target_entity_type TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE form_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE form_definitions TO authenticated;
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fd_open_all" ON form_definitions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- === FORM_SUBMISSIONS TABLE ===
CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  form_definition_id TEXT NOT NULL REFERENCES form_definitions(id),
  form_version INTEGER NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  linked_entity_type TEXT,
  linked_entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'PROCESSED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE form_submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE form_submissions TO authenticated;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fs_open_all" ON form_submissions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_fs_form ON form_submissions(form_definition_id);
CREATE INDEX IF NOT EXISTS idx_fs_entity ON form_submissions(linked_entity_type, linked_entity_id);

-- === CUSTOM_FIELD_DEFINITIONS TABLE ===
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  entity_type TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'select', 'boolean')),
  options TEXT[],
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE custom_field_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE custom_field_definitions TO authenticated;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfd_open_all" ON custom_field_definitions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- === CUSTOM_FIELD_VALUES TABLE ===
CREATE TABLE IF NOT EXISTS custom_field_values (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  custom_field_definition_id TEXT NOT NULL REFERENCES custom_field_definitions(id),
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE custom_field_values TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE custom_field_values TO authenticated;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfv_open_all" ON custom_field_values FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_cfv_entity ON custom_field_values(entity_type, entity_id);
