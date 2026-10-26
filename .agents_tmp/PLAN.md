# 1. OBJECTIVE

Rendre opérationnelle la boucle autonome « lumina-autonomous-hardening » sur le dépôt **réel** `joynagassi-cyber/luminap`, en réconciliant le contrat des 18 phases avec l'état déjà très avancé du dépôt (sessions agent du 2026-10-22→24), puis en exécutant les chantiers par ordre de priorité — **en commençant par le P0 déclaré (écrans noirs, deep links)**, qui est aujourd'hui le seul grand chantier réellement absent.

Objectif opérationnel : à tout moment, une tâche atomique doit être (a) choisie par priorité P0>P1>P2>P3, (b) auditée avant modification, (c) prouvée par des *receipts* (commande → code de sortie → extrait), (d) consignée dans un état persistant unique. Le résultat visé est la « définition de terminé » du contrat §1.3, avec les gates réellement atteignables dans cet environnement, et les gates non atteignables ici (Cypress vert, déploiement PowerSync, sauvegardes automatiques) traités comme **escalades** avec repli sûr — jamais comme « vert » déclaré à tort.

Ce plan **ne réécrit pas** l'audit déjà fait : il le reprend comme baseline de la Phase 0.

---

# 2. CONTEXT SUMMARY

## 2.1 Stack et dépôt réels
- **Front** : React 19 + Ionic 9 + TypeScript 5.9, build Vite 8 (SWC), pnpm 11 (forcé).
- **Données** : PowerSync 2 (`@powersync/web` + SQLite local) → Supabase Postgres 17. **App 100 % front-first** (plus de Nitro/server ; cf. `AGENTS.md`). Couche de données : `src/lib/dataLayer.ts` + services `src/lib/*.ts`.
- **Base** : un **seul** projet Supabase — `hhgovvrnalibhgpakswi` (eu-west-2, « Lumina-project »), instance de **développement/test** (0 transaction, 0 document). Pas de projet/branche de dev dédiée → le contrat §2.5 impose alors : sauvegarde préalable + migrations versionnées/réversibles.
- **Dépôt public** → jamais de secret ni d'artefact non chiffré commité.

## 2.2 Ce qui existe déjà (baseline = sessions agent 2026-10-22→24)
- **État** : `docs/agent-session/{JOURNAL,DECISIONS,RISQUES,PROPOSITIONS,FEATURES,DOMAINE,RUNBOOK,RAPPORT_FINAL}.md`. Contient R1→R99 (défauts), P1→P41 (propositions), décisions D1…D-S9-5.
- **Corrigé et prouvé** : fuite RLS inter-org `is_org_member` (R2) ; policies `USING(true)` grants/tags (R2) ; 7 triggers notification `is_read` BOOLEAN (R14) ; escalade invitations R15/R91/R91.b/R91.c ; écran vide `FormSubmissions` ; page `/finance` cassée (R87) ; provider PowerSync jamais monté (T1) ; `slot="input"` (T5, 61 champs) ; header recouvrant (T6) ; `lumina-user` non persisté (T9) ; contexte d'org non réactif (T11).
- **CI fiabilisée** : job `unit` vitest ajouté ; `tsc -b` réellement bloquant ; `.env.local` créé partout.
- **Outils** : `scripts/rls-isolation-check.sh`, `scripts/schema-snapshot.sql`, `scripts/backup-supabase.sh`, `.github/workflows/backup.yml`.

