# FINAL_REPORT — validation finale & verdict GO / NO-GO (Phase 17)

- **Date** : 2026-10-28
- **Base** : `main` @ `1d9e728` (post PR #91)
- **Périmètre** : verdict de mise en production à 4 mois sur les gates
  **réellement mesurables** dans cet environnement. Chaque affirmation renvoie à
  une commande, un test ou une mesure. Ce qui n'est pas prouvé est marqué
  « non validé » (règle R12 — honnêteté des preuves).

---

## 1. Verdict

**GO conditionnel** pour la poursuite du développement.

**NO-GO** pour une mise en production à 4 mois **tant que** les trois conditions
bloquantes ci-dessous ne sont pas levées. Aucune n'est un défaut de code : deux
sont des décisions/opérations **propriétaire**, une est un environnement de test.

| # | Condition bloquante | Nature | Preuve du blocage |
|---|---|---|---|
| B1 | **Sauvegarde planifiée non activée** (R18/R99, P31/E3) | opération propriétaire | workflow `backup.yml` présent, **jamais exécuté avec succès** ; secrets `SUPABASE_DB_URL` + `BACKUP_GPG_PASSPHRASE` absents. Chaîne **prouvée à la main** (dump + restauration 10/10). |
| B2 | **Rôle `ADMIN` non tranché** (R109, R16) | décision propriétaire | 1 compte admin central en base **sans aucun droit** (`has_permission(...)=false`) ; garde de route R105/R107 volontairement **non câblée** pour ne pas l'enfermer dehors. |
| B3 | **Suite Cypress structurellement rouge** (E2, R98) | environnement E2E | 20 runs consécutifs en échec sur `main` ; cause = environnement (réplique PowerSync vide R53, prérequis offline R83, contexte d'org R72). Le vert Cypress n'est **pas** un signal fiable aujourd'hui. |

## 2. Gates déterministes — MESURÉS VERTS

| Gate | Commande | Résultat (2026-10-28, `main` @ `1d9e728`) |
|---|---|---|
| Typecheck | `npx tsc -b` | **exit 0** |
| Lint | `npx eslint .` | **0 erreur** (1748 warnings pré-existantes, non bloquantes) |
| Unitaires | `npx vitest run` | **1518/1518** (120 fichiers) |
| Build | `npx vite build` | **OK** (exit 0) |
| Garde perf | `CI=1 npx vitest run perf-budget` sans `dist/` | **échec explicite** (R116 prouvé) |

Progression des unitaires au fil de la boucle : 1114 → 1242 → 1452 → 1466 →
**1518** (+404 tests), sans régression.

## 3. Ce qui a été livré (mesuré)

- **R116** — la garde de budget de perf était **muette en CI** (job `unit` sans
  `dist/` → 6 tests `skipped` comptés verts). Correctif `ci.yml` + échec explicite
  sous `CI`. Preuve : la CI exécute désormais 7 tests ; en local sans `dist/`,
  échec `dist/index.html absent… (R116)`.
- **R117** — dérive non gardée entre les jetons de design TS (`theme.ts`) et le
  CSS (`App.css`). Garde `design-tokens-drift.test.ts` (4 tests), non-vacuité
  prouvée (`canvas` `#121212`→`#000000` échoue).
- **Phase 12** — garde anti-dérive `COVERAGE_MATRIX` ↔ tests réels (5 tests),
  2 dérives réelles corrigées.
- **Phases 13/14/16** — tests tutoriel, persistance/isolation des préférences
  (+4 défauts réels **caractérisés**), documentation technique
  `ARCHITECTURE`/`SECURITY`/`TESTING`.
- **Phase 11** — catalogue de chaos hors-ligne/stockage.

## 4. Pre-mortem — état

`PREMORTEM.md` : **PM1–PM19 mitigés** ; **PM20** (marquage `is_test` des données
de test) reste **à faire** (impact 2/5). Aucun risque critique non mitigé hors
les conditions bloquantes B1–B3.

## 5. Risques ouverts notables (hors B1–B3)

| Risque | Gravité | Statut |
|---|---|---|
| R17 — dérive migrations ↔ base | MOYENNE | ouvert (les fichiers ne sont pas la source de vérité) |
| R22 — 59 comptes rattachés à `org-1` (adresses réelles) | MOYENNE | ouvert (PII conservée, décision propriétaire) |
| R62 — deux sources de vérité pour le rôle | MOYENNE | ouvert |
| R72 / R74 / R80 / R82 / R85 / R30 / R33 | FAIBLE→MOYENNE | ouverts, documentés |
| R107 — `needs-membership` inerte | FAIBLE | ouvert (bloqué par B2) |

## 6. Limites assumées de cette validation

- **Cypress non exécutable en local** (binaire non installable, pas d'écran X) :
  la validation E2E passe par la CI, elle-même rouge (B3).
- **Aucune sauvegarde DB produite par l'agent** : la chaîne a été prouvée à la
  main (dump + restauration testée), mais l'**automatisation** reste à activer
  (B1).
- **Décisions propriétaire** (R109/R16, PII R22) non tranchables par l'agent :
  repli conservateur appliqué (aucune donnée modifiée).

## 7. Recommandations ordonnées

1. **B1** — créer les secrets `SUPABASE_DB_URL` + `BACKUP_GPG_PASSPHRASE` et
   vérifier une exécution planifiée (procédure testée : RUNBOOK §Sauvegarde).
2. **B2** — trancher R109 : (a) supprimer le rôle `ADMIN` et reposer l'admin
   central sur les grants, ou (b) l'ajouter au modèle canon. Puis **câbler**
   `hasPermission`/`isOrgMember` dans `App.tsx` (débloque R105/R107).
3. **B3** — reconstruire un environnement E2E déterministe (proposition P41) ;
   en attendant, seuls les gates déterministes (§2) sont bloquants.

**Conclusion** : le produit est **sain sur ses gates déterministes** (typecheck,
lint, unitaires, build) et sa robustesse hors-ligne/stockage a été durcie et
testée. Le NO-GO porte sur des **conditions d'exploitation** (sauvegarde,
décision de rôle, environnement E2E), pas sur des défauts de code non détectés.
