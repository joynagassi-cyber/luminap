-- ============================================================================
-- ROLLBACK de 20261022000003_fix_notification_triggers_is_read_boolean.sql
-- ----------------------------------------------------------------------------
-- Restaure l'état EXACT d'avant la migration : les 7 triggers de notification
-- réinsèrent le littéral entier `0` dans `notifications.is_read` (BOOLEAN).
--
-- ⚠️  ATTENTION : cet état est BUGUÉ. Avec lui, tout INSERT sur invitations,
-- invitation_claims, events, transactions, form_submissions et budget_lines
-- échoue (ERROR 42804) et annule l'écriture métier. Ce script n'existe que
-- pour satisfaire l'exigence « toute migration a son retour arrière testé ».
-- Ne l'exécuter que si la migration 20261022000003 doit réellement être
-- annulée — puis rétablir la version corrigée dès que possible.
--
-- Le rollback ne touche ni aux données ni aux schémas : uniquement le corps
-- de 7 fonctions.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_invitation_received()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  INSERT INTO public.notifications (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
  VALUES (NEW.org_id, 'INVITATION_RECEIVED', 'Nouvelle invitation',
    'Une invitation ' || NEW.code || ' pour le rôle ' || NEW.target_role || ' a été émise',
    0, NEW.id::text, NOW());
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.notify_invitation_claimed()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE inv_org TEXT; inv_code TEXT;
BEGIN
  SELECT org_id, code INTO inv_org, inv_code FROM public.invitations WHERE id = NEW.invitation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
  VALUES (inv_org, 'INVITATION_CLAIMED', 'Invitation acceptée',
    'L''invitation ' || inv_code || ' a été acceptée (' || NEW.status || ')',
    0, NEW.id::text, NOW());
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.notify_event_created()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  INSERT INTO public.notifications (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
  VALUES (NEW.org_id, 'EVENT_CREATED', 'Nouvel événement',
    '« ' || NEW.name || ' » a été planifié le ' || NEW.start_date,
    0, NEW.id, NOW());
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_pending_transaction_notification()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  INSERT INTO public.notifications (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
  VALUES (NEW.org_id, 'TRANSACTION_PENDING', 'Nouvelle transaction en attente',
    'Une nouvelle transaction de ' || NEW.amount || ' FCFA attend votre approbation',
    0, NEW.id, NOW());
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_approved_transaction_notification()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  INSERT INTO public.notifications (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
  VALUES (NEW.org_id, 'TRANSACTION_APPROVED', 'Transaction approuvée',
    'Votre transaction a été approuvée avec succès',
    0, NEW.id, NOW());
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.notify_form_submitted()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE form_name TEXT;
BEGIN
  SELECT name INTO form_name FROM public.form_definitions WHERE id = NEW.form_definition_id;
  IF NOT FOUND THEN form_name := 'Formulaire inconnu'; END IF;
  INSERT INTO public.notifications (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
  VALUES (NEW.org_id, 'FORM_SUBMITTED', 'Nouvelle soumission de formulaire',
    '« ' || form_name || ' » a été soumis par ' || NEW.submitted_by,
    0, NEW.id, NOW());
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.notify_budget_exceeded()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE ev_budget BIGINT; ev_org TEXT; ev_name TEXT; total_cents BIGINT;
BEGIN
  SELECT e.budget, e.org_id, e.name INTO ev_budget, ev_org, ev_name
    FROM public.events e WHERE e.id = NEW.event_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(planned_amount_cents + actual_amount_cents), 0) INTO total_cents
    FROM public.budget_lines WHERE event_budget_id = NEW.id AND id <> NEW.id;
  IF total_cents + (NEW.planned_amount_cents + NEW.actual_amount_cents) > ev_budget THEN
    INSERT INTO public.notifications (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
    VALUES (ev_org, 'BUDGET_EXCEEDED', 'Dépassement de budget',
      'L''événement « ' || ev_name || ' » dépasse son budget de '
        || (total_cents + NEW.planned_amount_cents + NEW.actual_amount_cents - ev_budget) || ' FCFA',
      0, NEW.id, NOW());
  END IF;
  RETURN NEW;
END; $function$;
