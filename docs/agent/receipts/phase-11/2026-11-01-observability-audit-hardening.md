# Phase 11 — Audit QA de la chaîne d'observabilité + durcissement

- **Date** : 2026-11-01
- **Branche** : `fix/observability-audit-hardening`
- **Rôle** : Lead QA Engineer / Architecte infra
- **Priorité** : P0 (la chaîne d'auto-correction autonome était à la fois
  **bruyante** — 100 Issues ouvertes pour 2 causes — et **silencieuse** sur les
  pannes du self-update)
- **Statut** : terminé (portes vertes : 2297 tests, TSC, ESLint, E2E cloud réel)
- **Périmètre** : edge function `report-error`, dédup serveur, moniteur de perf,
  transport client, self-update Android (plugin natif + workflow release),
  gardes de non-régression, nettoyage du dépôt.

## 1. Chaîne auditée (cartographie)

```
Erreur client (window.onerror / unhandledrejection / captureClientError)
  → errorReporter.ts : redaction PII, signature de dédup, file persistée (offline)
  → edge function report-error (Deno, verify_jwt:false)
       • identifie l'appelant (JWT vérifié sinon anonyme, bucket = hash d'IP)
       • rate-limit (RPC register_anonymous_report, table error_report_throttle)
       • dédup ATOMIQUE en base (RPC claim_error_report, table error_report_dedupe)
       • recherche GitHub (second filet, issues pré-existantes)
  → POST /repos/joynagassi-cyber/luminap/issues  { title, body, labels:["openhands"] }
  → automatisation OpenHands « GitHub issue to PR »
```

Contraintes dures vérifiées :

| Contrainte | État |
|---|---|
| Jeton GitHub jamais côté client | ✅ secret Supabase `GITHUB_TOKEN` (edge function uniquement) |
| Label `openhands` existe | ✅ `color 5319E7` |
| Voie pré-login anonyme (`verify_jwt:false`) | ✅ préservée, plafond serré par IP hachée |
| Edge function = source locale | ✅ déployée v7, hash vérifié |

## 2. Défauts trouvés et corrigés

### D1 — Déduplication serveur inopérante (doublons en rafale) — **CRITIQUE**

La dédup reposait **uniquement** sur l'API de recherche GitHub
(`/search/issues`), dont l'indexation prend plusieurs secondes. Deux rapports de
même signature reçus dans cette fenêtre (boucle de crash) créaient **deux
Issues** : mesuré **#307 ET #308** pour la même signature.

**Correctif** : réservation **atomique** en base *avant* la recherche GitHub.

- `supabase/migrations/20261101000003_error_report_dedupe.sql` : table
  `error_report_dedupe` PK `(dedupe_key, window_start)`, RLS deny-all, grants
  `service_role` uniquement ; RPC `claim_error_report` / `release_error_report`
  `SECURITY DEFINER` (EXECUTE révoqué de `PUBLIC`/`anon`/`authenticated`).
- `supabase/functions/report-error/dedupe.ts` : helper pur `dedupeKey()`.
- `index.ts` : ordre = claim atomique **puis** recherche GitHub ; libération de
  la réservation si la création de l'Issue échoue (pas de perte silencieuse).

**Preuve (E2E cloud réel)** — 3 POST identiques en rafale, même signature :

| Appel | Résultat |
|---|---|
| #1 | `{"ok":true,"issueNumber":313}` |
| #2 | `{"ok":true,"deduped":true}` |
| #3 | `{"ok":true,"deduped":true}` |

