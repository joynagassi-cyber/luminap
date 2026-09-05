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