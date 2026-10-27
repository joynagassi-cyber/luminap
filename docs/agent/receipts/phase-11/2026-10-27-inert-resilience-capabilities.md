# Receipt — Phase 11 : capacités de résilience DÉCLARÉES mais INERTES (R106 + PM15)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-11-resilience`
- **Sources** : R106 (RISQUES.md), PM14/PM15 (PREMORTEM.md)
- **Statut** : terminé

## Défaut visé (classe commune, identifiée pour R113)

Deux garde-fous de résilience existaient dans le code **sans jamais être
alimentés** — même classe de défaut que R105/R107/R113 : « filet déclaré,
jamais câblé ». Le symptôme est trompeur : le code paraît complet (branche,
écran, primitives), mais aucune donnée ne l'active.

### R106 — « mise à jour requise » était du CODE MORT
`resolveRoute()` produit `update-required` (contrôle
`clientSchemaVersion < minSchemaVersion`) et `App.tsx` rend
`UpdateRequiredScreen`. Mais **aucune source** ne fournissait ces deux valeurs :
ni `clientSchemaVersion`, ni `minSchemaVersion`. Preuve :
`grep -rn "minSchemaVersion\|clientSchemaVersion" src/` → uniquement les
définitions du résolveur et son test.

### PM15 — récupération locale déclarée mais non câblée
Les primitives `disconnectPowerSync()` (vide la base SQLite locale),
`deleteAllLocalData()` (purge les clés `lumina-*`) et `resetOrganizationId()`
existaient, mais **aucune action utilisateur** ne les enchaînait. Un appareil
dont la base locale est corrompue/pleine restait bloqué sans recours.

## Livré

| Fichier | Rôle |
|---|---|
| `src/lib/schemaVersion.ts` | `CLIENT_SCHEMA_VERSION`, `parseMinSchemaVersion`, `resolveMinSchemaVersion`, `isUpdateRequired` (fail-open) |
| `src/App.tsx` | `RouteState` alimenté (`clientSchemaVersion` + `minSchemaVersion`) — la branche n'est plus morte |
| `src/vite-env.d.ts` | type `VITE_MIN_SCHEMA_VERSION` |
| `src/lib/localRecovery.ts` | `performLocalRecovery` : orchestration `disconnect → purge → reset-org → reload`, best-effort |
| `src/pages/Health.tsx` | bouton « Réinitialiser les données locales » (confirmé, `data-testid="health.local-recovery"`) |
| `src/lib/__tests__/schema-version.test.ts` | 12 tests (parse fail-open, décision pure, câblage App.tsx) |
| `src/lib/__tests__/local-recovery.test.ts` | 7 tests (ordre, best-effort, câblage Health) |
| `src/lib/__tests__/route-state-wiring.test.ts` | 8 tests — **garde structurelle anti-classe** : aucun champ de `RouteState` ne peut être ajouté sans être câblé (ou explicitement listé `PENDING_WIRING`), et chaque `RouteOutcome` doit avoir un `case` rendu |

## Décisions de conception

- **Fail-open (R106)** : sans `VITE_MIN_SCHEMA_VERSION` déclarée, aucune
  contrainte n'est appliquée → comportement strictement identique à avant. Un
  client n'est averti que si le build déclare une version minimale. Évite
  d'introduire un blocage global non voulu.
- **Ordre significatif (PM15)** : `disconnect` AVANT `purge` (sinon une
  reconnexion en cours pourrait réécrire des clés juste purgées) ; `reload` en
  dernier (sans lui, `getPowerSyncDatabase()` lèverait sur une base fermée).
- **Jamais destructif côté cloud** : la purge ne touche que le local ; la
  session Supabase est préservée (sa clé `sb-<ref>-auth-token` ne commence pas
  par `lumina-`), donc l'utilisateur reste connecté.
- **Confirmation obligatoire** : la purge peut perdre des écritures non encore
  synchronisées → `window.confirm` explicite avant toute action.

## Preuves (gates, toutes vertes)

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `./node_modules/.bin/tsc -b` | **0** (exit 0) |
| Lint | `./node_modules/.bin/eslint .` | **0 erreur** (warnings pré-existants) |
| Unitaires | `./node_modules/.bin/vitest run` | **1373/1373** (103 fichiers) |
| Build | `./node_modules/.bin/vite build` | **OK** (exit 0) |

**Preuve que le test échoue sans le correctif** : en retirant
`clientSchemaVersion`/`minSchemaVersion` de `App.tsx`, le test de câblage passe
de 12/12 à **10 passed | 2 failed** (« App.tsx alimente clientSchemaVersion… »
et « …minSchemaVersion… »). Restauré ensuite.

**Preuve que la garde structurelle mord** : en ajoutant un champ fictif
`bogusInertField` à `RouteState` (non câblé, non listé), le test
`route-state-wiring` échoue (« expected [ 'bogusInertField' ] to deeply equal
[] ») — puis restauré. La classe de défaut ne peut donc plus récidiver
silencieusement.

## Non-couvert (honnêteté)

- `VITE_MIN_SCHEMA_VERSION` n'est **pas** encore positionnée dans les builds :
  la capacité est désormais **câblée et testée**, mais la valeur minimale reste
  à déclarer par le propriétaire au moment où un schéma incompatible est publié
  (sinon fail-open = aucun avertissement, comportement actuel conservé).
- R107 (`needs-membership`) reste inerte : son câblage dépend de la résolution
  R109/R16 (rôles ADMIN/CENTRAL_ADMIN), hors périmètre de ce correctif.
- Le bouton de récupération n'a pas de test de rendu Ionic (pas de rendu ici) ;
  l'orchestration est testée par le cœur pur, le câblage par lecture source.
