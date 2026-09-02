-- Drop old policies
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

-- Open policies (no auth required for data access)
CREATE POLICY "open_tx_select" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "open_tx_insert" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "open_tx_update" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "open_tx_delete" ON public.transactions FOR DELETE USING (true);

CREATE POLICY "open_cat_select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "open_cat_insert" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "open_cat_update" ON public.categories FOR UPDATE USING (true);

CREATE POLICY "open_ou_select" ON public.org_units FOR SELECT USING (true);
CREATE POLICY "open_ou_insert" ON public.org_units FOR INSERT WITH CHECK (true);
CREATE POLICY "open_ou_update" ON public.org_units FOR UPDATE USING (true);

CREATE POLICY "open_audit_select" ON public.audit_entries FOR SELECT USING (true);
CREATE POLICY "open_audit_insert" ON public.audit_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "open_profile_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "open_profile_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "open_profile_update" ON public.profiles FOR UPDATE USING (true);
