# Receipt — Phase 11 : Approbation en deux étapes (maker-checker, PR8)

- **Date** : 2026-10-31
- **Branche** : `agent/pr8-maker-checker`
- **Proposition source** : PR8 (« Approbation en deux étapes maker-checker »),
  priorité P2. Dépend de RBAC (Phase 4, livré) et du socle `org_settings`.
- **Statut** : terminé (PR brouillon ouverte).

## Problème

L'approbation d'une transaction n'avait **aucun contrôle de séparation des
tâches** : la personne qui **crée** une dépense pouvait l'**approuver**
elle-même dès qu'elle possédait `transaction:approve`. Pour une organisation où
plusieurs personnes saisissent et valident des dépenses, un même acteur pouvait
donc engager **et** valider la dépense — l'antithèse du contrôle financier
attendu (maker-checker). Aucun réglage ne permettait d'imposer la séparation.

## Livré

| Fichier | Rôle |
|---|---|
| `src/lib/makerChecker.ts` (NOUVEAU) | noyau **PUR** : `canApprove` → `{allowed, reason}` (`self-approval` / `missing-permission`) ; `assertApprovable` → `MakerCheckerError` typée ; `resolveMakerCheckerEnabled` ; codes `MAKER_CHECKER_SELF_APPROVAL` / `MAKER_CHECKER_MISSING_PERMISSION` ; messages FR ; kill-switch `MAKER_CHECKER_FLAG` |
| `src/lib/makerCheckerSettings.ts` (NOUVEAU) | décision partagée `isMakerCheckerEnabled()` (réglage d'org + kill-switch, **fail-safe false**) — réutilisée par le data layer, le store et le hook |
| `src/hooks/useMakerChecker.ts` (NOUVEAU) | `useMakerChecker()` → `{ enabled, loaded }` ; re-lit à la fin du premier sync PowerSync et au changement d'organisation |
| `src/lib/transaction-service.ts` (ÉDITÉ) | `buildApproveTransaction(..., options: ApproveOptions)` et `buildBatchApproveTransactions(...)` refusent (typed) l'auto-approbation quand actif ; lot refusé **en entier** |
| `src/lib/dataLayer.ts` (ÉDITÉ) | `approveTransactionPS(id, userId)` : lit `created_by_id`, garde `assertApprovable` **avant** l'écriture |
| `src/store/useLocalStore.ts` (ÉDITÉ) | garde évaluée **avant** toute écriture dans `approveTransaction` / `batchApproveTransactions` |
| `src/pages/TransactionDetail.tsx` (ÉDITÉ) | bouton « Approuver » **désactivé** + note FR « L'auteur ne peut pas approuver sa propre dépense. » pour l'auteur quand le réglage est actif |
| `src/pages/SettingsGestion.tsx` (ÉDITÉ) | bascule admin « Approbation en deux étapes » (section « Contrôle financier »), gate `admin:settings`, persistée via `setOrgSetting` |
| `src/lib/__tests__/maker-checker.test.ts` (NOUVEAU) | 15 tests du noyau pur |
| `src/lib/__tests__/maker-checker-approve-path.test.ts` (NOUVEAU) | 8 tests du chemin d'écriture réel (PowerSync en mémoire) |
| `src/pages/__tests__/maker-checker-ui.test.tsx` (NOUVEAU) | 2 tests composant (bouton désactivé / note FR) |
| `src/pages/Tutorial.tsx` | section « Approbation en deux étapes » (Phase 13) |
| `docs/agent/COVERAGE_MATRIX.md` | 1 ligne (Phase 11) |
| `docs/agent/PROGRESS.md` | 1 ligne (Phase 11, PR8) |

## Comportement

1. **OPT-IN, PAR ORGANISATION** — le réglage vit dans
   `org_settings.maker_checker_enabled` (migration `20261031000007`, **déjà
   déployée** par le socle). **Défaut = OFF** : les organisations
   mono-administrateur conservent le comportement historique à l'identique.
2. **Règle pure, ordre stable** (`canApprove`) :
   1. `transaction:approve` absent → refus `missing-permission` (vaut **dans
      tous les cas**, réglage actif ou non) ;
   2. `enabled === true` ET `created_by_id === actorId` → refus
      `self-approval` ;
   3. sinon autorisé.
3. **Enforcement au niveau écriture**, pas seulement UI : `approveTransactionPS`
   relit `created_by_id` et lève une `MakerCheckerError` typée **avant** la
   moindre écriture ; le store évalue la garde **avant** d'écrire ; le lot est
   refusé **en entier** si une seule transaction visée a été créée par l'acteur
   (jamais d'approbation partielle silencieuse).
4. **FAIL-SAFE** — toute lecture ratée du réglage retombe sur `false` et est
   instrumentée (`captureClientError`) : on n'active jamais une contrainte
   financière par accident. Le kill-switch `maker-checker` (drapeau) éteint la
   feature même si l'organisation l'a activée.
5. **UI** — l'auteur voit le bouton « Approuver » désactivé et la note FR ;
   l'admin bascule le réglage depuis `SettingsGestion` (permission
   `admin:settings`). Toute bascule réussie est confirmée par un toast FR ;
   un échec d'écriture est signalé (jamais avalé).

## Preuve — non-vacuité (vérifiée)

Mutation appliquée : neutraliser la branche
`if (enabled && transaction.createdById === actorId)` du noyau
(`makerChecker.ts`) en `if (false && …)`, puis restaurer.

| Mutation | Test(s) qui échoue(nt) |
|---|---|
| `if (enabled && createdById === actorId)` → `if (false && …)` | **6** tests : `maker-checker.test.ts` (3 : auto-approbation refusée, garde synchrone, mapping erreur), `maker-checker-approve-path.test.ts` (2 : écriture non effectuée + lot refusé), `maker-checker-ui.test.tsx` (1 : bouton désactivé). Résultat mesuré : `6 failed | 19 passed`. Règle restaurée → `25 passed`. |

## Preuve — gates

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b --force --noEmit` | **0** (exit 0) |
| Unitaires | `npx vitest run` | **1826 passés**, 171 fichiers (0 échec) |
| Lint | `npm run lint` | **0 erreur** (1756 avertissements pré-existants) |
| Build | `npm run build` | **OK** (exit 0, `built in 3.29s`) |

## Non-couvert (honnêteté)

- Le réglage est **par organisation** et se synchronise via le stream
  `org_settings` (déployé avec le socle). Le déploiement du stream relève du
  propriétaire ; le présent travail n'ajoute **aucune** migration.
- Les tests du chemin d'écriture utilisent un moteur SQL **en mémoire**
  (conventions `e2e-transaction.test.ts`) : ils prouvent la garde applicative,
  pas la politique RLS serveur (hors périmètre PR8).
- `buildApproveTransaction` est couvert en isolation ; le câblage React de
  `TransactionDetail` est couvert par `maker-checker-ui.test.tsx`.
