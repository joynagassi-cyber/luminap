-- Rollback de 20261026000004 — retire le garde-fou d'immuabilité.
DROP TRIGGER IF EXISTS prevent_approved_transaction_delete ON public.transactions;
DROP FUNCTION IF EXISTS public.prevent_approved_transaction_delete();
