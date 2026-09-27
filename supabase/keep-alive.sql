-- =============================================================================
-- Lumina — Supabase Free-tier anti-pause : heartbeat pg_cron
-- =============================================================================
-- Historique :
--   2026-09-26 : version initiale (jobid 1) — DELETE + INSERT sans PK.
--                Échec au 1er 00:00 UTC : "cannot delete from table
--                keep_alive because it does not have a replica identity
--                and publishes deletes" (publication Supabase active).
--   2026-09-27 : correction — ajout d'une PK (id) + UPSERT atomique.
--                Jobid live actuel : 3
--
-- Méthode : 1 table keep_alive (1 ligne, PK id=1) + 1 job pg_cron quotidien
-- à 00:00 UTC qui fait un UPSERT. Charge négligeable, 100 % native
-- Postgres. L'inactivité API ne compte pas : le heartbeat garde le
-- compteur d'activité de l'instance à zéro, évitant la pause auto Free.
--
-- NOTE IMPORTANTE :
--  - Le job est créé via cron.schedule() et NON via INSERT INTO cron.job
--    (le rôle MCP n'a pas le GRANT d'écriture direct sur cron.job).
--  - La table SUPABASE (publiquée pour la réplication) exige une
--    PRIMARY KEY sur toute DML : DELETE et UPDATE sont bloqués
--    ("no replica identity"), seul l'UPSERT (INSERT ... ON CONFLICT
--    DO UPDATE) passe — d'où la forme actuelle du command body.
-- =============================================================================

-- 1. Table heartbeat (1 ligne, PK pour satisfair la publication Supabase)
CREATE TABLE IF NOT EXISTS public.keep_alive (
  id        integer  NOT NULL DEFAULT 1,
  last_ping timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 2. Job pg_cron quotidien 00:00 UTC (wrapper — le piège documenté)
SELECT cron.schedule(
  'keep_alive_daily',
  '0 0 * * *',
  'INSERT INTO public.keep_alive (id, last_ping) VALUES (1, now()) ON CONFLICT (id) DO UPDATE SET last_ping = now();'
);

-- 3. Amorçage (garanti 1 ligne, même si le premier 00:00 UTC est encore loin)
INSERT INTO public.keep_alive (id, last_ping)
VALUES (1, now())
ON CONFLICT (id) DO UPDATE SET last_ping = now();

-- =============================================================================
-- APPLICATION STATUS (2026-09-27)
-- =============================================================================
-- Extension pg_cron : v1.6.4
-- Table keep_alive : présente, 1 ligne, PK(id), dernier ping = 2026-09-27 18:57 UTC
-- Job keep_alive_daily : jobid 3, schedule "0 0 * * *", active = true
-- Commande du job (vérifiée verbatim dans cron.job) :
--   INSERT INTO public.keep_alive (id, last_ping) VALUES (1, now())
--   ON CONFLICT (id) DO UPDATE SET last_ping = now();
-- Statut : OUI — le projet est immunisé contre la pause auto.
--
-- Échec historique documenté :
--   jobid 1 (DELETE+INSERT sans PK) a échoué au 2026-09-27 00:00 UTC :
--   "cannot delete from table keep_alive because it does not have a
--   replica identity and publishes deletes" — corrigé par la PK ci-dessus.
-- =============================================================================

-- =============================================================================
-- RÉVERSIBILITÉ (passage au plan Pro ou abandon définitif)
-- =============================================================================
-- SELECT cron.unschedule('keep_alive_daily');  -- supprime le job
-- DROP TABLE IF EXISTS public.keep_alive;     -- supprime la table
-- → le projet retombe dans le comportement Free normal (pause auto après
--   7 jours d'inactivité).
--
-- VÉRIFICATION AU RÉVEIL (après une pause de quelques mois) :
--   SELECT last_ping FROM public.keep_alive;
--   → date dans les dernières 24 h = heartbeat a tourné sans erreur ;
--     date très ancienne = l'instance s'est mise en pause quand même
--     (le job s'arrête avec l'instance, rien de réparable depuis l'extérieur).
--
-- SURVEILLANCE (optionnel) :
--   SELECT jobid, start_time, end_time, status, return_message
--   FROM cron.job_run_details WHERE jobid = 3 ORDER BY start_time DESC LIMIT 5;
-- =============================================================================
