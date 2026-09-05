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