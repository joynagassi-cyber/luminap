# 00 — RÉCONCILIATION : contrat des 18 phases ↔ état réel du dépôt

> **But** : éviter de refaire l'audit déjà mené (sessions agent 2026-10-22→24,
> consolidées dans `docs/agent/*`). Ce document mappe **chaque phase du contrat**
> vers : les artefacts déjà existants, ce qui reste réellement à faire, et le
> statut. Il fait office de **Phase 0 (Inventaire)** et de **Phase 1 (Filet de
> sécurité)** pour la partie déjà couverte.
>
> Date : 2026-10-26. Branche : `agent/phase-00-etat`.

## 0.1 Ce qui existait avant la boucle (baseline prouvée)

- **Artefacts d'état** : `docs/agent/{JOURNAL,DECISIONS,RISQUES,PROPOSITIONS,FEATURES,DOMAINE,RUNBOOK,RAPPORT_FINAL}.md`
  (R1→R99 défauts, P1→P41 propositions, D1…D-S9-5 décisions).
- **Baseline chiffrée** (mesurée le 2026-10-26, cf. PROGRESS.md) :
  `tsc -b` = 0 erreur · lint = 0 erreur · vitest = **1114/1114** · build OK.
- **Correctifs prouvés** (extraits de FEATURES/RISQUES) : fuite RLS inter-org
  `is_org_member` (R2) ; policies `USING(true)` grants/tags ; 7 triggers
  notification `is_read` ; escalade invitations R15/R91/R91.b/R91.c ; écran vide
  `FormSubmissions` ; page `/finance` (R87) ; `PowerSyncProvider` non monté (T1) ;
  `slot="input"` sur 61 champs (T5) ; header recouvrant (T6) ; `lumina-user` non
  persisté (T9) ; contexte d'org non réactif (T11) ; hook de lecture « vide
  trompeur » (T12).
- **CI fiabilisée** : job `unit` vitest ajouté ; `tsc -b` réellement bloquant ;
  `.env.local` créé dans tous les jobs.

## 0.2 Cartographie phase par phase

| Phase contrat | Artefacts existants | Reste à faire (périmètre réel) | Statut |
|---|---|---|---|
| **0 — Inventaire** | `docs/audit/RAPPORT-INVENTAIRE-REEL.md`, `docs/audit/*`, FEATURES, DOMAINE | Le présent document + registre de routes consolidé | **fait** (ce doc) |
| **1 — Filet de sécurité** | `ErrorBoundary` **global** (Sentry, `App.tsx`) ; `.github/workflows/backup.yml` ; tag git | `ErrorBoundary` **par route** ; watchdog `app-ready` ; table `client_errors` ; drapeaux de feature ; écran « mise à jour requise » | **partiel** → traité en Phase 2 |
| **2 — Routage / écrans noirs / deep links (P0)** | Registre de routes en 11 sections (`src/ionic/routes/*`, `luminaRoutes`) ; garde `RouteGuard` (2 couches) ; correctifs écran noir T1/T5/T6/T11/T12 ; `AppUrlOpenBridge` (callback OAuth) | `resolveRoute()` ; écrans 404/forbidden ; `data-screen-state` ; `ErrorBoundary` par route ; watchdog ; `ChunkLoadError` ; deep links web + org du lien ; `returnTo` allowlisté ; `client_errors` ; `deeplinks.matrix.json` | **à faire (P0)** |
| **3 — Multi-organisation** | `organizations.parent_org_id` ; vue `org_family` récursive ; `org_descendants` ; migrations `20260910000004`, `20261003000003` ; contexte d'org (`organization-context.ts`, `orgContext.ts`, T11) | Table de fermeture compatible SQLite/PowerSync ; contraintes anti-cycle ; test profondeur ≥20 / largeur ≥100 ; déplacement de sous-arbre atomique | **partiel** |
| **4 — RBAC fin** | `src/lib/rbac.ts` (matrice 14 rôles, `resource:action`) ; `useCanAccessMulti` ; RLS `is_org_member` ; migrations `20260921000001..7` (org_memberships, grants, tags) | Décision unique `has_permission()` DB + miroir TS **mêmes tests** ; portées hiérarchiques ; `deny` prioritaire ; conditions ; résolution R16 (`profiles.role` ↔ `org_memberships.role`) ; `permissions.matrix.json` 5 niveaux | **partiel** |
| **5 — Auth / création d'org / onboarding** | `auth.ts` (singleton) ; `/sessions` (déconnexion douce) ; edge `create_org`, `signup` ; `DashboardOnboarding.tsx`, `onboardingState.ts` ; R93 (create_org inter-tenant corrigé) | États UX auth complets (session expirée en pleine saisie) ; atterrissage déterministe post-création ; onboarding auto-coché sur données réelles ; purge locale au logout | **partiel** |
| **6 — Invitations** | `/invitation/{claim,emit,manage}` ; `invitations`, `invitation_claims`, `settle_invitation_claim` ; R91/R91.b/R91.c/R96 | Jetons hachés + quotas + révocation ; parcours QR/lien de bout en bout ; preuve post-acceptation (membership + sync filtrée + rôle actif) ; anti-énumération | **partiel** |
| **7 — Finance** | `/finance`, `transactions`, `versements`, `cotisations` ; `orgReport.ts`, `OrgReportSend.tsx` ; `docs/audit/MATRICE-CONVERGENCE-VALIDEE.md` | Modèle unique convergé ; contrepassation liée (`reversal_of_id`) + verrouillage de période ; suppression dure interdite ; tests de suppression (0 orphelin) ; rapport annexe→mère de bout en bout ; volumétrie | **partiel** |
| **8 — Isolation & sécurité** | `scripts/rls-isolation-check.sh` ; `cypress/e2e/rls-*.cy.ts` ; R2/R97 | 7 fonctions `SECURITY DEFINER` exécutables par `authenticated` (advisors WARN) ; protection mot de passe compromis désactivée ; tests d'intrusion inter-org automatisés ; entrées hostiles (CSV/XSS) | **partiel** |
| **9 — Sync / hors-ligne** | `powersync/sync-config.yaml` (31 streams) ; `ON_DEMAND_STREAMS` ; R89.a (FK `cat-dime`), R89.b (plafond 1000) | Débloquer R89.a ; corriger R89.b ; expériences de chaos offline ; indicateurs par élément en attente | **partiel** |
| **10 — Design/UX/perf/a11y** | `src/ionic/theme.ts` ; catalogue d'états (T12) ; `responsive-skeleton.cy.ts` | Jetons de design consolidés ; états UX §5.1 sur **chaque** écran ; budgets perf mesurés ; contrôles a11y automatisés | **partiel** |
| **11 — Pre-mortem / chaos / ops** | RUNBOOK ; `keep-alive` ; `backup.yml` ; R98/R99 | `PREMORTEM.md` instancié ; page de santé ; bouton « signaler » ; **activation sauvegardes ✅ (E3/R99 résolues : run planifié `41036453279`, artefact chiffré)** | **partiel** |
| **12 — Cypress** | 29 specs `cypress/e2e/*` | Suite verte + stable (bloqué env. E2E, escalade E2) ; crawler « zéro écran noir » ; couverture 100 % | **partiel / bloqué** |
| **13-17 — Tutoriel, personnalisation, propositions, doc, validation** | `/tutoriel` ; `/settings/personnalisation` ; PROPOSITIONS.md ; RUNBOOK | Tests tutoriel ; héritage mère→annexe testé ; `PROPOSALS.md` (contrat) ; `ARCHITECTURE/SECURITY/TESTING` ; `FINAL_REPORT.md` + GO/NO-GO | **à faire** |

