-- Migration 0040: Create notification triggers and functions

-- Function to create notification for pending transaction
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
    'org-1',
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

-- Trigger on transactions table
DROP TRIGGER IF EXISTS on_transaction_pending ON public.transactions;
CREATE TRIGGER on_transaction_pending
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'PENDING')
  EXECUTE FUNCTION public.create_pending_transaction_notification();

-- Function to create notification for approved transaction
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
    'org-1',
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

-- Trigger on transactions table for approval
DROP TRIGGER IF EXISTS on_transaction_approved ON public.transactions;
CREATE TRIGGER on_transaction_approved
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND OLD.status != 'APPROVED')
  EXECUTE FUNCTION public.create_approved_transaction_notification();
