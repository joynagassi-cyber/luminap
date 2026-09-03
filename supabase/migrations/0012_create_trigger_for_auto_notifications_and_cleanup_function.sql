-- Function to auto-insert notification when a transaction changes
CREATE OR REPLACE FUNCTION public.notify_transaction_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only notify for committed state changes (not DRAFT)
  IF NEW.status IN ('PENDING', 'APPROVED', 'REJECTED') THEN
    INSERT INTO public.notifications (org_id, action_type, title, message, source_transaction_id, created_at)
    VALUES (
      NEW.org_id,
      CASE
        WHEN TG_OP = 'INSERT' AND NEW.status = 'PENDING' THEN 'TRANSACTION_SUBMITTED'
        WHEN TG_OP = 'INSERT' AND NEW.status = 'DRAFT' THEN 'TRANSACTION_DRAFT'
        WHEN TG_OP = 'UPDATE' AND NEW.status = 'APPROVED' THEN 'TRANSACTION_APPROVED'
        WHEN TG_OP = 'UPDATE' AND NEW.status = 'REJECTED' THEN 'TRANSACTION_REJECTED'
        WHEN TG_OP = 'DELETE' THEN 'TRANSACTION_DELETED'
        ELSE 'TRANSACTION_UPDATED'
      END,
      CASE
        WHEN TG_OP = 'INSERT' AND NEW.status = 'PENDING' THEN 'Nouvelle transaction soumise'
        WHEN TG_OP = 'INSERT' AND NEW.status = 'DRAFT' THEN 'Brouillon créé'
        WHEN TG_OP = 'UPDATE' AND NEW.status = 'APPROVED' THEN 'Transaction approuvée'
        WHEN TG_OP = 'UPDATE' AND NEW.status = 'REJECTED' THEN 'Transaction rejetée'
        WHEN TG_OP = 'DELETE' THEN 'Transaction supprimée'
        ELSE 'Transaction modifiée'
      END,
      NEW.id,
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_transaction_change ON public.transactions;
CREATE TRIGGER on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_change();

-- Function to clean notifications older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;