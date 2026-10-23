-- 20261022000002_add_org_id_indexes.sql
--
-- Contexte : CHAQUE policy RLS de Lumina filtre par `org_id` (via
-- `is_org_member(auth.uid(), org_id)`), et chaque stream PowerSync
-- `auto_subscribe` filtre également par `org_id`. Or 13 tables portant un
-- `org_id` n'avaient AUCUN index sur cette colonne.
--
-- Preuve (avant) — PostgreSQL faisait un Seq Scan complet à chaque requête :
--   explain analyze select id from public.transactions where org_id='org-e2e' limit 5;
--   ->  Limit  (actual rows=0 loops=1)
--         ->  Seq Scan on transactions  (actual rows=0 loops=1)
--               Filter: (org_id = 'org-e2e'::text)
--
-- Impact : sur 4 mois d'usage quotidien, chaque lecture de table croît
-- linéairement et chaque vérification RLS balaie la table entière. Coût
-- direct sur la facturation Supabase (IO/compute) et dégradation visible.
--
-- Correctif : index btree simple sur `org_id` pour les 13 tables listées.
-- `CREATE INDEX IF NOT EXISTS` → migration idempotente, rejouable sans effet.
-- Aucune donnée modifiée ; aucun verrou long (CREATE INDEX standard).

CREATE INDEX IF NOT EXISTS idx_audit_entries_org_id        ON public.audit_entries (org_id);
CREATE INDEX IF NOT EXISTS idx_categories_org_id           ON public.categories (org_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_org_id ON public.custom_field_definitions (org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id               ON public.events (org_id);
CREATE INDEX IF NOT EXISTS idx_form_definitions_org_id     ON public.form_definitions (org_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_org_id     ON public.form_submissions (org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id        ON public.notifications (org_id);
CREATE INDEX IF NOT EXISTS idx_org_budget_lines_org_id     ON public.org_budget_lines (org_id);
CREATE INDEX IF NOT EXISTS idx_org_units_org_id            ON public.org_units (org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id             ON public.profiles (org_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_org_id   ON public.report_definitions (org_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_org_id     ON public.role_assignments (org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id         ON public.transactions (org_id);

-- Vérification (après) — doit montrer un Index Scan (ou Bitmap) au lieu du Seq Scan :
--   explain analyze select id from public.transactions where org_id='org-e2e' limit 5;
