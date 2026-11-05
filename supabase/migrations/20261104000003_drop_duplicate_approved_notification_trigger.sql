-- ============================================================================
-- 20261104000003 — R-L : notification APPROVED en double
-- ----------------------------------------------------------------------------
-- DÉFAUT (prouvé en production, 2026-11-04)
--   Deux triggers AFTER sur `transactions` produisaient la notification
--   `TRANSACTION_APPROVED` lors d'une approbation :
--     * `on_transaction_change`  → notify_transaction_change()  (branche UPDATE
--       NEW.status='APPROVED') : message « Votre transaction a été approuvée » ;
--     * `on_transaction_approved` → create_approved_transaction_notification()
--       : message « Votre transaction a été approuvée avec succès ».
--   Preuve : 1090 notifications APPROVED pour 1037 transactions distinctes,
--   dont 3 transactions portant EXACTEMENT les deux messages (mêmes ids).
--   Même classe que R-I (deux triggers pour un seul fait métier).
--
--   Second défaut, même fonction : `notify_transaction_change` émettait
--   `TRANSACTION_APPROVED` sur TOUT UPDATE d'une transaction déjà approuvée
--   (pas seulement sur la TRANSITION vers APPROVED) — une simple réécriture
--   d'une transaction approuvée (via REST) créait une fausse notification
--   « approuvée ».
--
-- CORRECTIF
--   1. `notify_transaction_change` : la branche APPROVED exige désormais une
--      TRANSITION réelle (`OLD.status IS DISTINCT FROM 'APPROVED'`).
--   2. Suppression du chemin redondant (`on_transaction_approved` +
--      `create_approved_transaction_notification`) : `on_transaction_change`
--      reste le journal unique des notifications de transaction.
--
-- RÉVERSIBILITÉ : rollback/20261104000003_rollback.sql
-- ============================================================================

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
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM 'APPROVED' THEN
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

-- Chemin redondant : supprimé (le trigger d'abord, puis la fonction).
DROP TRIGGER IF EXISTS on_transaction_approved ON public.transactions;
DROP FUNCTION IF EXISTS public.create_approved_transaction_notification();
