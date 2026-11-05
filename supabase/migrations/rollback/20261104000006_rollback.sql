-- Rollback 20261104000006 : restaurer auth.uid() (état R-H).
ALTER POLICY notifications_update ON public.notifications
  USING (is_org_member(auth.uid(), org_id))
  WITH CHECK (is_org_member(auth.uid(), org_id));
