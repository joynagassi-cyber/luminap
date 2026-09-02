
-- 5. Audit entries table
CREATE TABLE public.audit_entries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  transaction_id TEXT NOT NULL REFERENCES public.transactions(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'transaction',
  entity_id TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT ON TABLE public.audit_entries TO service_role;
GRANT SELECT ON TABLE public.audit_entries TO authenticated;
ALTER TABLE public.audit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_entries_select" ON public.audit_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_entries_insert" ON public.audit_entries FOR INSERT TO authenticated WITH CHECK (true);
