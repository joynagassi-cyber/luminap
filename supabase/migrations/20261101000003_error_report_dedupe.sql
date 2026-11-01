-- ============================================================================
-- 20261101000003 — `error_report_dedupe` : déduplication ATOMIQUE des rapports
--                  d'erreur + RPC `claim_error_report`
-- ----------------------------------------------------------------------------
-- POURQUOI
--   La déduplication serveur de `report-error` reposait UNIQUEMENT sur l'API de
--   recherche GitHub (`/search/issues`). Or une Issue fraîchement créée n'y
--   devient visible qu'après quelques secondes d'indexation : deux rapports de
--   MÊME signature reçus dans cette fenêtre (boucle de crash, rafale de
--   rechargements, double flush) créaient DEUX Issues identiques.
--   Mesuré (audit QA 2026-11-01) : la même signature a produit #307 ET #308.
--
--   Une vérification « SELECT puis INSERT » côté edge function ne suffit PAS :
--   deux requêtes concurrentes peuvent lire « absent » avant que l'une des deux
--   n'insère (TOCTOU). Le seul verrou fiable est une CONTRAINTE D'UNICITÉ en
--   base : c'est ce que réalise `claim_error_report` ci-dessous.
--
-- FORME
--   Table `(dedupe_key, window_start) → created_at`. La RPC tente une
--   réservation atomique (`INSERT ... ON CONFLICT DO NOTHING`) et renvoie :
--     - `true`  → réservation acquise, l'appelant peut créer l'Issue ;
--     - `false` → un rapport de même signature a déjà été traité dans la
--                 fenêtre → l'appelant répond `deduped: true` sans créer
--                 d'Issue.
--   Fenêtre FIXE de 6 h (`date_trunc('hour', now())` sur une grille de 6 h) :
--   déterministe, sans dérive mémoire.
--
-- SÉCURITÉ
--   - La table ne contient AUCUNE donnée d'utilisateur : un `dedupe_key` dérivé
--     de la signature d'erreur (déjà expurgée côté client) et un horodatage.
--   - Deny-all (RLS activée, AUCUNE politique) : ni `anon` ni `authenticated`
--     ne peuvent la lire/écrire via l'API REST.
--   - `claim_error_report` est SECURITY DEFINER (propriétaire `postgres`) avec
--     EXECUTE RÉVOQUÉ de `PUBLIC`/`anon`/`authenticated` : SEUL le
--     `service_role` (edge function) peut l'appeler. Un client ne peut donc ni
--     lire ni préempter les clés de déduplication.
--
-- RÉVERSIBILITÉ : rollback/20261101000003_rollback.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.error_report_dedupe (
  dedupe_key   TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dedupe_key, window_start)
);

-- Purge opportuniste des fenêtres anciennes (garde la table minuscule).
CREATE INDEX IF NOT EXISTS idx_error_report_dedupe_window
  ON public.error_report_dedupe(window_start);

-- ── Grants Data API : AUCUN accès client (deny-all volontaire) ──────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.error_report_dedupe TO service_role;

ALTER TABLE public.error_report_dedupe ENABLE ROW LEVEL SECURITY;

-- ── RPC de réservation atomique (service_role uniquement) ───────────────────
CREATE OR REPLACE FUNCTION public.claim_error_report(
  p_dedupe_key TEXT,
  p_window_hours INTEGER DEFAULT 6
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours  INTEGER := GREATEST(COALESCE(p_window_hours, 6), 1);
  v_window TIMESTAMPTZ;
  v_rows   INTEGER;
BEGIN
  -- Purge opportuniste (bornée : uniquement les fenêtres de plus de 7 jours).
  DELETE FROM public.error_report_dedupe
   WHERE window_start < now() - INTERVAL '7 days';

  -- Fenêtre fixe alignée sur `v_hours` (grille déterministe).
  v_window := to_timestamp(
    floor(extract(epoch FROM now()) / (v_hours * 3600.0)) * (v_hours * 3600.0)
  );

  -- Réservation atomique : la contrainte de clé primaire tranche entre deux
  -- appels concurrents (le second ne peut PAS insérer → 0 ligne).
  INSERT INTO public.error_report_dedupe (dedupe_key, window_start)
  VALUES (p_dedupe_key, v_window)
  ON CONFLICT (dedupe_key, window_start) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- Aucune surface publique : EXECUTE réservé au service_role.
REVOKE ALL ON FUNCTION public.claim_error_report(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_error_report(TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.claim_error_report(TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_error_report(TEXT, INTEGER) TO service_role;

-- ── Libération de réservation (l'échec de création ne doit PAS perdre le rapport)
--   Si la création de l'Issue échoue APRÈS la réservation (token expiré, 5xx,
--   quota GitHub), l'edge function appelle cette RPC pour rendre la clé : le
--   prochain flush pourra retenter, au lieu de rester silencieusement
--   « dédupliqué » pendant 6 h sur une Issue qui n'existe pas.
CREATE OR REPLACE FUNCTION public.release_error_report(
  p_dedupe_key TEXT,
  p_window_hours INTEGER DEFAULT 6
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours  INTEGER := GREATEST(COALESCE(p_window_hours, 6), 1);
  v_window TIMESTAMPTZ;
  v_rows   INTEGER;
BEGIN
  v_window := to_timestamp(
    floor(extract(epoch FROM now()) / (v_hours * 3600.0)) * (v_hours * 3600.0)
  );
  DELETE FROM public.error_report_dedupe
   WHERE dedupe_key = p_dedupe_key
     AND window_start = v_window;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.release_error_report(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_error_report(TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.release_error_report(TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_error_report(TEXT, INTEGER) TO service_role;
