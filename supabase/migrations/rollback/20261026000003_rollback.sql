-- Rollback de 20261026000003 — restaure la définition d'origine de
-- `notify_transaction_change()` telle qu'introduite par 0012.
--
-- ATTENTION : cette définition d'origine est CASSÉE (R101) — elle liste 6
-- colonnes mais ne fournit que 5 valeurs, ce qui fait échouer toute écriture
-- de transaction PENDING/APPROVED/REJECTED en 42601. Le rollback n'est fourni
-- que pour la symétrie migration↔rollback ; ne l'appliquer que si le correctif
-- doit être retiré en connaissance de cause.
CREATE OR REPLACE FUNCTION public.notify_transaction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
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
$function$;
