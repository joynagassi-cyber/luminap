-- ============================================================================
-- 20261101000002 — `error_report_throttle` : rate-limiting des rapports
--                  d'erreur ANONYMES (pré-login) + RPC `register_anonymous_report`
-- ----------------------------------------------------------------------------
-- POURQUOI
--   Le système d'observabilité (`report-error`) exigeait un appelant
--   AUTHENTIFIÉ (JWT Supabase). Or les incidents les plus précieux surviennent
--   AVANT la connexion : crash de l'écran d'auth, échec du flux d'invitation,
--   formulaire de login, perte de connexion au boot. Ces rapports restaient en
--   file locale et n'étaient remontés qu'APRÈS login — ou jamais si
--   l'utilisateur ne parvenait pas à se connecter (précisément le cas qu'on
--   cherche à diagnostiquer).
--
--   On ouvre donc un chemin ANONYME, mais STRICTEMENT borné : le jeton GitHub
--   reste côté serveur, et un plafond par origine empêche qu'un endpoint public
--   serve à spammer des Issues sur le dépôt.
--
-- FORME
--   Une table de comptage `(bucket, window_start) → count` et une fonction
--   `register_anonymous_report(bucket, max_per_window)` qui incrémente le
--   compteur de la fenêtre courante et renvoie `true` si le rapport est
--   autorisé. La fenêtre est FIXE de 1 heure : déterministe et sans dérive de
--   mémoire.
--
-- SÉCURITÉ
--   - La table ne contient AUCUNE donnée d'utilisateur : uniquement un
--     `bucket` = hachage salé d'un identifiant d'origine (IP) et un compteur.
--     Elle est en deny-all (RLS activée, AUCUNE politique) : ni `anon` ni
--     `authenticated` ne peuvent la lire ou l'écrire via l'API REST.
--   - La fonction est `SECURITY DEFINER` (propriétaire `postgres`) et son
--     EXECUTE est RÉVOQUÉ de `PUBLIC`/`anon`/`authenticated` : SEUL le
--     `service_role` (utilisé par l'edge function) peut l'appeler. Un client
--     ne peut donc PAS gonfler un compteur pour bloquer autrui (déni de
--     signalement).
--   - La fonction n'est pas une fonction de trigger : elle reste donc dans le
--     périmètre de la garde R115 uniquement en tant que fonction SECURITY
--     DEFINER non exposée (EXECUTE révoqué) — même discipline.
--
-- RÉVERSIBILITÉ : rollback/20261101000002_rollback.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.error_report_throttle (
  bucket       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- Purge opportuniste des fenêtres anciennes (garde la table minuscule).
CREATE INDEX IF NOT EXISTS idx_error_report_throttle_window
  ON public.error_report_throttle(window_start);

-- ── Grants Data API : AUCUN accès client (deny-all volontaire) ──────────────
-- Seul le service_role (edge function) touche cette table, et uniquement via
-- la fonction SECURITY DEFINER ci-dessous. On ne GRANT rien à anon/authenticated.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.error_report_throttle TO service_role;

ALTER TABLE public.error_report_throttle ENABLE ROW LEVEL SECURITY;

-- ── RPC de rate-limiting (service_role uniquement) ──────────────────────────
CREATE OR REPLACE FUNCTION public.register_anonymous_report(
  p_bucket TEXT,
  p_max_per_window INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('hour', now());
  v_count  INTEGER;
BEGIN
  -- Purge opportuniste (bornée : uniquement les fenêtres de plus de 2 jours).
  DELETE FROM public.error_report_throttle
   WHERE window_start < now() - INTERVAL '2 days';

  INSERT INTO public.error_report_throttle (bucket, window_start, count)
  VALUES (p_bucket, v_window, 1)
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET count = public.error_report_throttle.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max_per_window;
END;
$$;

-- Aucune surface publique : EXECUTE réservé au service_role.
REVOKE ALL ON FUNCTION public.register_anonymous_report(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_anonymous_report(TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.register_anonymous_report(TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.register_anonymous_report(TEXT, INTEGER) TO service_role;