## 2.3 Ce qui manque (par rapport au contrat) — c'est le périmètre réel du plan
- **Artefacts d'état du contrat** : `docs/agent/PROGRESS.md`, `DECISIONS.md`, `PREMORTEM.md`, `COVERAGE_MATRIX.md`, `ESCALATIONS.md`, `PROPOSITIONS.md`, `FINAL_REPORT.md`, `receipts/`, `permissions.matrix.json`, `deeplinks.matrix.json` — **absents**.
- **Robustesse routage** (Phase 2) : pas de `resolveRoute()`, pas de `data-screen-state`, pas d'`ErrorBoundary` par route, pas de watchdog `app-ready`, pas de pages 404 / « accès refusé », pas de gestion `ChunkLoadError`, pas de table `client_errors`.
- **Deep links** : `src/hooks/useAppUrlOpen.ts` ne traite que le callback OAuth natif (`code`) ; pas de routage de liens web, pas de `returnTo` allowlisté, pas de gestion « org dans le lien ».
- **RBAC** (Phase 4) : `src/lib/rbac.ts` = matrice client seule (14 rôles, `resource:action`) ; serveur = `is_org_member` uniquement. Pas de fonction de décision unique DB↔TS, pas de portées hiérarchiques, pas de deny, pas de conditions. Divergence `profiles.role` ↔ `org_memberships.role` (R16) ouverte → viole R7/R8.
- **Isolation** (Phase 8) : advisors live = 7 fonctions `SECURITY DEFINER` exécutables par `authenticated` (WARN), protection mot de passe compromis désactivée (WARN), 2 × `rls_enabled_no_policy` (faux positifs documentés R97).
- **Offline/sync** (Phase 9) : upload cassé (`cat-dime` FK → chaque transaction jetée, R89.a) ; download plafonné à 1000 (`PSYNC_S2305`, R89.b) ; `sync-config.yaml` corrigé mais **non déployé**.
- **Finance** (Phase 7) : modèles concurrents (`caisses`/`accounts`/`groups`), suppression dure possible, pas de verrouillage de période, pas de contrepassation liée garantie.

## 2.4 Contraintes de vérification (mesurées, à ne pas supposer)
- **Fiables** : `npx tsc -b`, `pnpm run lint`, `pnpm exec vitest run` (1114/1114), `pnpm run build`.
- **Non fiables / indisponibles ici** : **Cypress** — la suite n'a **jamais** été verte sur `main` (R98, 10 specs en échec déterministe sur l'environnement E2E) et le binaire n'est pas installable dans l'agent → toute affirmation E2E repose sur la CI. **PowerSync Cloud** — déploiement exige `PS_ADMIN_TOKEN` (absent). **Sauvegardes** — chaîne vérifiée mais `SUPABASE_DB_URL` absent → automatisation inactive.

## 2.5 Contraintes héritées du contrat (NeverBreak) à respecter
Audit avant code (R1) ; phase-gated (R2) ; non-régression par tests de caractérisation (R3) ; cause racine + bugs jumeaux (R4) ; pas d'auto-approbation (R5) ; aucun échec silencieux (R6) ; source de vérité unique (R7) ; défense en profondeur 4 niveaux (R8) ; le canon prime (R9) ; déterminisme des tests (R10) ; réversibilité (R11) ; honnêteté `[Prouvé]/[Probable]/[Non vérifié]` (R12).

---

# 3. APPROACH OVERVIEW

1. **Réconcilier avant de construire.** Traiter les sessions antérieures comme la **Phase 0 déjà faite** ; produire un document de réconciliation « phases du contrat ↔ artefacts existants ↔ reste à faire ». Ne pas refaire l'audit.
2. **Un seul magasin d'état.** [Décision Q1, recommandée] consolider sous `docs/agent/` (déplacement git des fichiers existants + ajout des fichiers du contrat), pour satisfaire R7. Toute exécution ultérieure lit/écrit ce seul magasin.
3. **Exécuter dans l'ordre des phases, mais sauter/requalifier ce qui est déjà fait**, et **démarrer par la Phase 2** (P0 déclaré §1.5 : écrans noirs + deep links), qui est réellement absente et conditionne le reste.
4. **Classifier les gates inatteignables ici comme escalades** [Décision Q3, recommandée] : Cypress-vert, déploiement PowerSync, activation sauvegardes → entrées `ESCALATIONS.md` avec runbook opérateur + repli sûr ; jamais bloquantes pour les autres tâches ; jamais déclarées vertes.
5. **Rigueur de preuve** : une branche `agent/phase-XX-nom` par phase, une PR par lot cohérent, tag git avant merge, `receipts/` par tâche (commande, code de sortie, extrait, SHA, run CI), ADR pour toute décision autonome.
6. **Boucle de cycle** conforme au bloc « LOOP INSTRUCTION » : lire PROGRESS/DECISIONS/ESCALATIONS → choisir la tâche la plus prioritaire → audit + test rouge → correctif + bugs jumeaux → gates par code de sortie → receipts → prochaine tâche.

