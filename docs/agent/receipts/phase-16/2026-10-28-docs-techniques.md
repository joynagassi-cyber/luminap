# Receipt — Phase 16 : documentation technique (ARCHITECTURE / SECURITY / TESTING)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-16-docs-techniques`
- **Tâche** : produire trois documents racine **dérivés du code réel**, sans
  modifier d'autre fichier que `docs/agent/PROGRESS.md` (une ligne) et ce receipt.

## Livrable

| Fichier | Contenu |
|---|---|
| `docs/ARCHITECTURE.md` | Couches (pages Ionic, `dataLayer.ts`, `capabilities/*`, `powersync/*`), flux de données offline-first (diagramme **Mermaid**), routage (`routeResolver.ts` + `ionic/routes/*`), RBAC (`rbac.ts`, `permissions.ts`, `capabilities.ts`, `has_permission` SQL), décisions structurantes (ADR de `DECISIONS.md`). |
| `docs/SECURITY.md` | RLS (inventaire 43 tables), `SECURITY DEFINER` + règle « aucune fonction de trigger en RPC » (R103/R115, migrations `20261026000005` et `20261028000001`), rédaction PII (`clientErrors.ts`), échappement CSV (`csv.ts`), entrées hostiles (`sanitize.ts`), secrets, gardes d'inventaire, risques ouverts (R104, R109, R107, R16, R18, R80, R97). |
| `docs/TESTING.md` | Vitest (node + jsdom, `vitest.config.ts`), gardes structurelles (`route-state-wiring`, `route-registry-drift`, `sync-streams-drift`, `rls-inventory`, `revoke-trigger-functions`, `jsonb-inventory`, `role-model-drift`, `screen-states-guard`), Cypress (30 specs, **non vert** sur `main` = R98/E2), gates bloquants, pattern des receipts. |

## Sources lues (échantillon)

`src/lib/dataLayer.ts`, `src/lib/routeResolver.ts`, `src/lib/rbac.ts`,
`src/lib/permissions.ts`, `src/lib/capabilities.ts`, `src/lib/auth.ts`,
`src/lib/orgContext.ts`, `src/lib/powersync/index.ts`,
`src/lib/powersync/SupabaseConnector.ts`, `src/lib/powersync/schema.ts`,
`src/lib/clientErrors.ts`, `src/lib/csv.ts`, `src/lib/sanitize.ts`,
`src/lib/bootWatchdog.ts`, `src/App.tsx`, `src/main.tsx`,
`src/ionic/routes/index.ts`, `src/components/RouteStates.tsx`,
`powersync/sync-config.yaml`, `vite.config.ts`, `vitest.config.ts`,
`.github/workflows/{ci,cypress,backup}.yml`,
`supabase/migrations/20261026000002_*`, `20261026000005_*`, `20261027000010_*`,
`20261028000001_*`, `docs/agent/{DECISIONS,RISQUES,ESCALATIONS,CONTRAT_RBAC,PROGRESS}.md`,
`docs/agent/rls-inventory.json`, `docs/agent/role-model.json`, gardes de test.

## Commandes exécutées et résultats

Environnement : Node **v24.21.0** ; pnpm **11.27.1** installé via
`npm install --prefix "$HOME/.local" pnpm@11.27.1` (corepack et
`npm i -g` bloqués par permissions EACCES). Dépendances :
`pnpm install --frozen-lockfile` → **exit 0**. Un `.env.local` local (gitignoré)
a été créé pour satisfaire l'exigence d'`auth.ts` en `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY`.

| Gate | Commande | Sortie |
|---|---|---|
| Typecheck | `npx tsc -b` | **exit 0** |
| Lint | `npx eslint src/` | **exit 0 — 0 erreur** (1642 warnings pré-existants) |
| Unitaires | `npx vitest run` | **exit 0 — 1466 passés / 6 ignorés** (114 fichiers passés, 1 ignoré) |

## Contraintes respectées

- Aucun autre fichier modifié que les 3 docs, la ligne ajoutée à
  `docs/agent/PROGRESS.md` et ce receipt.
- Pas de push sur `main` ; branche `agent/phase-16-docs-techniques` + PR (non
  mergée).
- Chaque affirmation technique renvoie à un fichier réel ; fiabilité marquée
  `[Prouvé]` / `[Probable]` / `[Non vérifié]`.
