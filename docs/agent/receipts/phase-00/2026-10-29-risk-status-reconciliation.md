# Receipt — Réconciliation des statuts de risques (R30/R62/R72/R82) + R109 CENTRAL_ADMIN

- **Date** : 2026-10-29
- **Branches** : `agent/r82-reconcile` (PR #133), `agent/r62-r74-measure2` (PR #134),
  `agent/r109-central-admin` (PR #136)
- **Tâche** : réconcilier le **statut déclaré** des risques du corpus
  (`docs/agent/RISQUES.md`) avec le **code réel** et la **base mesurée** ;
  enrichir R109 avec la découverte `CENTRAL_ADMIN`.

## Méthode (reproductible)

Pour chaque risque « OUVERT » :
1. **Code réel** : `git log -S "<code fautif>" -- <fichier>` — s'il n'y a
   **aucun revert** après le commit du correctif, le code est en place.
2. **Lecture du spec/implémentation** concerné.
3. **Base mesurée** : MCP Supabase `execute_sql` (données + `pg_policies`).

## Constats (4 entrées fausses ou périmées)

| Risque | Statut déclaré | Réalité mesurée | Preuve |
|---|---|---|---|
| **R82** | « correctif NON appliqué — tentative révoquée » ; « spec restauré » | correctif **dans le code** depuis `c11aad7` (PR #6), **jamais révoqué** ; annexes **purgées** | `git log -S "Aucune"` → aucun revert ; `organizations` = 3 lignes, 0 annexe |
| **R72** | « correctif proposé (non appliqué) » | garde d'échec immédiat **appliquée** (`cross-tenant.cy.ts:101-108`) ; **non applicable en CI** (serveur dev) | lecture du spec ; `cypress.yml` → `start: pnpm run dev` |
| **R30** | « non corrigé » | scoping `div.ion-page:not(.ion-page-hidden)` + `{force:true}` (6×) **appliqués** | `grep -c "force: true" nav-bottom.cy.ts` → 6 |
| **R62** | « divergence MEMBRE vs PASTEUR_PRINCIPAL » | **2/2 profils cohérents** post-purge ; risque **structurel** maintenu | SQL : `profiles.role = org_memberships.role` pour les 2 comptes |

## Découverte R109 (extension)

`CENTRAL_ADMIN` = **second rôle orphelin** : testé par l'UI (10 occurrences /
7 fichiers) mais **absent** du type `Role`, de `role_permissions` (0 ligne) et
de **toute politique RLS** (0 dans `pg_policies`).

Mécanisme **réel** d'admin central = **grants `org_admins`**
(`create_org` gate l'appelant sur un grant ACTIF puis en crée un).

Décision **D-S10-3** (conservatrice, propriétaire) : aucune modification.

## Gates (CI `main`, run 40825134564 — commit de merge #134)

| Gate | Commande | Sortie | Extrait |
|---|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | **0** | (aucune sortie) |
| Unitaires | `pnpm exec vitest run` | **0** | `Test Files 143 passed (143)` · `Tests 1661 passed (1661)` |
| Lint | `pnpm run lint` | **0** | `✖ 1749 problems (0 errors, 1749 warnings)` |
| Build Application | `pnpm run build` | **0** | succès |
| Build Debug APK | `gradlew assembleDebug` | **0** | succès (R90 réparé, PR #129) |
| E2E (Cypress) | `cypress run` | **échec** | E2/R98 (environnement PowerSync) — **non bloquant**, connu |

> Changements **docs-only** : aucun impact sur le comportement. Les gates sont
> ceux de la CI (pnpm non installé dans l'environnement d'agent).

## Honnêteté (R12)

- **[Prouvé]** : les statuts rectifiés (git log + lecture + SQL) ; les gates CI.
- **[Probable]** : que R82/R72/R30 restent non vérifiables en CI tant que E5/E2
  ne sont pas levés (PowerSync).
- **[Non vérifié]** : exécution locale de Cypress (impossible — E2).

## Risque résiduel

- R109 (ADMIN + CENTRAL_ADMIN) reste **à trancher** par le propriétaire.
- La cause racine des échecs Cypress reste E5 (audience PowerSync) — hors
  périmètre (déploiement = propriétaire).
