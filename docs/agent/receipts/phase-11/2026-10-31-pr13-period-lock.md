# Receipt — PR13 : gel de période (clôture comptable)

- **Date** : 2026-10-31
- **Branche** : `agent/pr13-period-lock`
- **Statut** : terminé (gates vertes ; PR brouillon à ouvrir)
- **Contrat** : `docs/agent/PROPOSALS.md` PR13 — dépend de la Phase 7 (reporting).
- **Priorité** : P2.

## Problème

Rien n'empêchait de modifier une comptabilité DÉJÀ VALIDÉE. Une fois un exercice
clôturé, une écriture antidatée (création, édition, suppression, contre-écriture
ou approbation) pouvait réécrire le passé : les rapports d'une période close
cessaient d'être reproductibles — exactement le risque que la clôture comptable
doit éliminer.

## Livré

| Fichier | Rôle |
|---|---|
| `src/lib/periodLock.ts` | Règle **pure** `isDateLocked` / `assertPeriodOpen` (`date <= lockedUntil` ⇒ gelé) + erreur typée `PeriodLockedError` (code `PERIOD_LOCKED`, message FR) + persistance `lockPeriod` / `getLockedUntil` / `clearPeriodLock` au-dessus de `orgSettings` (**fail-open**) |
| `src/lib/dataLayer.ts` | Point de passage **unique** `assertTransactionWritable(date)` (gardé par le kill switch `period-lock`), appelé par `addTransactionPS` / `updateTransactionPS` (date actuelle **et** date cible) / `deleteTransactionPS` / `approveTransactionPS` / `reverseTransactionPS` |
| `src/lib/cotisation-service.ts` | Garde AVANT toute écriture dans `persistMarkCotisationPaid` (pas de demi-écriture : cotisation/membre inchangés si refus) |
| `src/lib/versement-service.ts` | Garde AVANT toute écriture dans `createVersement` (ni ligne `versements`, ni les 2 transactions) |
| `src/lib/transaction-service.ts` | Le rejet typé **remonte** (ne pas l'avaler comme une panne transitoire) |
| `src/store/useLocalStore.ts` | `markCotisationPaid` persiste AVANT de refléter l'état local (pas d'UI « payé » sur une écriture refusée) |
| `src/hooks/usePeriodLock.ts` + `src/components/PeriodLockCard.tsx` | Contrôle admin : fixer/retirer la date de clôture, afficher la clôture courante ; masqué sans la permission canon `finance:manage` |
| `src/pages/SettingsGestion.tsx` | Intègre la carte dans Paramètres → onglet « Gérer » |
| `src/pages/{TransactionNew,TransactionNewGroup,TransactionEdit,TransactionDetail,EventDetail}.tsx` | Message FR (`periodLockMessage`) au point de soumission — aucun écran muet |
| `src/lib/__tests__/period-lock.test.ts` | Règle pure : bornes (égal = gelé, lendemain = ouvert), fail-open |
| `src/lib/__tests__/period-lock-enforcement.test.ts` | 9 tests : rejet typé + **aucun** INSERT/UPDATE/DELETE émis (mock PowerSync stateful) ; déplacement vers une date gelée refusé ; fail-open ; kill switch |
| `src/lib/__tests__/period-lock-service-guards.test.ts` | 4 tests : services cotisation/versement — refus ⇒ **aucune** écriture ; ouvert ⇒ écriture normale |
| `src/components/__tests__/PeriodLockCard.test.tsx` | 5 tests : lecture, clôture, réouverture, état de chargement (R52), non-admin ⇒ contrôle absent |

Aucune migration ni table nouvelle : la clôture est persistée dans la table
existante `org_settings` (clé `period_locked_until`), déjà déployée et
synchronisée (stream `org_settings`), **scopée par organisation**.

## Décisions d'intégration

- **Point d'étranglement UNIQUE** dans `dataLayer` : les pages ne réimplémentent
  pas la règle ; les services qui écrivent des transactions hors
  `addTransactionPS` (cotisation, versement) appellent explicitement la même
  garde. Impossible d'ajouter un chemin d'écriture sans repasser par elle.
- **FAIL-OPEN** : aucune clôture (réglage absent/vide/illisible) ⇒ rien n'est
  gelé ; une date de transaction illisible ne bloque pas non plus. On n'empêche
  jamais une écriture légitime à cause d'une lecture ratée (politique
  `featureFlags` / `orgSettings`).
- **Refus TYPÉ, jamais un no-op silencieux** : `PeriodLockedError` (code stable
  `PERIOD_LOCKED`) remonte jusqu'à l'UI, qui affiche un message FR nommant la
  date de clôture. Aucune demi-écriture (garde AVANT l'écriture).
- **RBAC non dupliqué** : permission canon `finance:manage` (union fédérée +
  legacy via `useCanAccessMulti`) ; le contrôle se masque de lui-même sans le
  droit — pas de bouton inerte.
- **Kill switch d'exploitation** : `isFeatureEnabled("period-lock")` (défaut =
  actif ⇒ aucun changement de comportement). Garde anti « filet jamais câblé »
  ajoutée à `feature-flags.test.ts`.
- **R52 « pas encore lu ≠ vide »** : `usePeriodLock.loading` reste vrai tant que
  la 1re lecture n'a pas abouti (`finally`), l'UI affiche « Chargement de la
  clôture… » et jamais « aucune période clôturée » (fait faux avant la 1re
  synchro).

## Non-vacuité (mutation, restaurée)

- Retirer `await assertTransactionWritable(...)` de `cotisation-service.ts` /
  `versement-service.ts` ⇒ 2 des 4 tests de `period-lock-service-guards`
  passent au **rouge** (refus non appliqué / écriture émise).
- Retirer la garde du point d'étranglement `dataLayer` ou rendre `isDateLocked`
  toujours `false` ⇒ les tests « refusé + aucune écriture » de
  `period-lock-enforcement` passent au rouge.
- Retirer le second contrôle (date cible) de `updateTransactionPS` ⇒ le test de
  déplacement vers une date gelée passe au rouge.

## Vérifications (gates)

- `npx tsc -b --force --noEmit` → **0 erreur**.
- `npm run lint` → **0 erreur** (avertissements préexistants uniquement).
- `npx vitest run` → **172 fichiers, 1831 tests OK** (6 ignorés).
- `npm run build` → **OK**.

## Suites possibles

- Étendre le gel aux écritures hors transactions (annulation d'un versement,
  correction d'un membre) si la clôture doit couvrir d'autres entités.
- Éventuelle borne côté serveur (trigger RLS) en complément du refus client —
  aujourd'hui la clôture est un garde-fou APPLICATIF partagé par organisation.
