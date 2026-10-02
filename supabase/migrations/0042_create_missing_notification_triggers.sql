-- Migration 0042: Notification triggers for invitations, events, forms, and budget
--
-- Closes the gaps identified in the OneSignal audit:
--   INVITATION_RECEIVED  — new invitation row lands in the org
--   INVITATION_CLAIMED   — a claim was settled (CONFIRMED)
--   EVENT_CREATED        — a new event was added to the org
--   FORM_SUBMITTED       — a form submission arrived for the org
--   BUDGET_EXCEEDED      — an event budget was created and overruns its total
--
-- All functions use NEW.org_id (no hardcoded org) and are idempotent.

-- ============================================================
-- INVITATION_RECEIVED
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_invitation_received()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'INVITATION_RECEIVED',
    'Nouvelle invitation',
    'Une invitation ' || NEW.code || ' pour le rôle ' || NEW.target_role || ' a été émise',
    0,
    NEW.id::text,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_invitation_received ON public.invitations;
CREATE TRIGGER on_invitation_received
  AFTER INSERT ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invitation_received();

-- ============================================================
-- INVITATION_CLAIMED
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_invitation_claimed()
RETURNS TRIGGER AS $$
DECLARE
  inv_org TEXT;
  inv_code TEXT;
BEGIN
  SELECT org_id, code INTO inv_org, inv_code
    FROM public.invitations WHERE id = NEW.invitation_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    inv_org,
    'INVITATION_CLAIMED',
    'Invitation acceptée',
    'L''invitation ' || inv_code || ' a été acceptée (' || NEW.status || ')',
    0,
    NEW.id::text,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_invitation_claimed ON public.invitation_claims;
CREATE TRIGGER on_invitation_claimed
  AFTER INSERT ON public.invitation_claims
  FOR EACH ROW
  WHEN (NEW.status = 'CONFIRMED')
  EXECUTE FUNCTION public.notify_invitation_claimed();

-- ============================================================
-- EVENT_CREATED
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_event_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'EVENT_CREATED',
    'Nouvel événement',
    '« ' || NEW.name || ' » a été planifié le ' || NEW.start_date,
    0,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_event_created ON public.events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_created();

-- ============================================================
-- FORM_SUBMITTED
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_form_submitted()
RETURNS TRIGGER AS $$
DECLARE
  form_name TEXT;
BEGIN
  SELECT name INTO form_name
    FROM public.form_definitions WHERE id = NEW.form_definition_id;
  IF NOT FOUND THEN
    form_name := 'Formulaire inconnu';
  END IF;

  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'FORM_SUBMITTED',
    'Nouvelle soumission de formulaire',
    '« ' || form_name || ' » a été soumis par ' || NEW.submitted_by,
    0,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_form_submitted ON public.form_submissions;
CREATE TRIGGER on_form_submitted
  AFTER INSERT ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_form_submitted();

-- ============================================================
-- BUDGET_EXCEEDED
-- Fires when a budget line insert pushes the total past the event's limit.
-- budget_lines: event_budget_id, planned_amount_cents, actual_amount_cents.
-- events.budget is the total cap.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_budget_exceeded()
RETURNS TRIGGER AS $$
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
      0,
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_budget_line_exceeds ON public.budget_lines;
CREATE TRIGGER on_budget_line_exceeds
  AFTER INSERT ON public.budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_budget_exceeded();
