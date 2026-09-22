-- Lot F.2b : index composite pour les rapports d'audit (groupBy + tri temporel).
-- Remplace en pratique l'orphan idx_audit_entries_actor (cassé, cf. état des lieux).
CREATE INDEX IF NOT EXISTS idx_audit_entries_entity_created
  ON public.audit_entries (entity_type, created_at DESC);
