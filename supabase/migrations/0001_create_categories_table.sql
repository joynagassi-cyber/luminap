
-- 2. Categories table
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  org_id TEXT NOT NULL DEFAULT 'org-1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated USING (true);
