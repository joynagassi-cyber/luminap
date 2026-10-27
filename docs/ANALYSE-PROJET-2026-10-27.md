# Analyse du projet — Lumina

> Audit de lecture (code + docs + historique + CI) réalisé le **2026-10-27**
> sur la branche `arena/15c52a8a-luminap` (base : `e3ee80f`, `main` = `cb36928`).
> Aucune modification de code : document de synthèse et de priorisation.

---

## 1. Verdict en une phrase

**Lumina est une plateforme offline-first ambitieuse, bien documentée et
disciplinée (gates, receipts, mémoire d'agent), dont le cœur métier et la
synchronisation viennent d'être stabilisés — mais il reste un parcours
utilisateur critique inopérant (R111, invitation/claim), une dette de
gouvernance des données (migrations non traçables, aucune sauvegarde
automatique active) et un dépôt alourdi par des artefacts générés versionnés.**

---

## 2. Ce qu'est le produit

| Élément | Valeur mesurée |
|---|---|
| Produit | Plateforme **financière + associative** offline-first (églises, écoles, ONG) |
| Cible | Web **et** Android (Capacitor, `com.lumina.mfejc`) |
| Version publiée | **v1.0.9** (2026-10-19, `versionCode 10`) — 6 releases en 1 journée |
| Domaines couverts | Trésorerie (caisses, transactions, versements, budgets), groupes & adhésions, événements/tâches, rapports inter-org, formulaires dynamiques, cotisations, dons, invitations (code/QR), notifications, RBAC 14 rôles, multi-organisation récursive |
| Backend | Supabase (PostgreSQL + RLS + Auth + Storage + 4 Edge Functions) |
| Sync | PowerSync Cloud, **édition 3**, ~32 streams, filtrage par organisation |
| Modèle | Offline-first : écriture locale (SQLite/WASM, repli IndexedDB) → upload |

## 3. Stack technique

- **React 19.2 + TypeScript 5.9 + Vite 8 (rolldown, SWC)** — très en avance de phase.
- **Ionic React 9** (mode iOS, split-pane) + **shadcn/ui + Radix + Tailwind 3.4**.
- **Capacitor 6.2** (core/android) mais **CLI 8.5.2** → désalignement connu (R90, échec pré-existant du job « Build Debug APK »).
- **PowerSync Web 2.x** + `@powersync/react`.
- **Zustand** (état local/thème) + **React Query 5** (état serveur) + React Hook Form/Zod.
- **Nitro/h3** présent mais **désactivé** tant qu'aucune route serveur n'existe (garde `hasNitroRoutesOnDisk()` dans `vite.config.ts`) — bonne décision documentée.
- Docs/export : `pdfjs-dist`, `react-pdf`, `docx`, `jspdf`, **`xlsx@0.18.5`**.
- Observabilité : Sentry (source maps « hidden » puis supprimées après upload — correct).
- Tests : Vitest (1279 tests verts au dernier relevé), Cypress (30 specs), Playwright (2 configs), Maestro (mobile), magnitude.
- Paquet : **pnpm 11** imposé — mais `package-lock.json` (npm, 520 Ko) est **aussi** versionné.

## 4. Taille et forme du code

| Métrique | Valeur |
|---|---|
| Fichiers `src/` | 378 (188 `.tsx`, 187 `.ts`) |
| Lignes `src/` | **89 340** |
| Pages | 62 fichiers dans `src/pages` |
| Migrations SQL | **122** fichiers + dossier `rollback/` |
| Tests unitaires | 92 fichiers `*.test.ts(x)` (28 rien que dans `capabilities/__tests__`, 10 287 lignes) |
| Specs Cypress | 30 |
| Occurrences `: any` / `as any` | **1 084** |
| `TODO` / `FIXME` / `HACK` | **0** |
| `console.log` | **0** |
| `@ts-ignore` / `eslint-disable` | 14 |

Points de concentration (dette de modularité) :

- `src/lib/dataLayer.ts` — **3 844 lignes** : objet dieu de la couche données (PowerSync + IndexedDB + toutes les requêtes métier). C'est le principal point de fragilité structurelle.
- `src/pages/Tutorial.tsx` (1 637), `src/lib/auth.ts` (1 222), `Dashboard.tsx` (1 056), `EventDetail.tsx` (1 056), `GroupDetail.tsx` (951), `Onboarding.tsx` (926), `CentralAdmin.tsx` (898).
- `src/lib/` contient **46 modules** mêlant services (`*-service.ts`), logique pure (`rbac.ts`, `orgTree.ts`, `routeResolver.ts`) et utilitaires — la frontière avec `src/capabilities/` (censée être la logique métier pure) est poreuse : les capabilities sont fines (84 à 623 lignes) alors que la vraie logique est souvent dans `lib/`.

## 5. Architecture — ce qui est solide

1. **Décision de routage unique** : `src/lib/routeResolver.ts` (`resolveRoute(url, état)` → ensemble fini d'issues) + registre de 63 routes **en données**, avec garde anti-dérive registre ↔ routes montées et `isAllowedReturnTo` (anti redirection ouverte). C'est le bon motif : la navigation devient testable sans DOM.
2. **Défense en profondeur au démarrage** : watchdog armé **avant** `createRoot`, capture `onerror`/`unhandledrejection` avec redaction PII, rechargement contrôlé sur `ChunkLoadError`, `ErrorBoundary` par route lazy, attributs `data-screen-state` + crawler « zéro écran noir ». Rare à ce niveau de complétude.
3. **Sécurité base de données** : RLS sur toutes les tables, fonction `has_permission()` comme décision unique DB↔TS (Phase 4), inventaire RLS exécutable en CI, garde « ≥ 1 propriétaire » (une org ne peut plus devenir orpheline), anti-cycle sur l'arbre d'organisations, révocation des EXECUTE sur les fonctions de trigger.
4. **Synchronisation** : la leçon R89.b a été traitée à la racine — **dénormalisation de `org_id`** sur 4 tables enfants + triggers de cohérence + streams à filtre direct (1 bucket / org), au lieu de JOIN qui généraient 1 bucket par ligne enfant (`PSYNC_S2305`). Preuve de bout en bout : 6 709 événements synchronisés sur le profil le plus volumineux.
5. **Hygiène d'agent exemplaire** : `docs/agent/` (PROGRESS, ESCALATIONS, PREMORTEM, COVERAGE_MATRIX, receipts horodatés) + `.openhands/memory/` avec **hypothèses réfutées par mesure** (ex. « la parallélisation CI cause le rouge Cypress » → réfutée en mono-conteneur). Cette traçabilité est un actif, pas de la bureaucratie.
6. **Intégrité financière** : calculs en centimes (pas de flottant), contrepassation plutôt que suppression, garde sur la suppression de transactions approuvées, anti double-soumission (`useSubmitGuard`).

## 6. Risques ouverts — priorisés

`docs/agent/RISQUES.md` contient **113 entrées** ; ~18 sont marquées **OUVERT**.

### P0 — bloquant produit

| # | Risque | Impact | État |
|---|---|---|---|
| **R111** | Le parcours **« réclamer une invitation » ne peut pas aboutir** : `claimInvitation` crée un profil PENDING avec un **UUID aléatoire**, alors que `profiles.id → auth.users(id)` et `org_memberships.user_id → auth.users(id)` sont des FK **non deferrables**. Le « bridge auth » prévu n'a jamais été implémenté. | L'écran affiche « bienvenue », **rien n'arrive en base** → impasse silencieuse du parcours d'adhésion. Preuve : `invitation_claims = 0` en données réelles. | **Ouvert, escaladé E4** — arbitrage propriétaire requis : (a) sign-up Auth avant le profil PENDING, ou (b) retirer la FK (perte d'intégrité). **(a) est le bon choix.** |
| **R18** | **Aucune sauvegarde ni PITR** sur le projet Supabase (plan gratuit : `backups: []`, `pitr_enabled: false`). | Perte de données irréversible. La chaîne de sauvegarde chiffrée **est prouvée** (schéma + 76 tables, SHA-256, AES256 déchiffrable) mais le workflow hebdomadaire **ne publie rien** tant que `SUPABASE_DB_URL` et `BACKUP_GPG_PASSPHRASE` ne sont pas créés. | **Ouvert — action propriétaire en 5 minutes.** |
| **R59** | Écran noir : la page entrante reste à `opacity: 0` après navigation depuis une liste. | Gravité haute, UX. | Ouvert. |

### P1 — intégrité et cohérence

| # | Risque | Pourquoi c'est sérieux |
|---|---|---|
| **R17** | **Dérive migrations ↔ base** : 39 versions enregistrées en base sans fichier correspondant ; 34 migrations du dépôt jamais enregistrées. | `supabase db push` **rejouerait** du DDL déjà présent → erreurs, voire altérations. Les fichiers du dépôt **ne sont pas la source de vérité**. À régulariser (`supabase migration repair --status applied`) avant toute reprise de migrations en équipe. |
| **R109** | Le rôle **`ADMIN`** existe dans les **données et les politiques RLS** mais **pas dans le modèle TS** → un compte admin central **sans droits** côté client. | Deux modèles de rôles qui divergent ; bloque aussi PR19 (câblage réel de la garde de route). |
| **R16 / R62** | Deux sources de vérité pour le rôle (`profiles.role` ↔ `org_memberships.role`), non synchronisées structurellement (0 divergence mesurée aujourd'hui, mais rien ne l'empêche). | Divergence silencieuse possible à tout moment. |
| **R106 / R107** | Les écrans « mise à jour requise » et « besoin d'adhésion » sont **livrés mais inertes** (aucune source de version de schéma ; état jamais déclenché). | Filet de sécurité **apparent** : le plus dangereux est un garde-fou qu'on croit actif. |
| **R80** | Le stream `profiles` ne synchronise que le profil de l'utilisateur connecté. | Limite structurelle pour les vues membres hors-ligne. |

### P2 — qualité et dette

- **R98 / E2** : la suite **Cypress n'a jamais été verte sur `main`** (10 specs, déterministe). La cause est l'**environnement E2E** (réplique PowerSync vide, prérequis offline, contexte d'org), pas la parallélisation. Conséquence : le signal E2E global est inutilisable → il faut reconstruire un environnement déterministe (proposition P41) plutôt que d'ajouter des specs.
- **R73** : `graphify-out/` (**59 Mo, 1 980 fichiers**) est **versionné** et contient des chemins absolus de la machine de dev (`C:\Users\joyda\…`). `.gitignore` n'exclut que `graphify-out/cache/`.
- **R22** : **59 comptes rattachés à `org-1`, dont des adresses réelles**, sur une instance de dev dans un **dépôt public** → exposition de données personnelles.
- **R74** : ciblage des notifications via `action_type` détourné en « rôle ».
- **R30 / R33 / R61 / R82** : onglets Ionic non cliquables en E2E, équivalents `ionInput` manquants, titres de page non sémantiques (a11y), spec `org-reports` non déterministe.

## 7. Hygiène du dépôt — écarts concrets

| Constat | Preuve | Recommandation |
|---|---|---|
| Artefacts générés versionnés | `graphify-out/graph.json` (14,8 Mo) + cache ; `Usersjoydadyad-appsluminabundle-analysis.html` (1,6 Mo) et son `.json` (204 Ko) à la **racine** | `git rm -r --cached`, ajouter à `.gitignore`, déplacer les rapports dans `docs/audit/` |
| Binaire de test versionné | `test_ps.db` (SQLite, 8 Ko) suivi par git | Retirer du suivi |
| Fichier explicitement « non versionné » mais suivi | `.agents_tmp/PLAN.md` — la mémoire dit « NON versionné — ne pas committer », il **est** dans l'index | Trancher : ignorer ou assumer |
| Deux lockfiles | `package-lock.json` (npm) **et** `pnpm-lock.yaml`, alors que pnpm 11 est imposé et que la CI utilise `--frozen-lockfile` pnpm | Supprimer `package-lock.json` (risque d'installation divergente en local) |
| Identité du paquet | `package.json` : `"name": "vite_react_shadcn_ts"`, `"version": "0.0.0"` alors que les releases sont en **1.0.9** | Nommer `lumina`, aligner la version (source unique avec `versionName` Android) |
| Skills dupliqués | `.agents/skills/` et `.claude/skills/` quasi identiques (seul `stitch` diffère) | Une seule source + lien |
| Documentation redondante | 8 fichiers `MIGRATION_*.md` + `POWERSYNC_*` (6) à la racine de `docs/`, `PROPOSALS.md` (43 l.) vs `PROPOSITIONS.md` (655 l.), `AI_RULES.md` / `AGENTS.md` / 3 `PROMPT_*.md` | Indexer depuis `docs/README.md`, archiver l'historique dans `docs/archive/` |
| Dépendance à risque | **`xlsx@0.18.5`** : dernière version publiée sur **npm** (les correctifs SheetJS ne sont plus distribués là) → advisories non patchées | Passer au tarball officiel `cdn.sheetjs.com`, ou à `exceljs` |
| Plugin déprécié | `@capacitor/storage@1.2.5` **et** `@capacitor/preferences@6` | Retirer `@capacitor/storage` |
| Désalignement Capacitor | CLI 8.5.2 vs core/android 6.2.2 | Soit tout en 6.x, soit migration 7/8 planifiée — c'est la cause du build APK rouge en CI (R90) |
| `any` massifs | 1 084 occurrences | Le « 0 erreur TypeScript » est vrai mais **faible en garantie** ; cibler d'abord `dataLayer.ts`, `auth.ts`, adapters |

## 8. CI/CD — état réel

- **Fiables** : `CI Pipeline` (lint, `tsc -b --noEmit`, vitest **bloquant**, build) — vert sur `main` aux derniers runs ; `Lumina Android` vert ; `Keep-alive Supabase` (anti-pause du plan gratuit) vert.
- **Non fiable** : `Cypress Tests` sur `main` (rouge déterministe, R98/E2) alors qu'il **peut passer** sur une branche de correctif (constaté PR #52) → le rouge global dépend du contenu testé, ce qui entretient la confusion.
- **Piège documenté et corrigé** : `tsc --noEmit` à la racine ne vérifiait **rien** (`tsconfig.json` à `"files": []`) — 98 erreurs réelles s'étaient accumulées. La CI utilise désormais `tsc -b`. Ce genre de finding justifie à lui seul la rigueur des gates.
- **Manquant** : aucune configuration Dependabot (abandon assumé) → les advisories (dont `xlsx`) ne remontent pas automatiquement.

## 9. Propositions non implémentées (Phase 15)

Robustesse/intégrité, implémentables sans arbitrage produit : journal d'audit consultable (PR1), export/sauvegarde utilisateur (PR2), corbeille soft-delete (PR3), drapeaux de fonctionnalités / kill switches (PR7), source de version de schéma pour l'écran « update required » (PR6 → solde R106), table de fermeture matérialisée pour la fédération (PR17), migration progressive des ~146 politiques RLS vers `has_permission()` (PR18 → solde R109/R16).

Produit (arbitrage requis) : maker-checker sur les dépenses (PR8), pièces justificatives (PR9), gel de période comptable (PR13), import CSV anti-injection de formules (PR12), transfert de propriété guidé (PR14), recherche globale (PR11).

## 10. Plan d'action recommandé

**Semaine 1 — débloquer et protéger**
1. **R111** : implémenter le parcours (a) — création du compte Auth **avant** le profil PENDING, claim porté par l'id Auth, test de non-régression sur les deux FK. C'est le seul parcours utilisateur critique cassé.
2. **R18** : créer les deux secrets GitHub (`SUPABASE_DB_URL`, `BACKUP_GPG_PASSPHRASE`) → la chaîne déjà prouvée se met à tourner chaque dimanche 03:00.
3. **R106** : ajouter une **source de version de schéma** (colonne/`app_config` + stream) pour que l'écran « mise à jour requise » cesse d'être inerte.

**Semaine 2 — assainir la vérité**
4. **R17** : régulariser l'historique des migrations (`supabase migration repair`) puis figer la règle « toute migration passe par fichier + application traçée ».
5. **R109** : trancher le rôle `ADMIN` (le retirer des données/RLS **ou** l'ajouter au modèle TS), puis câbler PR19 (garde de route réelle) — aujourd'hui `hasPermission`/`isOrgMember` ne sont pas alimentés.
6. **R73 + hygiène** : sortie de `graphify-out/`, des rapports d'analyse et de `test_ps.db` du suivi git ; suppression de `package-lock.json` ; nom/version du paquet.

**Semaine 3 — retrouver un signal E2E**
7. **E2/P41** : environnement E2E déterministe (seed de la réplique PowerSync, contexte d'org forcé, specs indépendantes du réseau) — sinon les 30 specs Cypress resteront du bruit.
8. **R59** : corriger l'`opacity: 0` résiduel (transition Ionic), avec un test crawler « zéro écran noir » étendu à la navigation liste → détail.

**Continu**
9. Découper `dataLayer.ts` (3 844 lignes) par domaine, en commençant par extraire les services déjà présents dans `src/lib/*-service.ts` ; réduire les `any` sur les chemins financiers et d'authentification.
10. Remplacer `xlsx@0.18.5` et retirer `@capacitor/storage` ; décider de l'alignement Capacitor (6 vs 8) pour refaire du build APK un gate utile.

---

## Annexe — chiffres clés pour revue rapide

- 89 340 lignes TS/TSX · 378 fichiers · 62 pages · 14 capabilities · ~32 streams PowerSync · 122 migrations · 1 279 tests unitaires verts · 30 specs Cypress · 113 risques documentés dont ~18 ouverts · 6 releases (v1.0.4 → v1.0.9) le 2026-10-19 · 54 PR, toutes mergées récemment · dépôt **public**.
