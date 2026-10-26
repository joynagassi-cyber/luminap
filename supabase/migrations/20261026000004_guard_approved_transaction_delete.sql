-- R102 — Suppression dure d'une transaction APPROVED possible en base.
--
-- Constat (prouvé sur l'instance dev, transaction annulée) :
--   * La policy RLS `transactions_delete` est `is_org_member(uid, org_id)` :
--     TOUT membre de l'organisation (rôle MEMBRE inclus) peut supprimer
--     n'importe quelle transaction, y compris APPROVED.
--   * Le garde-fou « APPROVED = immuable » n'existait QUE côté client
--     (`deleteTransactionPS` lève `TRANSACTION_APPROVED_IMMUTABLE`). Or
--     PowerSync écrit en service role (RLS contournée) et l'API REST
--     n'applique pas la logique TS : le garde-fou client n'est pas une
--     frontière de sécurité.
--   * Preuve : un profil de rôle MEMBRE a supprimé une transaction APPROVED
--     (count restant = 0).
--   * La contrepassation (`reversal_of_id`) est le mécanisme sanctionné
--     (l'original reste, une écriture inverse est créée) ; la suppression
--     dure ne doit pas être possible sur une pièce approuvée.
--
-- Correctif : trigger BEFORE DELETE qui refuse la suppression d'une
-- transaction APPROVED, quel que soit le rôle (défense en base, indépendante
-- du client et de PowerSync). Les transactions DRAFT/PENDING/REJECTED restent
-- supprimables (parité avec `deleteTransactionPS`).
CREATE OR REPLACE FUNCTION public.prevent_approved_transaction_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF OLD.status = 'APPROVED' THEN
    RAISE EXCEPTION 'TRANSACTION_APPROVED_IMMUTABLE' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_approved_transaction_delete ON public.transactions;
CREATE TRIGGER prevent_approved_transaction_delete
  BEFORE DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_transaction_delete();
