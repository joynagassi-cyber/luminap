-- ============================================================================
-- 20261027000002 — fix: `notify_budget_exceeded` référence des colonnes
-- inexistantes sur `budget_lines` (défaut hérité de 0042)
-- ----------------------------------------------------------------------------
-- DÉFAUT (impact 5 — toute création de ligne budgétaire échoue)
--   `public.notify_budget_exceeded()` (migration 0042, revue en 20261022000003
--   pour le booléen `is_read`) lit `NEW.event_id`, colonne qui N'EXISTE PAS sur
--   `public.budget_lines` (dont la FK est `event_budget_id`, cf. 0031).
--   Elle agrège aussi sur `event_budget_id = NEW.id AND id <> NEW.id`, ce qui
--   compare la FK de la ligne à son propre id : agrégat toujours vide.
--
--   PREUVE (reproduit sur la base, transaction annulée) :
--     insert into public.budget_lines (...) returning org_id;
--     → ERROR 42703: record "new" has no field "event_id"
--       CONTEXT: ... WHERE e.id = NEW.event_id
--   Le trigger est AFTER INSERT : la ligne est écrite puis la transaction
--   annulée → l'utilisateur ne peut créer AUCUNE ligne budgétaire.
--
-- CORRECTIF
--   1. résoudre l'événement via `event_budgets` : eb.id = NEW.event_budget_id
--   2. agréger les autres lignes du MÊME budget : event_budget_id = NEW.event_budget_id
--   3. message : inclure `total_cents` dans le dépassement affiché.
--
-- RÉVERSIBILITÉ : rollback/20261027000002_rollback.sql (restaure la version
--   buguée de 20261022000003).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_budget_exceeded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  ev_budget BIGINT;
  ev_org TEXT;
  ev_name TEXT;
  total_cents BIGINT;
BEGIN
  SELECT e.budget, e.org_id, e.name INTO ev_budget, ev_org, ev_name
    FROM public.event_budgets eb
    JOIN public.events e ON e.id = eb.event_id
    WHERE eb.id = NEW.event_budget_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(planned_amount_cents + actual_amount_cents), 0)
    INTO total_cents
    FROM public.budget_lines
    WHERE event_budget_id = NEW.event_budget_id AND id <> NEW.id;

  IF total_cents + (NEW.planned_amount_cents + NEW.actual_amount_cents) > ev_budget THEN
    INSERT INTO public.notifications (
      org_id, action_type, title, message, is_read, source_transaction_id, created_at
    ) VALUES (
      ev_org,
      'BUDGET_EXCEEDED',
      'Dépassement de budget',
      'L''événement « ' || ev_name || ' » dépasse son budget de '
        || (total_cents + NEW.planned_amount_cents + NEW.actual_amount_cents - ev_budget) || ' FCFA',
      false,
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$function$;
