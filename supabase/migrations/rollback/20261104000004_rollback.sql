-- Rollback de 20261104000004 — retire les garde-fous financiers en base
-- (retour au contrôle strictement côté client, état d'avant R-K).

DROP TRIGGER IF EXISTS trg_transactions_financial_guards ON public.transactions;
DROP FUNCTION IF EXISTS public.enforce_transaction_financial_guards();
