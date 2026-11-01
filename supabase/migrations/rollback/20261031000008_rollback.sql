-- Rollback de 20261031000008 — supprime la table transaction_attachments (PR9).

DROP TABLE IF EXISTS public.transaction_attachments;
