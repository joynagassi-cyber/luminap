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