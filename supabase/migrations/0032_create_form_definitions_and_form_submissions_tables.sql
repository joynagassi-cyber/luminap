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