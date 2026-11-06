-- Rollback de 20261104000003 — rétablit les deux chemins de notification
-- APPROVED tels qu'avant R-L (état B-07 : branche UPDATE sans garde de
-- transition + trigger `on_transaction_approved` dédié).

CREATE OR REPLACE FUNCTION public.notify_transaction_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_action  text;
  v_title   text;
  v_message text;
  v_org_id  text;
  v_tx_id   text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.org_id;
    v_tx_id  := OLD.id;
  ELSE
    v_org_id := NEW.org_id;
    v_tx_id  := NEW.id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_action := 'TRANSACTION_DELETED';
    v_title  := 'Transaction supprimée';
    v_message := 'Une transaction a été supprimée';
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'PENDING' THEN
    v_action := 'TRANSACTION_SUBMITTED';
    v_title  := 'Nouvelle transaction soumise';
    v_message := 'Une nouvelle transaction de ' || to_char(NEW.amount / 100, 'FM999G999G999G999') || ' FCFA attend votre approbation';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'APPROVED' THEN
    v_action := 'TRANSACTION_APPROVED';
    v_title  := 'Transaction approuvée';
    v_message := 'Votre transaction a été approuvée';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'REJECTED' THEN
    v_action := 'TRANSACTION_REJECTED';
    v_title  := 'Transaction rejetée';
    v_message := 'Votre transaction a été rejetée';
  ELSE
    v_action := 'TRANSACTION_UPDATED';
    v_title  := 'Transaction modifiée';
    v_message := 'Une transaction a été modifiée';
  END IF;

  INSERT INTO public.notifications (
    org_id, action_type, title, message, source_transaction_id, created_at
  ) VALUES (
    v_org_id, v_action, v_title, v_message, v_tx_id, now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Surface RPC (garde R115) : re-révoque la fonction redéfinie.
REVOKE EXECUTE ON FUNCTION public.notify_transaction_change() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.create_approved_transaction_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'TRANSACTION_APPROVED',
    'Transaction approuvée',
    'Votre transaction a été approuvée avec succès',
    false,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_transaction_approved ON public.transactions;
CREATE TRIGGER on_transaction_approved
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED')
  EXECUTE FUNCTION public.create_approved_transaction_notification();
