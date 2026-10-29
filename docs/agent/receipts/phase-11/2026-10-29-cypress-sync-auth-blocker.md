# Receipt — Phase 11 : Cypress E2E bloqué par l'authentification PowerSync (401 `aud`)

- **Date** : 2026-10-29
- **Branche** : `fix/cypress-ui-nav`
- **Périmètre** : rendre vertes `cypress/e2e/reports-budgets.cy.ts` et
  `cypress/e2e/comprehensive-flow.cy.ts` (agent « navigation / rendu / UI »).
- **Verdict** : **NON RÉSOLU — cause racine hors du code de l'app**
  (`client_auth` du service PowerSync déployé). Escalade **E5**.

## 1. Symptôme

Les deux specs échouent de façon déterministe, mais **pas** sur le libellé
qu'elles cherchent : la page cible reste bloquée sur son **squelette de
chargement**, donc le bouton / titre attendu n'est jamais rendu.

| Spec | Assertion en échec | Sortie mesurée (locale) |
|---|---|---|
| `reports-budgets.cy.ts` (1) | `'Ce mois'` dans `button, ion-button` | `Timed out retrying after 90000ms: Expected to find content: 'Ce mois' … but never did.` (ligne 35) |
| `reports-budgets.cy.ts` (2) | `'Exporter le rapport'` dans `button, ion-button` | `Timed out retrying after 30000ms: Expected to find content: 'Exporter le rapport' … but never did.` (ligne 50) |
| `comprehensive-flow.cy.ts` | `"Bilan financier"` dans `h1, h2, h3` | `AssertionError: Timed out retrying after 60000ms: "Bilan financier" présent dans la page active …: expected false to be true` |

Les libellés **existent bien** dans le code (`Reports.tsx:457-459, 601, 613`,
`Balance.tsx:126`). Ce n'est donc **pas** une dérive de libellé : la branche
« chargement » masque la branche « prête ».

## 2. Cause racine (mesurée)

`Reports.tsx:429` et `Balance.tsx:36-37` (et `History`, `Members`, `Events`,
`Groups`, `Versement`, `TransactionEdit`) gardent leur rendu réel derrière
`isPowerSyncReadyNow()` — c'est **voulu** (famille R52, gardes anti-récurrence).

`isPowerSyncReadyNow()` passe à `true` uniquement via `markPowerSyncReady()`,
appelé par `usePowerSyncStatus()` **quand `status.connected && status.hasSynced`**
(`dataLayer.ts:1019-1024`). Or la synchronisation échoue en boucle :

```
downloadError.message =
  HTTP Unauthorized: {"error":{"code":"PSYNC_S2105","status":401,
  "description":"Unexpected \"aud\" claim value: \"authenticated\""}}
```

→ `connected` reste `false` → `_psReady` reste `false` → toutes les pages
protégées affichent leur squelette **indéfiniment**.

### Preuve 1 — état PowerSync in-browser (spec de debug)

`window.__psDb.currentStatus` capturé dans Electron :
`core.connected: false`, `dataFlow.downloadError` = message ci-dessus.
(Le client PowerSync fonctionne : `hasDb: true`, les 12 streams on-demand sont
souscrits, `has_explicit_subscription: true`.)

### Preuve 2 — appel direct à l'instance (indépendant du navigateur)

Jeton Supabase **valide** (vérifié : `GET /auth/v1/user` → **HTTP 200**),
en-tête `Authorization: Bearer <access_token>` :

```
POST https://6a9dd96302481fb31b945823.powersync.journeyapps.com/sync/stream
  {"buckets":[],"include_checksum":false,"raw_data":true}
→ HTTP 401 {"code":"PSYNC_S2105","description":"Unexpected \"aud\" claim value: \"authenticated\""}
```

Décodage du jeton : `alg: ES256`, `iss:
https://hhgovvrnalibhgpakswi.supabase.co/auth/v1`, **`aud: "authenticated"`**,
`role: "authenticated"`, `sub: 87afea21-…`, `email: lumina-org-e2e@lumina.dev`.
Le projet Supabase signe en **asymétrique ES256** (`kid e6d0da61-…`, JWKS public
servi) — c'est le chemin « nouveau » attendu par PowerSync.

### Preuve 3 — contre-épreuve (la seule variable qui débloque)

