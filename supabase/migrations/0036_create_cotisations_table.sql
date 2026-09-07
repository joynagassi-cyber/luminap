-- Migration 0036: Créer la table cotisations

CREATE TABLE IF NOT EXISTS public.cotisations (
  id TEXT PRIMARY KEY,
  culte_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  membre_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'NON_PAYE'
    CHECK (statut IN ('NON_PAYE', 'PAYE', 'ABSENT', 'EN_AVANCE')),
  montantObligatoire BIGINT NOT NULL DEFAULT 5000,
  montantPaye BIGINT NOT NULL DEFAULT 0,
  datePaiement TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotisations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.cotisations TO authenticated;
ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotisations_open_all" ON public.cotisations
  FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_cotisations_culte ON public.cotisations(culte_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_membre ON public.cotisations(membre_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_statut ON public.cotisations(statut);
