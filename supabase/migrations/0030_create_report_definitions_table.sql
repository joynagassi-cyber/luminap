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