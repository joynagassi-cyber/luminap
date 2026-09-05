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