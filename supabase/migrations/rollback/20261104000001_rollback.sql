-- Rollback de 20261104000001 — recrée le trigger/fonction PENDING supprimés.
-- Le montant est corrigé (/100 + to_char) au passage : si l'on restaure le
-- chemin, il ne doit pas réintroduire le bug B-07 (montant ×100).

CREATE OR REPLACE FUNCTION public.create_pending_transaction_notification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'TRANSACTION_PENDING',
    'Nouvelle transaction en attente',
    'Une nouvelle transaction de ' || to_char(NEW.amount / 100, 'FM999G999G999G999') || ' FCFA attend votre approbation',
    false,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_transaction_pending ON public.transactions;
CREATE TRIGGER on_transaction_pending
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'PENDING')
  EXECUTE FUNCTION public.create_pending_transaction_notification();
