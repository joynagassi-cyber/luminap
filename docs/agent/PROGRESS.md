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
| 2 | Capture `onerror`/`unhandledrejection` (PII redactée) | P1 | **terminé** | `agent/phase-02-routing` | `phase-02/2026-10-26-routing.md` |
| 2 | Matrice deep link (`deeplinks.matrix.json`) | P0 | **terminé** | `agent/phase-00-etat` | `phase-00/2026-10-26-etat.md` |
| 2 | `data-screen-state` (catalogue §5.1) + crawler zéro écran noir | P0 | **terminé** | `agent/phase-02-zero-black-screen` | `phase-02/2026-10-26-zero-black-screen.md` |
| 2 | Garde anti-dérive registre ↔ routes montées | P0 | **terminé** | `agent/phase-02-zero-black-screen` | `phase-02/2026-10-26-zero-black-screen.md` |
| 3 | Multi-organisation : anti-cycle + clôture transitive (profondeur/largeur non plafonnées) | P1 | **terminé** | `agent/phase-03-multi-org` | `phase-03/2026-10-26-multi-org.md` |
| 3 | Multi-organisation : table de fermeture matérialisée (perf) | P2 | proposition | — | (cf. PROPOSALS P3-1) |
| 4 | RBAC fin : décision unique DB↔TS (`has_permission`), deny, portées | P1 | **terminé** | `agent/phase-04-rbac` | `phase-04/2026-10-26-rbac.md` |
| 4 | RBAC : R105 — permissions `invitation:*` orphelines réconciliées + garde anti-dérive registre↔matrice | P1 | **terminé** | `agent/r105-route-guard-rbac` | `phase-09/2026-10-26-r105-route-guard-rbac.md` |
| 4 | RBAC : câblage réel de la garde de route (`hasPermission`/`isOrgMember`) | P1 | bloqué (dépend PR18/R16 : réconcilier rôles ADMIN/CENTRAL_ADMIN) | — | R105 |
| 2 | Audit garde de route : R106 (update-required inerte) + R107 (needs-membership inerte) | P1 | **terminé** (documenté ; correctif = PR19) | `agent/r105-route-guard-rbac` | `phase-09/2026-10-26-r105-route-guard-rbac.md` |
| 4 | RBAC fin : réécrire les ~146 politiques RLS sur `has_permission` | P2 | proposition | — | (cf. PROPOSALS PR18) |
| 4 | **RBAC session 11 — contrat d'interface** (grants org-scopés, capacités, hooks, UI, preuve E2E) | P1 | **terminé** | `agent/rbac-contrat` | `phase-04/2026-10-27-rbac-contrat.md` |
| 4 | **RBAC — chantier A : cloisonnement des `grants` par organisation** (fuite inter-org corrigée) | P1 | **terminé** | `agent/rbac-sql-org-scope` (PR #61) | `phase-04/2026-10-27-rbac-org-scope.md` |
| 4 | **RBAC — chantier B : modèle de capacités + hooks + couche d'écriture admin** | P1 | en cours (sous-agent) | `agent/rbac-capabilities` | `phase-04/2026-10-27-rbac-capabilities.md` |
| 4 | **RBAC — chantier C : UI d'admin des accès + bandeau de capacités** | P1 | en cours (sous-agent) | `agent/rbac-ui` | `phase-04/2026-10-27-rbac-ui.md` |
| 4 | **RBAC — chantier D : preuve E2E rôle+org+capacités par les 4 transports** | P1 | en cours (sous-agent) | `agent/rbac-e2e` | `phase-04/2026-10-27-rbac-e2e.md` |
| 5-6 | Auth, création d'org, onboarding, invitations | P1 | **terminé** (partiel : sync E1) | `agent/phase-05-06-auth-invitations` | `phase-05-06/2026-10-26-auth-invitations.md` |
| 5-6 | Preuve post-acceptation (sync filtrée + rôle actif) | P1 | **terminé** (E1 levé) — flux serveur prouvé ; **défaut grave R111 découvert** (FK `auth.users`) | `agent/phase-05-06-post-acceptation` | `phase-05-06/2026-10-27-post-acceptation-proof.md` |
| 5-6 | **Tâche 3 — transports d'invitation** : code `LUM-XXXXXX`, payload QR v2, round-trip `buildQRPayload`→`parseQRPayload`, 4 transports sur un moteur unique | P1 | **terminé** | `agent/task3-qr-transports` | `phase-05-06/2026-10-26-task3-qr-transports.md` |
| 5-6 | **R111 — inscription obligatoire avant le claim** (profil lié à `auth.uid()`, fin de l'UUID aléatoire) + QR lisible en thème clair | P1 | **terminé** | `agent/r111-claim-auth-required` | `phase-05-06/2026-10-26-r111-claim-auth-required.md` |
| 7 | Finance : modèle unique, contrepassation, rapports | P1 | **terminé** (R101/R102 corrigés) | `agent/phase-07-finance` | `phase-07/2026-10-26-finance.md` |
| 8 | Isolation & sécurité (Red Team) | P1 | **terminé** (R103 corrigé, R104 escalade) | `agent/phase-08-isolation` | `phase-08/2026-10-26-isolation.md` |
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
| 7 | Brouillon de saisie longue : perte de données à l'expiration de session (PM7, priorité 36) | P1 | **terminé** | `agent/phase-07-form-draft` | `phase-07/2026-10-26-form-draft.md` |
| 4 | Invariant « ≥1 propriétaire » : une org pouvait perdre son dernier admin (PM5, priorité 24) | P1 | **terminé** | `agent/phase-04-last-org-admin` | `phase-04/2026-10-26-last-org-admin.md` |
| 7 | Suppression d'un membre : le lien financier cascadait (perte de cotisations) (PM8, priorité 20) | P1 | **terminé** | `agent/phase-07-member-deletion` | `phase-07/2026-10-26-member-deletion.md` |
| 4 | RBAC : R109 — rôle `ADMIN` DB-only (compte admin central sans droits) mesuré + garde anti-dérive TS↔DB | P1 | **terminé** (documenté, gardé ; décision propriétaire) | `agent/phase-04-role-model` | `phase-04/2026-10-26-role-model.md` |
| 4 | RBAC : câblage réel de la garde de route (`hasPermission`/`isOrgMember`) | P1 | bloqué (dépend décision R109/R16) | — | R109 |
| 10 | Design system, UX, responsive, perf, a11y | P2 | à faire | `agent/phase-10-ux` | — |
| 11 | Pre-mortem, chaos, exploitation autonome | P2 | à faire | `agent/phase-11-premortem` | — |
| 12 | Suite Cypress (couverture totale) + crawler | P2 | à faire | `agent/phase-12-cypress` | — |
| 13-17 | Tutoriel, personnalisation, propositions, doc, validation finale | P3 | à faire | `agent/phase-13..17` | — |

## Escalades ouvertes (ne bloquent pas la boucle)

| Id | Sujet | Repli appliqué | Détail |
|---|---|---|---|
| E1 | Déploiement PowerSync Cloud (`PS_ADMIN_TOKEN` absent) | fichier `sync-config.yaml` corrigé, non déployé | ESCALATIONS.md |
| E2 | Cypress vert sur `main` (environnement E2E, R98) | specs indépendantes de PowerSync seules bloquantes | ESCALATIONS.md |
| E3 | Sauvegardes automatiques (`SUPABASE_DB_URL` absent) | chaîne prouvée manuellement, runbook opérateur | ESCALATIONS.md |
