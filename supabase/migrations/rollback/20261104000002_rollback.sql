-- Rollback de 20261104000002 — rétablit la policy et le privilège d'origine.

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (is_org_member(auth.uid(), org_id) AND has_permission(auth.uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(auth.uid(), org_id) AND has_permission(auth.uid(), org_id, 'admin', 'settings'));

GRANT UPDATE ON public.notifications TO authenticated;
