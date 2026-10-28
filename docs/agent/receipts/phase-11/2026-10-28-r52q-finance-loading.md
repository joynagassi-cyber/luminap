# Receipt — R52.q : écrans financiers à chiffres faux avant la 1re lecture

- **Phase** : 11
- **Priorité** : P2
- **Branche** : `agent/r52j-trace-orgreport-loading`
- **Date** : 2026-10-28

## Défaut

Même cause systémique que R52.l→R52.p (`isLoading` **mort**, D-R41 :
`useTransactions` / `useAccounts` renvoient `isLoading: false` en dur), mais
**conséquence aggravée** : l'écran n'affiche pas un verdict vide, il affiche des
**chiffres faux**.

| Écran | Garde morte | Ce que voyait l'utilisateur |
|---|---|---|
| `/balance` | `psLoading` | `data-screen-state="ready"` + **tous les totaux à 0 FCFA** |
| `/history` | `txLoading` | graphiques et agrégats **vides** |
| `/versement` | `accountsLoading` | sélecteur de caisse **vide** |

Un trésorier qui ouvre le bilan pendant la première synchronisation lit donc un
bilan **faux** — pire qu'un écran vide, car rien ne signale l'erreur.

## Correctif

Motif éprouvé, appliqué aux trois écrans :

```ts
const replicaPending = !isPowerSyncReadyNow();
if (XLoading || (liste.length === 0 && replicaPending)) { /* squelette */ }
```

`aria-busy="true"` ajouté aux conteneurs `data-screen-state="loading"` de
`/balance` et `/history` (le squelette doit être annonçable aux lecteurs
d'écran, et c'est aussi la sonde des tests).

## Durcissement de la garde statique (2ᵉ invariant)

**Défaut de la garde elle-même** : un simple **import** de `isPowerSyncReadyNow`
(sans appel) blanchissait un fichier. Mesuré : garde retirée de `Balance.tsx`
mais import conservé → la 1re garde ne signalait rien. C'est la **même classe de
faille** que l'import de `Skeleton` corrigé lors de R52.l.

Correctif : `provesReadiness()` exige un **appel** `isPowerSyncReadyNow(…)` ou un
usage de `replicaPending`. Nouvel invariant : un écran possédant un squelette
visible (`aria-busy="true"` / `Skeleton`) ne peut pas garder ce squelette sur un
`isLoading` mort.

## Preuves

- `npx vitest run` → **1635/1635** (137 fichiers)
- `npx tsc -b --force --noEmit` → **0 erreur** ; `npx eslint` → **0 erreur**
- **Non-vacuité mesurée** :
  - `r52q-finance-loading.test.tsx` : gardes retirées → `3 failed | 3 passed`,
    restaurées → `6 passed`
  - `r52-readiness-guard.test.ts` : mutation de `Balance.tsx` (garde + variable
    retirées, import conservé) → échec nommé
    `src/pages/Balance.tsx (psLoading)`, restaurée → `4 passed`

## Note

Après R52.l→R52.q, le corpus ne présente plus aucun écran dont la branche de
chargement est morte : vérifié par les deux invariants statiques (0 offenseur).