**Alternatives écartées** : (a) repartir de zéro sur l'audit — rejeté, la baseline existe et est prouvée ; (b) tenter d'abord de réparer l'environnement E2E pour obtenir Cypress vert — rejeté en premier chantier (long, incertain, non bloquant pour les correctifs P0), conservé comme escalade P41.

---

# 4. IMPLEMENTATION STEPS

Chaque étape : **But · Méthode · Référence**. L'ordre est impératif (contrat §4), avec requalification des étapes déjà couvertes.

## Étape 0 — Amorçage de l'état et réconciliation (prérequis à tout)
- **But** : un magasin d'état unique + un document de réconciliation qui évite de refaire la Phase 0.
- **Méthode** : `git mv docs/agent-session docs/agent` (ou index de compat) ; créer les fichiers du contrat manquants (`PROGRESS.md`, `DECISIONS.md` — initialisé depuis les décisions existantes, `PREMORTEM.md`, `COVERAGE_MATRIX.md`, `ESCALATIONS.md`, `PROPOSITIONS.md`, `receipts/`, `permissions.matrix.json`, `deeplinks.matrix.json`) ; créer `docs/agent/00-RECONCILIATION.md` mappant Phase 0→17 → artefacts existants → reste à faire → statut.
- **Référence** : `docs/agent-session/*`, contrat §6 ; branche `agent/phase-00-etat`.

## Étape 1 — PHASE 2 : routage, écrans noirs, deep links (P0 — priorité absolue)
- **But** : zéro écran vide, zéro erreur non gérée, deep links corrects et sûrs.
- **Méthode** (sous-lots, un par PR) :
  1. **Registre de routes unique + `resolveRoute(url, état)`** retournant un ensemble fini (`render`/`redirect(returnTo)`/`needs-auth`/`needs-membership`/`forbidden`/`not-found`/`org-switch-required`/`update-required`/`loading→error`). Brancher sur `src/ionic/routes/*` + `App.tsx`.
  2. **Écrans d'état utiles** : 404 et « accès refusé » ; `data-screen-state` sur chaque écran (contrat §5.1).
  3. **`ErrorBoundary` par route** (le global Sentry existe déjà dans `App.tsx`) + **watchdog de boot** (`data-testid="app-ready"`, timeout → écran de récupération).
  4. **`ChunkLoadError`** : rechargement contrôlé avec message (stratégie SW/cache).
  5. **Deep links** : router les liens web + `appUrlOpen` via **le même** `resolveRoute` ; `returnTo` allowlisté (chemins internes seulement, pas de redirection ouverte) ; **gestion de l'org dans le lien** (changer de contexte avant toute écriture).
  6. **`client_errors`** : capturer `window.onerror`/`unhandledrejection` (route, version, rôle, org, appareil — sans PII) ; table + insert.
  7. **Matrice deep link** écrite **avant** test dans `docs/agent/deeplinks.matrix.json`.
- **Référence** : `src/App.tsx`, `src/ionic/routes/*`, `src/hooks/useAppUrlOpen.ts`, `src/pages/Splash.tsx` ; branche `agent/phase-02-routing`.

