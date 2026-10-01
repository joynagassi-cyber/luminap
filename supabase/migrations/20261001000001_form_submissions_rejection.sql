-- Formulaires V2 : trace du rejet d'une soumission (qui + pourquoi).
ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
