
-- 4. Transactions table
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'org-1',
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount BIGINT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  org_unit_id TEXT REFERENCES public.org_units(id),
  compensates_for TEXT REFERENCES public.transactions(id),
  comment TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by_id UUID REFERENCES auth.users(id),
  approved_by_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE TO authenticated USING (true);
