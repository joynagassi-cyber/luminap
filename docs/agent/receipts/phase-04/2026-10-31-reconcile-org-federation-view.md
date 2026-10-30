# Receipt — Réconciliation R17 : vue `org_federation`

- **Date** : 2026-10-31
- **Branche** : `agent/r140-audit-append-only`
- **Migration** : `20261031000006_reconcile_org_federation_view.sql` (+ rollback)

## Défaut mesuré

Recoupement exhaustif **dépôt ↔ base** (tables, fonctions, triggers, vues) :

- **0 objet créé par le dépôt ne manque en base** (hors `agent_try_jsonb`,
  DROP volontaire en fin de sa propre migration ; et `on_auth_user_created`,
  trigger sur le schéma `auth`).
- **1 vue existe en base SANS `CREATE` dans le dépôt** : `public.org_federation`.
  Une base reconstruite depuis `supabase/migrations/` ne l'aurait **pas** eue →
  écart de reproductibilité (R17).

Objets DB restants sans CREATE dépôt (revus) : `keep_alive` (CREATE dans
`supabase/keep-alive.sql`, hors migrations) et `rls_auto_enable` (événement
Supabase, pas un objet de ce projet) ; `settle_pending_claims_for_invitation`
est référencé par des migrations (ALTER/REVOKE) mais son CREATE est hors dépôt.

## Correctif (idempotent, non destructif)

`CREATE OR REPLACE VIEW public.org_federation` avec la **définition identique**
(`pg_get_viewdef`) et `security_invoker = true`. `CREATE OR REPLACE` conserve
l'OID de la relation → **privilèges préservés** (vérifié : `anon`,
`authenticated`, `powersync_role`, `service_role`, `postgres` conservent SELECT).

## Preuve

- Avant : vue présente, `security_invoker=true`, grants complets.
- Après application : `reloptions = {security_invoker=true}`, `SELECT` toujours
  accordé aux 5 rôles, `SELECT count(*)` = 3 (3 organisations).
- Vue `org_family` : `security_invoker=true` (inchangée, déjà conforme R24).

## Garde anti-récurrence

`src/lib/__tests__/view-creation-guard.test.ts` — vérifie que chaque vue
attendue (`org_family`, `org_federation`) a un `CREATE VIEW` dans les
migrations, et que `org_federation` est créée avec `security_invoker=true`.

## Gates

- `npx tsc -b` → **0**
- `npx vitest run` → **1754/1754** (161 fichiers)

---

## Décision annexe — P3-1 / PR17 (table de fermeture matérialisée) : MESURÉE, NON JUSTIFIÉE

**Mesure (2026-10-31)** : `organizations` = **3** lignes ; `org_family` (CTE
récursive) = **3** lignes ; paires non triviales (`org_id <> ancestor`) = **0** ;
organisations enfants (`parent_org_id IS NOT NULL`) = **0**.

**Décision** : ne pas créer de table de fermeture matérialisée. Le coût
(duplication de données + triggers de maintenance) n'est justifié que si la
fédération atteint des centaines d'organisations. Rouvrir P3-1/PR17 à ce
moment-là. `org_family` (vue récursive, `security_invoker=true`) reste adaptée.
