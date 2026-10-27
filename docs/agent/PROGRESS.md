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
| 5-6 | Auth, création d'org, onboarding, invitations | P1 | **terminé** (partiel : sync E1) | `agent/phase-05-06-auth-invitations` | `phase-05-06/2026-10-26-auth-invitations.md` |
| 5-6 | Preuve post-acceptation (sync filtrée + rôle actif) | P1 | bloqué (E1 : PowerSync non déployé) | — | — |
| 7 | Finance : modèle unique, contrepassation, rapports | P1 | **terminé** (R101/R102 corrigés) | `agent/phase-07-finance` | `phase-07/2026-10-26-finance.md` |
| 8 | Isolation & sécurité (Red Team) | P1 | **terminé** (R103 corrigé, R104 escalade) | `agent/phase-08-isolation` | `phase-08/2026-10-26-isolation.md` |
| 9 | Synchronisation & hors-ligne (PowerSync) — R89.a identifiants catégories | P1 | **terminé** | `agent/phase-09-sync-categories` | `phase-09/2026-10-26-r89a-canonical-categories.md` |
| 9 | Synchronisation — R89.b descente (`PSYNC_S2305`) | P1 | bloqué (déploiement PowerSync Cloud requis) | — | ESCALATIONS E1 |
| 9 | Synchronisation — garde anti-dérive `ON_DEMAND_STREAMS` ↔ `sync-config.yaml` | P1 | **terminé** | `agent/phase-09-streams-guard` | `phase-09/2026-10-26-r89a-canonical-categories.md` (addendum) |

| 11 | Page « État du système » (santé : version, sync, erreurs) | P1 | **terminé** | `agent/phase-11-health` | `phase-11/2026-10-26-health-page.md` |
| 11 | Bouton « Signaler un problème » (diagnostic copiable, sans PII) | P1 | **terminé** | `agent/phase-11-report-problem` | `phase-11/2026-10-26-health-report-problem.md` |
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
