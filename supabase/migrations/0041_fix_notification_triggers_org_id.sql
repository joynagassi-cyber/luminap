-- Migration 0041: Fix hardcoded org_id in notification triggers (0040)
--
-- Rationale: 0040 hardcoded 'org-1' for the transaction notification
-- triggers, so notifications were only written for that org. Replace
-- with NEW.org_id so all organizations are covered.

CREATE OR REPLACE FUNCTION public.create_pending_transaction_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    org_id,
    action_type,
    title,
    message,
    is_read,
    source_transaction_id,
    created_at
  ) VALUES (
    NEW.org_id,
    'TRANSACTION_PENDING',
    'Nouvelle transaction en attente',
    'Une nouvelle transaction de ' || NEW.amount || ' FCFA attend votre approbation',
    0,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_approved_transaction_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    org_id,
    action_type,
    title,
    message,
    is_read,
    source_transaction_id,
    created_at
  ) VALUES (
    NEW.org_id,
    'TRANSACTION_APPROVED',
    'Transaction approuvée',
    'Votre transaction a été approuvée avec succès',
    0,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach triggers (they keep the same names; DROP IF EXISTS + CREATE is idempotent)
DROP TRIGGER IF EXISTS on_transaction_pending ON public.transactions;
CREATE TRIGGER on_transaction_pending
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'PENDING')
  EXECUTE FUNCTION public.create_pending_transaction_notification();

DROP TRIGGER IF EXISTS on_transaction_approved ON public.transactions;
CREATE TRIGGER on_transaction_approved
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND OLD.status != 'APPROVED')
  EXECUTE FUNCTION public.create_approved_transaction_notification();
