-- ============================================================================
-- 20261104000007 — R164 : immuabilité d'une transaction APPROVED à l'UPDATE
-- ----------------------------------------------------------------------------
-- CLASSE DE DÉFAUT (même que R102, mais pour l'UPDATE)
--   La règle « une transaction APPROVED est immuable » n'était appliquée que :
--     • côté CLIENT — `updateTransactionPS` lève `TRANSACTION_APPROVED_IMMUTABLE`
--       si `tx.status === 'APPROVED'` (sauf transition vers APPROVED) ;
--     • en base — UNIQUEMENT pour le DELETE (`prevent_approved_transaction_delete`,
--       migration 20261026000004, R102).
--   Or un appelant DIRECT PostgREST (REST/SDK) avec un JWT utilisateur valide
--   et la permission `transaction:update` saute la logique TS (la RLS s'applique
--   mais la policy UPDATE n'exige pas de statut) ; et une clé `service_role`
--   (BYPASSRLS) contourne aussi la RLS (cf. R169, modèle de menace corrigé).
--   Un `UPDATE transactions SET amount = <n>, status = 'PENDING' WHERE id =
--   <tx APPROVED>` modifiait donc une pièce approuvée (montant/date/catégorie)
--   — voire la rouvrait — sans garde-fou serveur : altération silencieuse.
--
-- CORRECTIF
--   Trigger BEFORE UPDATE sur `transactions` : toute modification d'une ligne
--   dont `OLD.status = 'APPROVED'` est refusée (montant, date, catégorie,
--   statut…). La TRANSITION VERS APPROVED (OLD.status <> 'APPROVED') reste
--   permise — c'est le flux d'approbation. Aucun flux légitime ne réécrit une
--   ligne déjà APPROVED (contrepassation = NOUVELLE ligne).
--
-- CODE D'ERREUR : 23514 (check_violation, classe 23) et NON P0001 — le
--   connecteur PowerSync ne JETTE (discard) que les classes 22xxx/23xxx et
--   42501 ; un P0001 tomberait en retry infini et bloquerait la file d'upload
--   (cf. SupabaseConnector.FATAL_RESPONSE_CODES).
--
-- CASCADE FK : `transactions_cotisation_id_fkey` est `ON DELETE SET NULL` mais
--   AUCUNE suppression de cotisation n'existe côté produit (vérifié) ; les FK
--   `category_id`/`org_unit_id` n'ont pas d'ON DELETE (RESTRICT) → pas de
--   cascade UPDATE inattendue sur une pièce approuvée.
--
-- SÉMANTIQUE : la contrepassation (`reverseTransactionPS`) crée une NOUVELLE
--   transaction (PENDING, `reversal_of_id` renseigné à l'INSERT) ; elle ne
--   modifie jamais l'originale. La correction ne casse donc aucun flux légitime.
--
-- RÉVERSIBILITÉ : rollback/20261104000007_rollback.sql (DROP du trigger).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_approved_transaction_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Toute modification d'une pièce déjà approuvée est refusée (montant, date,
  -- catégorie, statut…). La transition VERS APPROVED (OLD.status <> 'APPROVED')
  -- n'est pas concernée : c'est le flux d'approbation.
  IF OLD.status = 'APPROVED' THEN
    RAISE EXCEPTION 'TRANSACTION_APPROVED_IMMUTABLE'
      USING ERRCODE = '23514',
            HINT = 'Une transaction approuvée est immuable ; utilisez la contrepassation.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_approved_transaction_update ON public.transactions;
CREATE TRIGGER guard_approved_transaction_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_approved_transaction_update();

-- R115 : une fonction de trigger SECURITY DEFINER ne doit PAS rester exécutable
-- par anon/authenticated (surface RPC). On révoque explicitement après le CREATE.
REVOKE ALL ON FUNCTION public.guard_approved_transaction_update() FROM PUBLIC, anon, authenticated;
