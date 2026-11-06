-- ============================================================================
-- 20261104000004 — R-K : garde-fous financiers portés EN BASE
-- ----------------------------------------------------------------------------
-- DÉFAUT (audit 2026-11-04)
--   Deux contrôles financiers n'existaient QUE côté client :
--     * maker-checker (PR8) : « l'auteur ne peut pas approuver sa propre
--       dépense » — règle PURE appelée dans `dataLayer` avant l'approbation ;
--     * gel de période (PR13) : `assertPeriodOpen` refuse toute écriture sur
--       une transaction datée ≤ `period_locked_until`.
--   Aucun trigger/contrainte en base ne les appliquait. Un client direct
--   (REST/PostgREST, donc aussi l'upload PowerSync) avec la permission
--   `transaction:update`/`create` pouvait donc AUTO-APPROUVER sa transaction
--   et ÉCRIRE dans une période clôturée en contournant l'application.
--
-- CORRECTIF — trigger BEFORE INSERT OR UPDATE sur `transactions`
--   1. GEL DE PÉRIODE : si `org_settings.period_locked_until` est défini pour
--      l'organisation et que `NEW.date <= date de clôture` → refus
--      (`RAISE … ERRCODE 'P0001'`, message `PERIOD_LOCKED`).
--   2. MAKER-CHECKER : sur la TRANSITION vers APPROVED (UPDATE PENDING→APPROVED,
--      exactement le chemin de `approveTransactionPS`), si le réglage
--      `maker_checker_enabled` est actif et que `approved_by_id = created_by_id`
--      → refus (`MAKER_CHECKER_SELF_APPROVAL`).
--      La transition est le SEUL point où le client applique la règle : on ne
--      bloque PAS l'INSERT auto-approuvé (revenus/caisse), pour ne pas casser
--      la saisie d'encaissement (comportement historique préservé).
--
-- SÉMANTIQUE (fail-open, alignée sur le client)
--   * Réglage ABSENT/vide/illisible ⇒ AUCUN blocage (aucune organisation n'a
--     activé ces options : `org_settings` est vide aujourd'hui).
--   * Le contrôle maker-checker ne s'applique que si un acteur authentifié
--     existe (`auth.uid() IS NOT NULL`) : le rôle de réplication PowerSync
--     (`powersync_*`, BYPASSRLS, sans JWT) n'est donc jamais bloqué.
--   * Le kill-switch de build (`featureFlags`) n'est pas visible en base : la
--     base applique le RÉGLAGE d'organisation ; le client continue d'appliquer
--     en plus le drapeau. Les deux couches sont donc cohérentes.
--
-- CODE D'ERREUR — pourquoi `23514` et PAS `P0001`
--   Le connecteur PowerSync (`pushCrudTransaction`) ne traite comme FATAL
--   (op JETÉE, `transaction.complete()`, file non bloquée) que les codes
--   `22xxx` / `23xxx` / `42501`. Un `RAISE … ERRCODE='P0001'` (convention du
--   dépôt, cf. `prevent_approved_transaction_delete`) tombe dans la branche
--   « retryable » → l'op est rejouée À L'INFINI, la file d'upload se bloque.
--   Ces gardes-ci sont DÉTERMINISTES (elles dépendent d'un réglage), donc on
--   choisit un code de la classe 23 (`23514` check_violation) : sémantiquement
--   « la ligne viole une contrainte d'intégrité financière », et le client
--   JETTE l'op en la signalant (`recordRejectedSyncOp` + `reportError`) au lieu
--   de boucler. Un appel REST direct reçoit un 400 explicite.
--
-- RÉVERSIBILITÉ : rollback/20261104000004_rollback.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_transaction_financial_guards()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_locked    text;
  v_setting   text;
  v_locked_on date;
  v_enabled   boolean := false;
BEGIN
  -- ── 1) Gel de période comptable ──────────────────────────────────────────
  SELECT s.value INTO v_locked
  FROM public.org_settings s
  WHERE s.org_id = NEW.org_id AND s.key = 'period_locked_until';

  IF v_locked IS NOT NULL AND trim(v_locked) <> '' THEN
    BEGIN
      -- `value` est un JSON sérialisé (ex. "2026-10-31") : on retire les
      -- guillemets éventuels puis on caste en date.
      v_locked_on := (trim(both '"' from v_locked))::date;
    EXCEPTION WHEN others THEN
      v_locked_on := NULL;  -- valeur illisible ⇒ fail-open (rien n'est gelé)
    END;
    IF v_locked_on IS NOT NULL AND NEW.date <= v_locked_on THEN
      RAISE EXCEPTION 'PERIOD_LOCKED'
        USING ERRCODE = '23514',
              HINT = 'La période comptable est clôturée jusqu''au '
                     || to_char(v_locked_on, 'DD/MM/YYYY') || ' inclus.';
    END IF;
  END IF;

  -- ── 2) Maker-checker (anti auto-approbation) ─────────────────────────────
  -- Uniquement sur la transition réelle vers APPROVED et pour un acteur
  -- authentifié (jamais le rôle de réplication PowerSync).
  IF v_uid IS NOT NULL
     AND TG_OP = 'UPDATE'
     AND NEW.status = 'APPROVED'
     AND OLD.status IS DISTINCT FROM 'APPROVED'
     AND NEW.approved_by_id IS NOT NULL
     AND NEW.approved_by_id = NEW.created_by_id
  THEN
    SELECT s.value INTO v_setting
    FROM public.org_settings s
    WHERE s.org_id = NEW.org_id AND s.key = 'maker_checker_enabled';
    IF v_setting IS NOT NULL AND trim(v_setting) <> '' THEN
      BEGIN
        v_enabled := (trim(both '"' from v_setting))::boolean;
      EXCEPTION WHEN others THEN
        v_enabled := false;  -- valeur illisible ⇒ fail-open
      END;
    END IF;
    IF v_enabled THEN
      RAISE EXCEPTION 'MAKER_CHECKER_SELF_APPROVAL'
        USING ERRCODE = '23514',
              HINT = 'L''auteur ne peut pas approuver sa propre dépense.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ferme l'accès direct à la fonction (comme les autres fonctions trigger du
-- dépôt : EXECUTE n'est pas requis pour le déclenchement).
REVOKE ALL ON FUNCTION public.enforce_transaction_financial_guards() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_transaction_financial_guards() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_transaction_financial_guards() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_transaction_financial_guards() TO service_role;

DROP TRIGGER IF EXISTS trg_transactions_financial_guards ON public.transactions;
CREATE TRIGGER trg_transactions_financial_guards
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_transaction_financial_guards();
