# Lumina — Instructions pour agents de code (AGENTS.md)

## Maintien Autonoma — test data integration

L'intégration Autonoma vit dans `server/autonoma/` (3 factories de test data)
et `server/middleware/autonoma.ts` (endpoint `POST /api/autonoma`).

**Ne pas toucher** aux fichiers suivants sans revalider l'intégration :
- `server/autonoma/factories.ts` — 37 factories, 1:1 avec l'entity audit
- `server/autonoma/writes.ts` — plan d'écriture PG mirroir des `*PS`
- `server/autonoma/pg-db.ts` — client `pg` Supabase
- `server/middleware/autonoma.ts` — montage du handler SDK

### Contrainte uuid / slug

Les ids du scénario sont des **slugs** (`user-admin-{{testRunId}}`) et les
colonnes `uuid` de la base Supabase exigent de vrais uuid. Toute factory qui
insère dans une colonne uuid via le slug du scénario doit passer par
`slugToUuid()` (uuid v5 déterministe, namespace Lumina). Ne JAMAIS insérer
un slug directement dans une colonne uuid.

### Cascade par org_id

Le teardown racine `organizations` delete les tables ayant une colonne
`org_id`. `event_budgets`, `budget_lines` et `group_memberships` n'ont pas
de colonne `org_id` — leur teardown est géré par les factories dédiées
(l'SDK `down` inverse l'ordre de création).

### Env required

L'endpoint `/api/autonoma` est armé uniquement si `AUTONOMA_SHARED_SECRET`
est présent dans l'env. Localement, `SUPABASE_DB_URL` ou
`PS_DB_HOST` + `PS_DATABASE_PASSWORD` sont requis pour la connexion PG.
`AUTONOMA_TEST_EMAIL` / `AUTONOMA_TEST_PASSWORD` pour les credentials.