## Étape 2 — PHASE 3 : multi-organisation (arbre illimité)
- **But** : arbre mère→annexes→sous-annexes, profondeur/largeur non plafonnées, sans cycle.
- **Méthode** : vérifier l'existant (`parent_org_id`, vue `org_family` récursive, `org_descendants`) ; introduire si besoin une **table de fermeture** (`ancestor/descendant/depth`) compatible SQLite/PowerSync ; contraintes anti-cycle ; archivage (jamais de suppression dure) ; contexte d'org actif explicite (`src/lib/organization-context.ts` + `orgContext.ts`) ; tests profondeur ≥20 / largeur ≥100.
- **Référence** : migrations `20260910000004`, `20261003000003`, `src/lib/orgContext.ts`, `src/lib/organization-context.ts` ; branche `agent/phase-03-multi-org`.

## Étape 3 — PHASE 4 : RBAC fin et extensible
- **But** : une seule fonction de décision, parité DB↔TS, défense en profondeur.
- **Méthode** : registre de permissions `ressource.action` (étendre `src/lib/rbac.ts`) ; rôles système + personnalisés ; affectations `(user, rôle, portée, accordé_par, expiration, révocation)` ; `deny` prioritaire ; une fonction SQL `has_permission(...)` **et** son miroir TS couverts par **les mêmes** tests ; résoudre R16 (source de vérité du rôle) ; invariants (≥1 propriétaire, anti-élévation, journal append-only) ; **matrice `permissions.matrix.json` écrite avant implémentation**, exécutée sur 5 niveaux (SQL, TS, RLS JWT, UI Cypress, contenu synchronisé) ; **rejouer la matrice deep link** ensuite.
- **Référence** : `src/lib/rbac.ts`, `src/hooks/useCanAccessMulti.ts`, migrations RLS ; branche `agent/phase-04-rbac`.

