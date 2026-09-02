
-- Enable Row Level Security on all tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke existing policies to start clean
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;

DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;

DROP POLICY IF EXISTS "org_units_select" ON public.org_units;
DROP POLICY IF EXISTS "org_units_insert" ON public.org_units;
DROP POLICY IF EXISTS "org_units_update" ON public.org_units;

DROP POLICY IF EXISTS "audit_entries_select" ON public.audit_entries;
DROP POLICY IF EXISTS "audit_entries_insert" ON public.audit_entries;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Transactions policies
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE TO authenticated USING (true);

-- Categories policies
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Org units policies
CREATE POLICY "org_units_select" ON public.org_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_units_insert" ON public.org_units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_units_update" ON public.org_units FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Audit entries policies
CREATE POLICY "audit_entries_select" ON public.audit_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_entries_insert" ON public.audit_entries FOR INSERT TO authenticated WITH CHECK (true);

-- Profiles policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Enable realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
