
-- 3. Org units table
CREATE TABLE public.org_units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'groupe',
  org_id TEXT NOT NULL DEFAULT 'org-1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.org_units TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.org_units TO authenticated;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_units_select" ON public.org_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_units_insert" ON public.org_units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_units_update" ON public.org_units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "org_units_delete" ON public.org_units FOR DELETE TO authenticated USING (true);