→ une seule Issue créée (#313). Avant correctif : 2 Issues (#307/#308).

### D2 — Spam de faux positifs perf (signature instable) — **CRITIQUE**

`perfMonitor.ts` construisait le message `Tâche longue détectée (${ms} ms)`. Or
la signature de dédup est calculée sur **type + message + 1ʳᵉ trame** : chaque
durée produisait une signature **distincte**, donc la dédup (client *et*
serveur) ne jouait **jamais**. Résultat mesuré : **89 Issues** « Tâche longue
détectée (120..725 ms) » — autant de tentatives de correction autonome
OpenHands déclenchées pour du bruit, sur le dépôt **public**.

**Correctif** : message **constant** (`LONG_TASK_MESSAGE`,
`SLOW_OPERATION_MESSAGE`) ; la durée reste dans `context.durationMs`.

### D3 — Bruit de développement remonté sur le dépôt public — **MAJEUR**

Les 89 Issues perf et 7 Issues « no such column: kind » provenaient d'un serveur
`vite dev` (localhost) : `environment: development`, `platform: web`, chemins
`node_modules` — du bruit inexploitable pour l'agent autonome.

**Correctif** : garde de transmission `isTransmissionAllowed()` dans
`errorReporter.ts` — la remontée GitHub n'a lieu **que depuis un build de
production** (`import.meta.env.PROD`), avec échappatoire explicite
`VITE_REPORT_ERRORS_IN_DEV=true` pour tester la chaîne. Un rapport bloqué est
**retiré de la file** (pas de réessai infini) mais reste visible localement.

### D4 — Self-update Android : pannes silencieuses — **MAJEUR**

`ApkUpdaterPlugin.canInstall()` appelait
`PackageManager.canRequestPackageInstalls()` **sans garde d'API**. Cette méthode
n'existe qu'à partir de l'**API 26**, or `minSdkVersion` = 21 : sur Android 5–7,
`NoSuchMethodError` → la promesse JS rejetait → `startUpdate()` échouait **avant
tout téléchargement**, sans aucune trace.

**Correctif** : garde `SDK_INT < 26 → true` (le fallback lanceur système gère
lui-même les « sources inconnues ») + `try/catch` avec `Log.e(TAG, …)`.

### D5 — Self-update : échecs avalés côté JS — **MAJEUR**

`updaterStore.startUpdate()` ne remontait aucun échec à l'observabilité : un
téléchargement ou une installation qui échouait laissait l'utilisateur avec un
bouton inerte et **zéro rapport**.

**Correctif** : `reportUpdateFailure(stage, err)` → `reportError(type:
"functional", source: "self-update", context:{stage})` à chaque étape
(`canInstall`, `openInstallSettings`, `download`, `install`) ; nettoyage du
listener de progression dans un `finally` (fin de fuite).

### D6 — Workflow release : `versionName`/`versionCode` jamais pilotés par le tag — **CRITIQUE**

`.github/workflows/release.yml` ne propageait **pas** le tag vers
`android/app/build.gradle` : `versionName` restait figé à la valeur commitée
(`1.2.1`) quel que soit le tag. L'APK publié et la Release portaient donc la
même version que l'app installée → la mise à jour n'était jamais détectée (ou
`compareVersions` restait > 0 en boucle).

**Correctif** : étape « Inject versionName/versionCode from tag » dans le job
`prepare` (avant l'upload de l'artefact `patched-android-src` consommé par
`build-android`) :

- `versionName` ← `${GITHUB_REF_NAME#v}` ;
- `versionCode` ← `MAJ*10000 + MIN*100 + PAT` (strictement croissant, sinon
  Android refuse : `INSTALL_FAILED_VERSION_DOWNGRADE`) ;
- **échec bruyant** (`exit 1`) si le patch n'a pas pris.

## 3. Bug produit confirmé, hors périmètre (Issue canonique #317)

`no such column: kind` (wa-sqlite) sur `/reports` : la table locale PowerSync
`report_definitions` (`src/lib/powersync/schema.ts`) **ne déclare pas la colonne
`kind`**, alors que `src/lib/reporting.ts` l'écrit et la lit. Correctif attendu :
ajouter `kind: column.text` **et** incrémenter la version de schéma PowerSync
(migration client). Analysé dans l'Issue #317 (commentaire de cause racine).

## 4. Nettoyage du dépôt

| Catégorie | Nombre | Action |
|---|---|---|
| Spam perf (« Tâche longue ») | 89 (+12) | fermées `not_planned` |
| Doublons « no such column: kind » | 6 | fermés, #317 conservée canonique |
| Issues de test d'audit (AUDIT QA) | 4 | fermées |
| **Reste ouvert** | **1** | **#317** (vrai bug produit) |

## 5. Gardes de non-régression

`src/lib/__tests__/observability-self-healing-guard.test.ts` (27 tests) verrouille :

- `dedupeKey` (exécutée) : préfixe, repo, stabilité, fail-open si signature vide ;
- ordre **claim atomique avant recherche GitHub** + libération sur échec ;
- migration : PK `(dedupe_key, window_start)`, `ON CONFLICT DO NOTHING`, RLS
  deny-all, EXECUTE réservé `service_role`, rollback réversible ;
- perf : message **sans** durée (interdiction d'interpolation `${…}` + `ms`),
  durée dans `context.durationMs` ;
- transport : `isTransmissionAllowed()` = production, échappatoire dev, drop des
  rapports hors production, pas de réessai infini ;
- self-update : remontée des 4 étapes, aucun `catch {}` vide, listener retiré,
  garde API 26 du plugin natif, permissions du manifeste ;
- release : injection `versionName`/`versionCode` + échec bruyant.

## 6. Preuves exécutées

| Vérification | Résultat |
|---|---|
| Suite unitaire complète | **2297 passés** / 6 ignorés (216 fichiers) |
| `tsc -b` | 0 erreur |
| `eslint` (fichiers modifiés) | 0 erreur |
| Dédup E2E (3 POST identiques) | 1 Issue (#313), puis `deduped:true` |
| Voie **authentifiée** E2E (JWT réel) | Issue #314 créée |
| Issue #313/#314 : titre, corps structuré, label `openhands` | ✅ |
| `yaml-lint` sur `release.yml` | ✅ |
| Inventaires `migration-drift.json` / `rls-inventory.json` | à jour (143 migrations, 48 tables) |

## 7. Recommandations restantes

1. **Corriger #317** (colonne `kind` + bump de schéma PowerSync).
2. **Backlog préventif** : ce bruit a été possible parce que la **signature
   n'était pas contrainte**. Envisager une garde qui interdit les messages
   d'erreur interpolés avec des valeurs variables (durée, id, montant) dans tout
   appel à `reportError`.
3. **Surveillance** : alerter si le nombre d'Issues `openhands` créées/jour
   dépasse un seuil (détecterait une régression de dédup côté serveur).
