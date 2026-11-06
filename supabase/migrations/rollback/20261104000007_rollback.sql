-- Rollback R164 — retire la garde d'immuabilité APPROVED à l'UPDATE.
DROP TRIGGER IF EXISTS guard_approved_transaction_update ON public.transactions;
DROP FUNCTION IF EXISTS public.guard_approved_transaction_update();
