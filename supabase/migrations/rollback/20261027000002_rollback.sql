-- ============================================================================
-- Rollback 20261027000002 — restaure la version (buguée) de 20261022000003
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
    FROM public.events e
    WHERE e.id = NEW.event_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(planned_amount_cents + actual_amount_cents), 0)
    INTO total_cents
    FROM public.budget_lines
    WHERE event_budget_id = NEW.id AND id <> NEW.id;

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
