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