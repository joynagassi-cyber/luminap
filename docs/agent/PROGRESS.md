# PROGRESS — boucle « lumina-autonomous-hardening »

> État unique de la boucle. Mis à jour **à chaque cycle**, dans le même commit
> que la tâche. Priorité de sélection : **P0 > P1 > P2 > P3** ; à priorité égale,
> la tâche qui débloque le plus d'autres tâches.
>
> Format : `phase · tâche · priorité · statut · branche/PR · receipt`.
> Statuts : `à faire` · `en cours` · `bloqué` · `terminé`.

## Baseline mesurée (2026-10-26)

| Gate | Commande | Résultat | Preuve |
|---|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | **0 erreur** (exit 0) | receipt `phase-00` |
| Lint | `pnpm run lint` | **0 erreur** (1727 warnings, pré-existants) | receipt `phase-00` |
| Unitaires | `pnpm exec vitest run` | **1114/1114** (68 fichiers) | receipt `phase-00` |
| Build | `pnpm run build` | **OK** (exit 0) | receipt `phase-00` |
| Cypress | CI uniquement | suite **jamais verte** sur `main` (R98) → escalade E2 | ESCALATIONS E2 |

## Tableau des tâches

| Phase | Tâche | Prio | Statut | Branche / PR | Receipt |
|---|---|---|---|---|---|
| 0 | Amorçage de l'état + réconciliation | P0 | **terminé** | `agent/phase-00-etat` | `phase-00/2026-10-26-etat.md` |
| 0 | Tâche 1 — skills QA installés (`cypress-e2e`, `claude-code-qa`, `playwright-e2e`, `supertest-api`) | P2 | **terminé** | `agent/task1-qa-skills` | `phase-00/2026-10-26-task1-qa-skills.md` |
| 2 | Routage : `resolveRoute` + registre unique | P0 | **terminé** | `agent/phase-02-routing` | `phase-02/2026-10-26-routing.md` |
| 2 | Écrans d'état 404 / « accès refusé » / update-required | P0 | **terminé** | `agent/phase-02-routing` | `phase-02/2026-10-26-routing.md` |
| 2 | `ErrorBoundary` par route (déjà via `LazyRoute`) | P0 | **terminé** | (pré-existant) | `phase-02/2026-10-26-routing.md` |
| 2 | Watchdog `app-ready` + écran de récupération | P0 | **terminé** | `agent/phase-02-routing` | `phase-02/2026-10-26-routing.md` |
| 2 | Gestion `ChunkLoadError` (rechargement contrôlé) | P0 | **terminé** | `agent/phase-02-routing` | `phase-02/2026-10-26-routing.md` |
| 2 | Deep links web + `appUrlOpen` via `resolveRoute`, `returnTo` allowlisté | P0 | **terminé** | `agent/phase-02-routing` | `phase-02/2026-10-26-routing.md` |
| 2 | **R125 — lien profond d'invitation** : `/invitation/claim` (route publique) était réécrit en `/dashboard` ; `?code=` d'invitation traité comme code OAuth | P0 | **terminé** | `agent/r125-deeplink-invitation` | `phase-02/2026-10-28-deeplink-invitation.md` |
| 2 | **R126 — `returnTo` du garde de route** calculé mais jamais transmis/consommé : la cible d'un lien profond vers une route protégée était perdue après connexion | P0 | **terminé** | `agent/r125-deeplink-invitation` | `phase-02/2026-10-28-returnto-wiring.md` |
| 2 | **R127 — deep link web d'entrée `?org=B`** : la bascule d'organisation n'était jamais proposée (branche `org-switch-required` atteignable seulement sur mobile) | P0 | **terminé** | `agent/r127-web-entry-org` + `agent/r127b-shared-org-switch` | `phase-02/2026-10-28-web-entry-org-intent.md` |
| 2 | Capture `onerror`/`unhandledrejection` (PII redactée) | P1 | **terminé** | `agent/phase-02-routing` | `phase-02/2026-10-26-routing.md` |
| 2 | Matrice deep link (`deeplinks.matrix.json`) | P0 | **terminé** | `agent/phase-00-etat` | `phase-00/2026-10-26-etat.md` |
| 2 | `data-screen-state` (catalogue §5.1) + crawler zéro écran noir | P0 | **terminé** | `agent/phase-02-zero-black-screen` | `phase-02/2026-10-26-zero-black-screen.md` |
| 2 | Garde anti-dérive registre ↔ routes montées | P0 | **terminé** | `agent/phase-02-zero-black-screen` | `phase-02/2026-10-26-zero-black-screen.md` |
| 3 | Multi-organisation : anti-cycle + clôture transitive (profondeur/largeur non plafonnées) | P1 | **terminé** | `agent/phase-03-multi-org` | `phase-03/2026-10-26-multi-org.md` |
| 3 | Multi-organisation : table de fermeture matérialisée (perf) | P2 | proposition | — | (cf. PROPOSALS P3-1) |
| 3 | Re-parentage : impossible de déplacer une org sous une annexe (profondeur plafonnée à 1 via l'UI) | P2 | **terminé** (R122 : `reparentTargets` aligné sur la création + anti-cycle) | `agent/r122-reparent-depth` | `phase-03/2026-10-28-reparent-depth.md` |
| 4 | RBAC fin : décision unique DB↔TS (`has_permission`), deny, portées | P1 | **terminé** | `agent/phase-04-rbac` | `phase-04/2026-10-26-rbac.md` |
| 4 | RBAC : R105 — permissions `invitation:*` orphelines réconciliées + garde anti-dérive registre↔matrice | P1 | **terminé** | `agent/r105-route-guard-rbac` | `phase-09/2026-10-26-r105-route-guard-rbac.md` |
| 4 | RBAC : câblage réel de la garde de route (`isOrgMember`) | P1 | **terminé** (R107 : `useOrgMembership` fail-open + exemption `/onboarding`/`/org-setup`) | `agent/phase-4-needs-membership` | `phase-04/2026-10-28-needs-membership-wiring.md` |
| 2 | Écran « Organisation non rejointe » : cul-de-sac (bouton mort → `/dashboard` bloqué) | P1 | **terminé** (R120 : échappatoire = déconnexion, garde anti-dérive) | `agent/phase-4-needs-membership` | `phase-04/2026-10-28-needs-membership-escape.md` |
| 4 | RBAC : câblage réel de la garde de route (`hasPermission`) | P1 | bloqué (dépend PR18/R16 : réconcilier rôles ADMIN/CENTRAL_ADMIN) | — | R105 |
| 2 | Audit garde de route : R106 (update-required inerte) + R107 (needs-membership inerte) | P1 | **terminé** (documenté ; correctif = PR19) | `agent/r105-route-guard-rbac` | `phase-09/2026-10-26-r105-route-guard-rbac.md` |
| 4 | RBAC fin : réécrire les ~146 politiques RLS sur `has_permission` | P2 | proposition | — | (cf. PROPOSALS PR18) |
| 4 | Cycle de vie : organisation ARCHIVED = cul-de-sac (aucune action) + métadonnées d'archivage non nettoyées à la restauration | P1 | **terminé** (R123 : bouton « Restaurer » + nettoyage `archived_*`) | `agent/r123-org-archive-restore` | `phase-04/2026-10-28-org-archive-restore.md` |
| 4 | **RBAC session 11 — contrat d'interface** (grants org-scopés, capacités, hooks, UI, preuve E2E) | P1 | **terminé** | `agent/rbac-contrat` | `phase-04/2026-10-27-rbac-contrat.md` |
| 4 | **RBAC — chantier A : cloisonnement des `grants` par organisation** (fuite inter-org corrigée) | P1 | **terminé** | `agent/rbac-sql-org-scope` (PR #61) | `phase-04/2026-10-27-rbac-org-scope.md` |
| 4 | **RBAC — chantier B : modèle de capacités + hooks + couche d'écriture admin** | P1 | **terminé** | `agent/rbac-capabilities` (PR #64) | `phase-04/2026-10-27-rbac-capabilities.md` |
| 4 | **RBAC — chantier C : UI d'admin des accès + bandeau de capacités** | P1 | **terminé** | `agent/rbac-ui` (PR #66) | `phase-04/2026-10-27-rbac-ui.md` |
| 4 | **RBAC — chantier D : preuve E2E rôle+org+capacités par les 4 transports** | P1 | **terminé** | `agent/rbac-e2e` (PR #63) | `phase-04/2026-10-27-rbac-e2e.md` |
| 5-6 | Auth, création d'org, onboarding, invitations | P1 | **terminé** (partiel : sync E1) | `agent/phase-05-06-auth-invitations` | `phase-05-06/2026-10-26-auth-invitations.md` |
| 5-6 | Preuve post-acceptation (sync filtrée + rôle actif) | P1 | **terminé** (E1 levé) — flux serveur prouvé ; **défaut grave R111 découvert** (FK `auth.users`) | `agent/phase-05-06-post-acceptation` | `phase-05-06/2026-10-27-post-acceptation-proof.md` |
| 5-6 | **Tâche 3 — transports d'invitation** : code `LUM-XXXXXX`, payload QR v2, round-trip `buildQRPayload`→`parseQRPayload`, 4 transports sur un moteur unique | P1 | **terminé** | `agent/task3-qr-transports` | `phase-05-06/2026-10-26-task3-qr-transports.md` |
| 5-6 | **R111 — inscription obligatoire avant le claim** (profil lié à `auth.uid()`, fin de l'UUID aléatoire) + QR lisible en thème clair | P1 | **terminé** | `agent/r111-claim-auth-required` | `phase-05-06/2026-10-26-r111-claim-auth-required.md` |
| 7 | Finance : modèle unique, contrepassation, rapports | P1 | **terminé** (R101/R102 corrigés) | `agent/phase-07-finance` | `phase-07/2026-10-26-finance.md` |
| 8 | Isolation & sécurité (Red Team) | P1 | **terminé** (R103 corrigé, R104 escalade) | `agent/phase-08-isolation` | `phase-08/2026-10-26-isolation.md` |
| 8 | Entrées hostiles (XSS/contrôle/CSV) + intrusion inter-org côté client | P1 | **terminé** | `agent/phase-08-hostile-input` | `phase-08/2026-10-27-hostile-input-redteam.md` |
| 9 | Synchronisation & hors-ligne (PowerSync) — R89.a identifiants catégories | P1 | **terminé** | `agent/phase-09-sync-categories` | `phase-09/2026-10-26-r89a-canonical-categories.md` |
| 9 | Synchronisation — R89.b descente (`PSYNC_S2305`) : dénormalisation `org_id` + streams à clé directe | P1 | **terminé** | `agent/phase-09-r89b-denormalize-org-id` | `phase-09/2026-10-27-r89b-denormalize-org-id.md` |
| 9 | R110 — `notify_budget_exceeded` : colonnes inexistantes sur `budget_lines` (toute création de ligne budgétaire échouait) | P1 | **terminé** | `agent/phase-09-r89b-denormalize-org-id` | `phase-09/2026-10-27-r89b-denormalize-org-id.md` |
| 12 | Sauvegarde Supabase chiffrée + vérifiée, workflow passé en **hebdomadaire** (P31/E3) | P1 | **terminé** (activation secrets = propriétaire) | `agent/phase-09-r89b-denormalize-org-id` | `phase-09/2026-10-27-backup-weekly-verified.md` |
| 9 | Synchronisation — garde anti-dérive `ON_DEMAND_STREAMS` ↔ `sync-config.yaml` | P1 | **terminé** | `agent/phase-09-streams-guard` | `phase-09/2026-10-26-r89a-canonical-categories.md` (addendum) |

| 11 | Page « État du système » (santé : version, sync, erreurs) | P1 | **terminé** | `agent/phase-11-health` | `phase-11/2026-10-26-health-page.md` |
| 11 | Bouton « Signaler un problème » (diagnostic copiable, sans PII) | P1 | **terminé** | `agent/phase-11-report-problem` | `phase-11/2026-10-26-health-report-problem.md` |
| 8 | Garde d'inventaire RLS (RLS + ≥1 politique par table, exécutable en CI) | P1 | **terminé** | `agent/phase-08-rls-inventory-guard` | `phase-08/2026-10-26-rls-inventory-guard.md` |
| 2 | R108 — watchdog de démarrage armé hors React (surcouche de récupération) | P1 | **terminé** | `agent/phase-02-boot-watchdog` | `phase-02/2026-10-26-boot-watchdog.md` |
| 2 | Garde de couverture du crawler « zéro écran noir » (ROUTES ≡ ROUTE_REGISTRY) | P1 | **terminé** | `agent/phase-02-crawler-coverage` | `phase-02/2026-10-26-crawler-coverage.md` |
| 10 | Anti double-soumission des actions financières (`useSubmitGuard` + `disabled`) | P2 | **terminé** | `agent/phase-10-ux` | `phase-10/2026-10-26-double-submit.md` |
| 10 | R73 — hygiène du dépôt : artefacts générés suivis (graphify-out 59 Mo + rapports bundle + `test_ps.db`) retirés du suivi | P3 | **terminé** | `agent/r73-repo-hygiene` | `phase-10/2026-10-26-r73-repo-hygiene.md` |
| 9 | Erreur de synchronisation VISIBLE (PM19 : `uploadError`/`downloadError` → pill « échec d'envoi ») | P2 | **terminé** | `agent/phase-09-sync-error-visible` | `phase-09/2026-10-26-sync-error-visible.md` |
| 5 | Purge des données locales au changement de compte (PM18 : fuite inter-comptes sur appareil partagé) | P2 | **terminé** | `agent/phase-05-local-purge` | `phase-05/2026-10-26-local-purge.md` |
| 2 | Deep link inter-organisation : `org-switch-required` était mort (PM2, priorité 45) | P0 | **terminé** | `agent/phase-02-org-switch-deeplink` | `phase-02/2026-10-26-org-switch-deeplink.md` |
| 2 | **R113 — « l'app ne monte pas » : `RouteGuard` violait les Rules of Hooks (hook après `return` précoce) → ErrorBoundary remplaçait toute l'app** | **P0** | **terminé** | `agent/p0-hooks-routeguard` | `phase-02/2026-10-27-p0-hooks-routeguard.md` |
| 7 | Brouillon de saisie longue : perte de données à l'expiration de session (PM7, priorité 36) | P1 | **terminé** | `agent/phase-07-form-draft` | `phase-07/2026-10-26-form-draft.md` |
| 4 | Invariant « ≥1 propriétaire » : une org pouvait perdre son dernier admin (PM5, priorité 24) | P1 | **terminé** | `agent/phase-04-last-org-admin` | `phase-04/2026-10-26-last-org-admin.md` |
| 7 | Suppression d'un membre : le lien financier cascadait (perte de cotisations) (PM8, priorité 20) | P1 | **terminé** | `agent/phase-07-member-deletion` | `phase-07/2026-10-26-member-deletion.md` |
| 4 | RBAC : R109 — rôle `ADMIN` DB-only (compte admin central sans droits) mesuré + garde anti-dérive TS↔DB | P1 | **terminé** (documenté, gardé ; décision propriétaire) | `agent/phase-04-role-model` | `phase-04/2026-10-26-role-model.md` |
| 4 | RBAC : câblage réel de la garde de route (`hasPermission`) | P1 | bloqué (dépend décision R109/R16 : rôle ADMIN) | — | R109 |
| 4 | **R128 — cache d'accès aux capacités jamais invalidé après mutation de grants/rôles** (capacités admin inopérantes jusqu'au rechargement) | P1 | **terminé** | `agent/r128-access-cache-invalidation` | `phase-04/2026-10-28-access-cache-invalidation.md` |
| 10 | Design system, UX, responsive, perf, a11y | P2 | **terminé** (a11y/UX/perf ✓ ; jetons design gardés R117 ✓ ; responsive : 4 pages bornées + garde statique R119 ✓) | `agent/phase-10-responsive` | `phase-10/2026-10-28-responsive-containment.md` |
| 10 | A11y automatisée (6 écrans + modale `/forms`) + états UX §5.1 sur les 62 écrans montés (garde d'inventaire) + budgets de perf verrouillés (1er rendu / entrée / total) | P2 | **terminé** | `agent/phase-10-a11y-ux` | `phase-10/2026-10-27-a11y-ux-budgets.md` |
| 11 | Pre-mortem, chaos, exploitation autonome | P2 | **terminé** (chaos de stockage + hors-ligne ; exploitation autonome : page santé + drapeaux PR7/R118) | `agent/phase-11-premortem` | `phase-11/2026-10-28-chaos-offline-resilience.md` |
| 11 | **Drapeaux de fonctionnalités (kill switches, PR7/R118)** : module fail-open `featureFlags.ts` (surcharge locale + `VITE_FLAGS`), câblé sur `initOneSignal` ; garde anti « filet déclaré, jamais câblé » | P1 | **terminé** | `agent/phase-11-feature-flags` | `phase-11/2026-10-28-feature-flags.md` |
| 11 | **R106 + PM15 — capacités de résilience déclarées mais INERTES** (update-required non alimenté ; récupération locale non câblée) | P1 | **terminé** | `agent/phase-11-resilience` | `phase-11/2026-10-27-inert-resilience-capabilities.md` |
| 11 | **Chaos — résilience du boot à un stockage indisponible** (`applyStoredTheme`/`applyStoredThemeMode`/`selectRole` levaient avant le montage React = écran noir) | P2 | **terminé** | `agent/phase-11-boot-storage-resilience` | `phase-11/2026-10-27-boot-storage-resilience.md` |
| 11 | **Chaos — volet LECTURE du stockage** (`getStoredThemeId`/`getStoredThemeMode` levaient au boot ; `JSON.parse` de boot audités) | P2 | **terminé** | `agent/phase-11-boot-storage-read` | `phase-11/2026-10-27-boot-storage-read.md` |
| 11 | **Runbook testé à froid** (2 défauts trouvés : `npm ci` échoue → pnpm ; invariant jsonb = 88 au lieu de 0) | P2 | **terminé** | `agent/phase-11-runbook-cold-test` | `phase-11/2026-10-27-runbook-cold-test.md` |
| 11 | **R114 — CI Pipeline rouge sur `main`** (test importait `node:sqlite`, Node 24-only ; CI = Node 22) → résolution runtime `getBuiltinModule` ; suite **1452/1452 sous Node 22** | P0 | **terminé** | `agent/phase-11-ci-node22-sqlite` | `phase-11/2026-10-27-ci-node22-sqlite.md` |
| 11 | **Correctif R65 (rechute)** — `audit_entries.before_state` = chaîne `"null"` (88 lignes) ; writer `serializeAuditState` + migration rattrapage `20261027000012` ; invariant jsonb **0 partout** | P1 | **terminé** | `agent/phase-11-jsonb-null-literal` | `phase-11/2026-10-27-jsonb-null-literal.md` |
| 11 | **R88 — erreurs avalées** (`.catch()` vides → états vides silencieux) : `captureClientError` (capture des erreurs **gérées**, tampon santé) + 11 sites de chargement instrumentés + état d'erreur/réessai `LoadErrorBlock` sur `Finance` | P1 | **terminé** | `agent/phase-11-r88-swallowed-errors` | `phase-11/2026-10-27-r88-swallowed-errors.md` |
| 11 | **R84 — suite Cypress non typecheckée en CI** : `tsconfig.json` référence `cypress/tsconfig.json` (`target ES2020`, `composite`, **`noEmit`**) ; 11 erreurs de type préexistantes corrigées → `tsc -b --noEmit` couvre désormais Cypress (0 erreur) | P2 | **terminé** | `agent/phase-11-r84-cypress-typecheck` | `phase-11/2026-10-28-r84-cypress-typecheck.md` |
| 11 | **R52.b/R52.c/R52.d — « en cours de lecture » présenté comme « vide »** : `/giving` (4 onglets), `/budgets` affichaient « Aucune campagne »/« Aucun donateur » pendant le chargement ; `/membre/:id` « Membre introuvable » ; `/membres/en-avance` « Aucun membre en avance » + total 0. Quatre squelettes (`ListSkeleton` (×2), `MembreDetailSkeleton`, `MembresEnAvanceSkeleton`) étaient **déclarés mais jamais câblés**. Correctif : `ListArea` (`/giving`), `ListSkeleton` (`/budgets`) + garde `isPowerSyncReadyNow()` (motif éprouvé d'`EventDetail`) ; 8 tests à double sens, non-vacuité vérifiée | P2 | **terminé** | `agent/r52-list-loading-vs-empty` | `phase-11/2026-10-28-r52-list-loading-vs-empty.md` |
| 11 | **R61/P35 — titres de page sémantiques** : `<h1 className="sr-only">` par branche sur les **24** pages montées sans titre (a11y WCAG 2.4.1) + 3e invariant de `screen-states-guard` (0 écran monté sans `<h1>`) | P2 | **terminé** | `agent/phase-11-r61-page-titles` | `phase-11/2026-10-28-r61-page-titles.md` |
| 11 | **Banc a11y rendu étendu** (6 → 8 écrans : `/help`, `/notifications`) — invariants `data-screen-state`/`<h1>`/labels/`alt` vérifiés à l'exécution | P2 | **terminé** | `agent/phase-11-a11y-screens-coverage` | `phase-11/2026-10-28-a11y-screens-coverage.md` |
| 11 | **R65.b — garde d'inventaire jsonb** : `jsonb-inventory.test.ts` relève les colonnes `jsonb` des migrations et échoue si `JSONB_COLUMNS` en manque une ; **dérive réelle corrigée** (`custom_field_values.value`) | P2 | **terminé** | `agent/phase-11-r65b-jsonb-inventory` | `phase-11/2026-10-28-r65b-jsonb-inventory.md` |
| 8 | **R115 — surface RPC des fonctions de trigger** : le durcissement R103 était **contourné** (2 migrations ultérieures) ; garde `pg_trigger_depth()` restaurée + balayage générique rejoué → 0 fonction de trigger exposée ; garde d'**ordre** `revoke-trigger-functions.test.ts` | P1 | **terminé** | `agent/phase-08-r115-trigger-rpc-surface` | `phase-08/2026-10-28-r115-trigger-rpc-surface.md` |
| 12 | **Garde anti-dérive `COVERAGE_MATRIX` ↔ tests réels** : chaque référence `V:`/`C:`/`SQL:` doit pointer vers un fichier existant (couverture déclarée ≠ fictive) ; 2 dérives réelles corrigées (`useCanAccessMulti`, `parseDeepLink`) | P2 | **terminé** | `agent/phase-12-coverage-guard` | `phase-12/2026-10-28-coverage-matrix-guard.md` |
| 17 | **R116 — garde de budget de perf muette en CI** : le job `unit` ne construisait pas `dist/` → les 6 tests `perf-budget` étaient **ignorés** (skipped = verts). Correctif : étape `build` avant `vitest run` + échec explicite sous `CI` si l'artefact manque | P1 | **terminé** | `agent/phase-17-perf-guard-ci` | `phase-17/2026-10-28-perf-guard-muet.md` |
| 11 | **R124 — état du self-updater NON partagé** : `UpdateDialog` lisait un état isolé (`useState` local) → « Mettre à jour » inerte et « Plus tard » mort | P1 | **terminé** (store global + `dismiss()` + montage unique) | `agent/r124-updater-shared-state` | `phase-11/2026-10-28-updater-shared-state.md` |
| 12 | Suite Cypress (couverture totale) + crawler | P2 | à faire | `agent/phase-12-cypress` | — |
| 13-17 | Tutoriel, personnalisation, propositions, doc, validation finale | P3 | **13 ✓ 14 ✓ 16 ✓ 17 ✓** ; reste : propositions (15) | `agent/phase-13..17` | — |
| 15 | Polish produit : messages d'erreur restés en CHINOIS dans le flux finance (Versement, TransactionEdit) | P2 | **terminé** (R121 : traduction + garde anti-CJK) | `agent/r121-cjk-error-strings` | `phase-15/2026-10-28-cjk-error-strings.md` |
| 17 | **Rapport final + verdict GO/NO-GO** : gates déterministes verts (tsc=0, 0 erreur lint, 1518/1518 vitest, build OK) ; **GO conditionnel** ; **NO-GO production** tant que B1 (sauvegarde non activée), B2 (R109 `ADMIN` non tranché) et B3 (Cypress rouge, env. E2E) ne sont pas levés | P3 | **terminé** | `agent/phase-17-final-report` | `phase-17/2026-10-28-final-report.md` |
| 13 | **Tutoriel — tests anti-régression** : `Tutorial.test.tsx` verrouille les sections et la non-vacuité (échec si une section disparaît) | P3 | **terminé** | `agent/phase-13-tutorial-tests` | `phase-13/2026-10-28-tutorial-tests.md` |
| 14 | **Personnalisation — persistance/isolation des préférences + héritage mère→annexe** : `SettingsPersonalisation-inheritance.test.tsx` (10) — chemins réels + 4 défauts réels **caractérisés** (R3 : clés globales non scopées, aucune héritage de config) | P3 | **terminé** | `agent/phase-14-personalisation` | `phase-14/2026-10-28-personalisation-inheritance.md` |
| 16 | Documentation technique (ARCHITECTURE/SECURITY/TESTING) | P3 | **terminé** | `agent/phase-16-docs-techniques` | `phase-16/2026-10-28-docs-techniques.md` |

## Escalades ouvertes (ne bloquent pas la boucle)

| Id | Sujet | Repli appliqué | Détail |
|---|---|---|---|
| E2 | Cypress vert sur `main` (environnement E2E, R98) | specs indépendantes de PowerSync seules bloquantes | ESCALATIONS.md |
| E3 | Sauvegardes automatiques (`SUPABASE_DB_URL` absent) | chaîne prouvée manuellement, runbook opérateur | ESCALATIONS.md |
| E4 | Parcours « réclamer une invitation » (FK `auth.users`, R111) | aucun code modifié (décision d'architecture) ; documenté | ESCALATIONS.md |

> E1 (déploiement `sync-config` PowerSync) est **RÉSOLU** depuis le 2026-10-27
> (jeton admin disponible, déploiement validé, sync `org-e2e` = 6709 événements).