## Étape 4 — PHASE 5 & 6 : auth, création d'org, onboarding, invitations
- **But** : parcours complets + atterrissage déterministe ; invitations (code/QR/lien) prouvées de bout en bout.
- **Méthode** : compléter les états UX auth (session expirée en pleine saisie) ; onboarding dynamique déjà amorcé (`DashboardOnboarding.tsx`, `onboardingState.ts`) — le rendre auto-coché sur données réelles ; purge locale au logout (changement d'utilisateur même appareil sans fuite) ; invitations : jetons hachés, quotas, révocation, rôle pré-attribué ; après acceptation, prouver (membership en base + réplication PowerSync filtrée + écran de réussite + permissions effectives). Réutiliser les acquis R91/R91.b/R91.c.
- **Référence** : `src/lib/auth.ts`, `src/lib/onboardingState.ts`, `src/pages/Invitation*.tsx`, `settle_invitation_claim` ; branche `agent/phase-05-06-auth-invitations`.

## Étape 5 — PHASE 7 : finance (modèle unique, suppression, rapports)
- **But** : une seule vérité financière ; aucune suppression dure d'écriture validée.
- **Méthode** : converger les modèles (`caisses`/`accounts`/`groups`) selon la matrice de convergence (`docs/audit/MATRICE-CONVERGENCE-VALIDEE.md`) ; montants entiers, devise/fuseau explicites, idempotence ; correction par **contrepassation liée** (`reversal_of_id`) + verrouillage de période ; tests de suppression (caisse/événement/membre/annexe avec historique → 0 orphelin, totaux inchangés) ; rapports annexe→mère (PDF, preview, envoi, statut) déjà partiellement présents (`orgReport.ts`, `OrgReportSend.tsx`) ; volumétrie (p95, pagination).
- **Référence** : `src/lib/account.ts`, `versement-service.ts`, `orgReport.ts`, migrations finance ; branche `agent/phase-07-finance`.

## Étape 6 — PHASE 8 : isolation & sécurité (Red Team)
- **But** : 0 fuite, advisors propres.
- **Méthode** : traiter les advisors live — 7 fonctions `SECURITY DEFINER` exécutables par `authenticated` (évaluer `REVOKE EXECUTE` / `SECURITY INVOKER`, conserver `search_path` figé) ; activer la protection mot de passe compromis (config Auth) ; re-confirmer R97 (faux positifs) ; tests d'intrusion inter-org (API/RPC/storage/sync/deep link/IDOR) ; entrées hostiles (XSS, injection formule CSV) ; journal d'audit consultable.
- **Référence** : advisors MCP, `scripts/rls-isolation-check.sh`, `cypress/e2e/rls-*.cy.ts` ; branche `agent/phase-08-redteam`.

## Étape 7 — PHASE 9 : synchronisation & hors-ligne (PowerSync)
- **But** : aucune perte silencieuse ; mutations hors-ligne réconciliées.
- **Méthode** : débloquer **R89** (aligner les identifiants de catégories `cat-dime` ↔ serveur pour 89.a ; corriger le filtre de stream plafonné à 1000 pour 89.b) — 89.b et le déploiement exigent `PS_ADMIN_TOKEN` (**escalade**) ; maintenir la liste `ON_DEMAND_STREAMS` synchronisée avec `sync-config.yaml` ; expériences de chaos (offline long, double écriture, mutation dupliquée, droit révoqué hors-ligne, changement d'utilisateur, base locale pleine/corrompue) avec indicateurs UX par élément en attente.
- **Référence** : `src/lib/powersync/*`, `powersync/sync-config.yaml`, `src/lib/offline/*` ; branche `agent/phase-09-sync`.

## Étape 8 — PHASE 10 : design system, UX, responsive, perf, a11y
- **But** : cohérence visuelle, états UX universels, budgets de perf, WCAG 2.2 AA.
- **Méthode** : jetons de design (déjà amorcés : `src/ionic/theme.ts`, `App.css`) ; appliquer le catalogue d'états §5.1 à chaque écran/zone async ; cibles ≥44 px, anti double-soumission ; matrice de viewports §5.2 ; budgets mesurés après baseline ; contrôles d'accessibilité automatisés.
- **Référence** : `src/components/*`, `src/ionic/theme.ts`, `cypress/e2e/responsive-skeleton.cy.ts` ; branche `agent/phase-10-ux`.

## Étape 9 — PHASE 11 : pre-mortem, chaos, exploitation autonome
- **But** : risques critiques mitigés + exploitation sans humain.
- **Méthode** : instancier `PREMORTEM.md` depuis les graines §5.3 (dont R89, R98, R99 déjà connus) avec priorité P×I×D ; exécuter le catalogue chaos §5.4 ; **page de santé** (version, état base/sync, dernières erreurs) ; bouton « Signaler un problème » ; runbook testé à froid ; **activation sauvegardes** (escalade : secrets `SUPABASE_DB_URL`/`BACKUP_GPG_PASSPHRASE` côté propriétaire) ; documenter mise en pause offre gratuite (`keep_alive` déjà en place).
- **Référence** : `docs/agent/PREMORTEM.md`, `.github/workflows/backup.yml`, `supabase/keep-alive.sql` ; branche `agent/phase-11-premortem`.

## Étape 10 — PHASE 12 : suite Cypress (couverture totale) + crawler
- **But** : suite verte et stable ; couverture 100 % de la matrice.
- **Méthode** : sélecteurs `data-testid` stables (convention `portée.élément`), seeds déterministes, comptes par rôle (`cy.session`), nettoyage systématique des résidus (P39), anti-flaky (pas de `cy.wait`), burn-in. **Crawler « zéro écran noir »** (toutes routes × rôles × viewports, échec si pas de `data-screen-state` valide / erreur non gérée). Le « vert sur `main` » est **bloqué par l'environnement E2E** (R98) → escalade P41 + repli (specs non dépendantes de PowerSync rendues bloquantes).
- **Référence** : `cypress/e2e/*`, `cypress/support/*`, `docs/CYPRESS.md` ; branche `agent/phase-12-cypress`.

## Étape 11 — PHASES 13→17 : tutoriel, personnalisation, propositions, doc, validation finale
- **But** : clôturer le périmètre.
- **Méthode** : Phase 13 tutoriel testé (échec si feature change) ; Phase 14 profil/org (héritage mère→annexe, isolation) ; Phase 15 `PROPOSALS.md` (n'implémenter que robustesse/intégrité) ; Phase 16 `README/ARCHITECTURE/RUNBOOK/SECURITY/TESTING/CHANGELOG` + relecture à froid ; Phase 17 reconstruction depuis zéro + soak test + rejeux (deep link, permissions, intrusion, chaos) + `FINAL_REPORT.md` avec décision GO/NO-GO.
- **Référence** : `docs/agent/*`, `docs/*.md` ; branches `agent/phase-13..17`.

## Continu (à chaque cycle)
Mettre à jour `PROGRESS.md`, `COVERAGE_MATRIX.md` et `receipts/` **dans le même commit** que la tâche ; rechercher les bugs jumeaux ; consigner toute décision en ADR ; toute impasse → 3 tentatives d'approches différentes puis `ESCALATIONS.md` + repli sûr + tâche suivante.

---

# 5. TESTING AND VALIDATION

## 5.1 Gates déterministes (jugés par code de sortie)
- `npx tsc -b` → 0 erreur (⚠️ `npx tsc --noEmit` à la racine ne vérifie rien — `files: []`).
- `pnpm run lint` → 0 erreur ; `pnpm run build` → OK.
- `pnpm exec vitest run` → 1114/1114 (baseline) puis croissant, 0 ignoré.
- **Invariant « zéro écran noir »** : crawler toutes routes × rôles × viewports, sans `data-screen-state` manquant ni erreur non gérée.
- **Sécurité base** : `get_advisors` sans alerte de niveau *erreur* ; requête d'audit prouvant RLS + ≥1 politique par table exposée ; tests d'intrusion inter-org verts.
- **Matrice de permissions** 100 % sur les 5 niveaux (SQL, TS, RLS JWT, UI, contenu synchronisé) ; **matrice deep link** 100 %.
- **Couverture** : chaque ligne de `COVERAGE_MATRIX.md` pointe vers ≥1 test vert.

## 5.2 Receipts (obligatoires)
`docs/agent/receipts/<phase>/<date>-<tâche>.md` : commande, code de sortie, extrait, SHA de commit, lien/ID de run CI, captures/vidéos Cypress en cas d'échec, requêtes SQL d'audit + résultats. Honnêteté `[Prouvé]/[Probable]/[Non vérifié]` (R12).

## 5.3 Gates inatteignables ici → escalades (jamais « vert » déclaré)
- **Cypress vert sur `main`** : bloqué par l'environnement E2E (R98) → `ESCALATIONS.md` (P41) + repli : ne rendre bloquants que les specs indépendantes de PowerSync.
- **Déploiement PowerSync Cloud** : exige `PS_ADMIN_TOKEN` → escalade (R89) + fichier corrigé non déployé, documenté.
- **Sauvegardes automatiques** : exige `SUPABASE_DB_URL`/`BACKUP_GPG_PASSPHRASE` → escalade (R99/P31) + runbook opérateur, chaîne déjà prouvée manuellement.

## 5.4 Ce que « réussi » veut dire
- Chaque tâche : branche dédiée, PR, tag avant merge, receipts, gates par code de sortie, ADR si décision autonome, mise à jour de PROGRESS/COVERAGE_MATRIX.
- Fin de programme (contrat §2.12) : 0 item P0/P1 ouvert, registre pre-mortem sans risque *critique* non mitigé, `FINAL_REPORT.md` + runbook livrés avec receipts, décision GO/NO-GO motivée — **les 3 gates bloqués par l'environnement étant explicitement listés comme escalades ouvertes, pas comme acquis**.

## 5.5 Non-régression
Test de caractérisation avant toute modification de comportement existant (R3) ; après correctif, suite complète verte ; recherche de bugs jumeaux (R4) ; réversibilité (migration + rollback, tag git) (R11).
