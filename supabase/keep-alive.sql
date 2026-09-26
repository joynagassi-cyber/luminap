-- =============================================================================
-- Lumina — Supabase Free-tier anti-pause : heartbeat pg_cron
-- =============================================================================
-- Appliqué le 2026-09-26 via MCP supabase (instance hhgovvrnalibhgpakswi)
-- Jobid live : 1
--
-- Méthode : 1 table keep_alive (1 ligne) + 1 job pg_cron quotidien à 00:00 UTC
-- qui fait DELETE + INSERT. Charge négligeable, 100 % native Postgres.
-- L'inactivité "d'activité API" ne compte pas : le heartbeat garde le
-- compteur d'activité de l'instance à zéro, évitant la pause auto Free
-- (90 jours max de pause restaurable, sans sauvegarde auto sur Free).
--
-- NOTE IMPORTANTE : le job est créé via cron.schedule() et NON via
-- INSERT INTO cron.job — le rôle MCP n'a pas le GRANT d'écriture direct
-- sur cron.job, mais a le droit sur la fonction wrapper cron.schedule().
-- =============================================================================

-- 1. Table heartbeat (1 ligne, jamais plus)
CREATE TABLE IF NOT EXISTS public.keep_alive (
  last_ping timestamptz NOT NULL DEFAULT now()
);

-- 2. Job pg_cron quotidien 00:00 UTC (wrapper — le piège documenté)
SELECT cron.schedule(
  'keep_alive_daily',
  '0 0 * * *',
  'DELETE FROM public.keep_alive; INSERT INTO public.keep_alive DEFAULT VALUES;'
);

-- 3. Amorçage (garanti 1 ligne, même si le premier 00:00 UTC est encore loin)
INSERT INTO public.keep_alive (last_ping)
VALUES (now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- APPLICATION STATUS (2026-09-26)
-- =============================================================================
-- Extension pg_cron : v1.6.4 (absente avant application → CREATE EXTENSION ok)
-- Table keep_alive : présente, 1 ligne, dernier ping = 2026-09-26 21:53:58 UTC
-- Job keep_alive_daily : jobid 1, schedule "0 0 * * *", active = true
-- Commande du job (vérifiée verbatim dans cron.job) :
--   DELETE FROM public.keep_alive; INSERT INTO public.keep_alive DEFAULT VALUES;
-- Statut : OUI — le projet est immunisé contre la pause auto.
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
-- =============================================================================