Forcer temporairement `isPowerSyncReadyNow()` à `true` (patch non commité) rend
les specs **vertes** :

| Spec | Avant | Avec disponibilité forcée |
|---|---|---|
| `reports-budgets.cy.ts` | 3/5 (2 échecs) | **5/5** |
| `comprehensive-flow.cy.ts` | 0/1 | 0/1 *(voir §3)* |

Cela isole la variable : **c'est bien l'état de disponibilité, pas le code de
rendu**, qui décide du vert.

## 3. Défaut jumeau révélé par la contre-épreuve

Avec la disponibilité forcée, `comprehensive-flow` ne bloque plus sur
`Bilan financier` mais **plus loin**, sur `"Modifier"` (page
`/transaction/:id/edit`). Cause mesurée (spec de debug) : l'`id` dérivé de
l'URL après création vaut **`"new"`** — l'assertion
`cy.location('pathname').should('include', '/transaction/')` est satisfaite par
`/transaction/new` (sous-chaîne !), donc le spec navigue vers
`/transaction/new/edit`, qui rend légitimement « Transaction introuvable ».

Ce second point **ne peut pas être prouvé vert** tant que la sync est cassée
(on ne l'atteint jamais), et il relève d'une fragilité de **spec**, pas d'un
défaut produit. Il est laissé **non modifié** (hors du correctif minimal et
dépendant du blocage amont). À traiter après E5.

## 4. Ce qui n'est PAS la cause (hypothèses réfutées)

- **Dérive de libellé** : réfutée — les chaînes attendues existent à
  l'identique dans `Reports.tsx` / `Balance.tsx`.
- **Titre de page manquant (R61)** : réfutée — les `<h1>` sont présents
  (`Reports.tsx:419/434`, `Balance.tsx:126`) ; la garde `screen-states-guard`
  reste verte (10/10 avec `r52-readiness-guard`).
- **Gardes R52 mal câblées** : réfutées — les gardes sont **vertes** et
  décrivent le comportement correct (squelette tant que la réplique n'a pas
  répondu). Les assouplir **casserait** `r52q-finance-loading` (qui exige
  `data-screen-state="loading"` et l'absence de « Bilan financier » avant
  disponibilité). Aucune modification des gardes n'a donc été faite.

## 5. Correctif requis (propriétaire — service PowerSync)

La validation de jeton côté PowerSync n'accepte pas l'audience
`authenticated` de Supabase. Le `service.yaml` du dépôt (branche
`fix/powersync-replication-r80`) décrit une config `client_auth` en JWKS
(`supabase: true` + `jwks_uri` + `additional_audiences: []`) — sans liste
d'audiences acceptées explicite. Côté PowerSync, la config JWKS **manuelle**
exige une audience déclarée (`audience: ["authenticated"]`) ; sinon
`PSYNC_S2105`.

**Action** : dans le service config PowerSync de l'instance
`6a9dd96302481fb31b945823`, ajouter `authenticated` comme audience acceptée
(`client_auth.audience: ["authenticated"]`, ou `additional_audiences:
["authenticated"]` selon le schéma retenu) puis redéployer le **service
config** (`powersync deploy service-config`, exige `PS_ADMIN_TOKEN` — absent
de l'environnement de l'agent, cf. E1/E2). Vérification attendue :
`POST /sync/stream` → **HTTP 200**.

**Interdit respecté** : `powersync/service.yaml` et `powersync/sync-config.yaml`
n'ont **pas** été modifiés (config déployée), conformément à la consigne.

## 6. Environnement de reproduction (local, vérifié)

- `sudo apt-get install -y xvfb` ; `.env.local` (gitignoré) avec
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_JWKS_URL` /
  `VITE_POWERSYNC_URL` (instance Production).
- Serveur de dev : `node node_modules/vite/bin/vite.js` sur `:8080`.
- `CYPRESS_BASE_URL=http://localhost:8080 xvfb-run -a node
  node_modules/cypress/bin/cypress run --spec <spec> --browser electron
  --config video=false`.

## 7. État du dépôt

Aucun fichier de code applicatif modifié. Seul ce receipt + l'escalade E5 +
une ligne de `PROGRESS.md` sont ajoutés. La branche
`fix/cypress-ui-nav` sert à porter l'escalade (la suite Cypress reste rouge
tant que E5 n'est pas traitée).
