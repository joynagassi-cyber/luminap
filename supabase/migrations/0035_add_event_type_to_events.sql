-- Migration 0035: Ajouter un type aux événements pour distinguer Cultes

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'EVENT'
  CHECK (type IN ('EVENT', 'CULTE'));

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
