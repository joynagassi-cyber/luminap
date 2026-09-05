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