## 0.3 Décisions d'amorçage (ADR)

### Q1 — Magasin d'état unique sous `docs/agent/`
- **Décision** : `git mv docs/agent-session docs/agent` ; les artefacts du contrat
  (`PROGRESS`, `ESCALATIONS`, `PREMORTEM`, `COVERAGE_MATRIX`, `receipts/`,
  matrices) vivent dans le **même** dossier. (R7 : source de vérité unique.)
- **Réversibilité** : renommage git, réversible par `git mv` inverse.
- **Conséquence** : références internes mises à jour (`docs/agent-session` →
  `docs/agent`) dans `.openhands/memory/*` et `docs/agent/JOURNAL.md`.

### Q2 — Gates bloquants = gates réellement déterministes ici
- **Décision** : `tsc -b`, lint, vitest, build sont **bloquants** ; Cypress
  n'est **pas** un gate bloquant local (environnement E2E indisponible, R98/E2).
- **Raison** : R12 (honnêteté) — on ne déclare pas vert ce qu'on ne peut pas
  prouver ; on ne bloque pas sur un gate non mesurable.
- **Conséquence** : ESCALATIONS E2 ; les specs Cypress indépendantes de PowerSync
  restent le signal E2E de repli.

### Q3 — Gates inatteignables → escalades avec repli sûr
- **Décision** : déploiement PowerSync, Cypress vert, sauvegardes automatiques
  deviennent des entrées `ESCALATIONS.md` (E1/E2/E3), jamais des « verts »
  déclarés à tort, jamais bloquants pour les autres tâches.

## 0.4 Ordre d'exécution retenu

```
Phase 0 (ce document)  → GO
Phase 2 (P0 : routage/écrans noirs/deep links)  ← DÉMARRAGE
Phase 3 (multi-org) → Phase 4 (RBAC) → Phase 5-6 (auth/invitations)
Phase 7 (finance) → Phase 8 (red team) → Phase 9 (sync)
Phase 10 (UX) → Phase 11 (pre-mortem) → Phase 12 (Cypress)
Phase 13-17 (tutoriel, doc, validation finale)
```

Le contrat §1.5 fait des **écrans noirs + deep links** la priorité absolue
(phase 2) : c'est le premier chantier réellement absent et il conditionne le
reste (les gardes de routage dépendent des permissions → rejeu après phase 4).
