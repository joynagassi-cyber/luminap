DO $$
BEGIN
  ALTER TABLE public.giving_donors ENABLE ROW LEVEL SECURITY;
  CREATE POLICY giving_donors_select ON public.giving_donors FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY giving_donors_insert ON public.giving_donors FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id));
  CREATE POLICY giving_donors_update ON public.giving_donors FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY giving_donors_delete ON public.giving_donors FOR DELETE TO authenticated USING (is_org_member(auth.uid(), org_id));

  ALTER TABLE public.giving_campaigns ENABLE ROW LEVEL SECURITY;
  CREATE POLICY giving_campaigns_select ON public.giving_campaigns FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY giving_campaigns_insert ON public.giving_campaigns FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id));
  CREATE POLICY giving_campaigns_update ON public.giving_campaigns FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY giving_campaigns_delete ON public.giving_campaigns FOR DELETE TO authenticated USING (is_org_member(auth.uid(), org_id));

  ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
  CREATE POLICY pledges_select ON public.pledges FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY pledges_insert ON public.pledges FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id));
  CREATE POLICY pledges_update ON public.pledges FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY pledges_delete ON public.pledges FOR DELETE TO authenticated USING (is_org_member(auth.uid(), org_id));

  ALTER TABLE public.tax_receipts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tax_receipts_select ON public.tax_receipts FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY tax_receipts_insert ON public.tax_receipts FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id));
  CREATE POLICY tax_receipts_update ON public.tax_receipts FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY tax_receipts_delete ON public.tax_receipts FOR DELETE TO authenticated USING (is_org_member(auth.uid(), org_id));

  ALTER TABLE public.transaction_giving ENABLE ROW LEVEL SECURITY;
  CREATE POLICY transaction_giving_select ON public.transaction_giving FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY transaction_giving_insert ON public.transaction_giving FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id));
  CREATE POLICY transaction_giving_update ON public.transaction_giving FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY transaction_giving_delete ON public.transaction_giving FOR DELETE TO authenticated USING (is_org_member(auth.uid(), org_id));

  CREATE INDEX IF NOT EXISTS idx_giving_donors_org ON public.giving_donors (org_id);
  CREATE INDEX IF NOT EXISTS idx_giving_donors_name ON public.giving_donors (org_id, full_name);
  CREATE INDEX IF NOT EXISTS idx_giving_campaigns_org ON public.giving_campaigns (org_id, status);
  CREATE INDEX IF NOT EXISTS idx_giving_campaigns_start ON public.giving_campaigns (org_id, start_date);
  CREATE INDEX IF NOT EXISTS idx_pledges_campaign ON public.pledges (campaign_id);
  CREATE INDEX IF NOT EXISTS idx_pledges_donor ON public.pledges (donor_id);
  CREATE INDEX IF NOT EXISTS idx_pledges_org ON public.pledges (org_id);
  CREATE INDEX IF NOT EXISTS idx_tax_receipts_donor ON public.tax_receipts (donor_id);
  CREATE INDEX IF NOT EXISTS idx_txn_giving_donor ON public.transaction_giving (donor_id);
  CREATE INDEX IF NOT EXISTS idx_txn_giving_campaign ON public.transaction_giving (campaign_id);
END
$$;