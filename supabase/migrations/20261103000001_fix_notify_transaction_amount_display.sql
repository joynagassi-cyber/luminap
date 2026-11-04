-- B-07 — Les notifications de transaction affichaient le montant BRUT.
--
-- `transactions.amount` est stocké en CENTIMES (bigint) ; la fonction
-- trigger `notify_transaction_change` concaténait `NEW.amount`
-- directement dans le message (« Une nouvelle transaction de 5000000
-- FCFA… » pour 50 000 FCFA). On divise par 100 et on formate avec des
-- séparateurs de milliers.
--
-- Appliquée en production le 2026-11-03 via l'API de migration
-- Supabase (projet hhgovvrnalibhgpakswi, migration
-- « fix_notify_transaction_amount_display ») ; ce fichier est le
-- miroir versionné, idempotent (CREATE OR REPLACE).

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
    -- B-07 : `amount` est stocké en CENTIMES (bigint). L'ancienne version
    -- concaténait la valeur brute → les notifications affichaient un
    -- montant 100× trop grand (« 5000000 FCFA » pour 50 000 FCFA).
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

-- Surface RPC (garde R115) : une fonction de trigger SECURITY DEFINER
-- redéfinie doit ré-énoncer sa révocation, sinon un rejeu complet des
-- migrations la ré-exposerait après les balayages de 20261026/20261028.
REVOKE EXECUTE ON FUNCTION public.notify_transaction_change() FROM PUBLIC;
