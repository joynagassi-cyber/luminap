-- ============================================================================
-- 20261022000003 — fix: les triggers de notification écrivaient 0 dans une
-- colonne BOOLEAN `notifications.is_read`.
-- ----------------------------------------------------------------------------
-- SYMPTÔME OBSERVÉ
--   Toute écriture métier déclenchant un trigger de notification échouait :
--     ERROR 42804: column "is_read" is of type boolean but expression is of
--     type integer
--   Le trigger est AFTER INSERT : la ligne était insérée puis la transaction
--   entière annulée. Côté utilisateur, l'action échouait sans rien enregistrer.
--
-- CHEMIN RÉEL (reproduit par curl sur l'API REST, compte org-e2e) :
--   POST /rest/v1/invitations -> HTTP 400 « column "is_read" is of type
--   boolean but expression is of type integer »
--
-- PÉRIMÈTRE — 7 fonctions, donc 7 parcours métier cassés :
--   invitations        INSERT  -> notify_invitation_received
--   invitation_claims  INSERT  -> notify_invitation_claimed
--   events             INSERT  -> notify_event_created
--   transactions       INSERT  -> create_pending_transaction_notification
--   transactions       UPDATE  -> create_approved_transaction_notification
--   form_submissions   INSERT  -> notify_form_submitted
--   budget_lines       INSERT  -> notify_budget_exceeded
--
-- CAUSE : `notifications.is_read` est BOOLEAN depuis la migration 0011
-- (`is_read boolean DEFAULT false`), mais les 7 fonctions ont été écrites
-- avec le littéral entier `0` (forme héritée d'un schéma SQLite/PowerSync où
-- les booléens sont des entiers 0/1). PostgreSQL refuse la conversion
-- implicite integer -> boolean en INSERT.
--
-- CORRECTIF : remplacer `0` par `false`. Aucune autre sémantique ne change.
-- Les lectures côté client restent correctes : PowerSync projette les BOOLEAN
-- en entiers 0/1, ce que le front gère déjà (Notifications.tsx,
-- SettingsNotifications.tsx, powersync/schema.ts `column.integer`).
--
-- DURCISSEMENT INCLUS : `SET search_path = public` sur les 7 fonctions
-- (recommandation de l'advisor sécurité `function_search_path_mutable`) —
-- elles ne référencent que des tables de `public`.
--
-- RÉVERSIBILITÉ : rollback/20261022000003_rollback.sql restaure `0` (état
-- bugué) — à n'utiliser que pour revenir en arrière sur cette migration.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_invitation_received()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'INVITATION_RECEIVED',
    'Nouvelle invitation',
    'Une invitation ' || NEW.code || ' pour le rôle ' || NEW.target_role || ' a été émise',
    false,
    NEW.id::text,
    NOW()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_invitation_claimed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
    false,
    NEW.id::text,
    NOW()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_event_created()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'EVENT_CREATED',
    'Nouvel événement',
    '« ' || NEW.name || ' » a été planifié le ' || NEW.start_date,
    false,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_pending_transaction_notification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'TRANSACTION_PENDING',
    'Nouvelle transaction en attente',
    'Une nouvelle transaction de ' || NEW.amount || ' FCFA attend votre approbation',
    false,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_approved_transaction_notification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (
    org_id, action_type, title, message, is_read, source_transaction_id, created_at
  ) VALUES (
    NEW.org_id,
    'TRANSACTION_APPROVED',
    'Transaction approuvée',
    'Votre transaction a été approuvée avec succès',
    false,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_form_submitted()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
    false,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$function$;

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
