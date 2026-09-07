-- Migration 0038: Ajouter cotisation_id aux transactions

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cotisation_id TEXT
  REFERENCES public.cotisations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_cotisation ON public.transactions(cotisation_id);
