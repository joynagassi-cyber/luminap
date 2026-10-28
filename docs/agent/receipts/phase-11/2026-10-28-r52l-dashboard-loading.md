# Receipt — R52.l : `/dashboard` annonçait « Pas encore de mouvement » avant la première lecture

- **Phase** : 11
- **Priorité** : P2 (écran d'accueil — impact utilisateur élevé)
- **Branche / PR** : `agent/r52j-trace-orgreport-loading` (PR #114)
- **Date** : 2026-10-28

## Défaut (famille R52)

`src/pages/Dashboard.tsx` dérivait un verdict vide (« Pas encore de mouvement »)
de `recentTransactions.length === 0`, sans distinguer « pas encore lu » de
« réellement vide ».

Le fichier contenait bien un `DashboardSkeleton`, mais **uniquement** sur la
branche `if (isLoading)` — or `useTransactions()` (dataLayer) renvoie
`isLoading: false` **en dur** : l'état de chargement temporel avait été retiré
lors de R41 (décision **D-R41**, régression E2E mesurée). Cette branche est donc
du **code mort** et aucun squelette n'était jamais rendu. L'écran d'accueil — le
premier vu après connexion — affichait un historique vide à tort pendant la
première synchronisation PowerSync.

### Aggravant : garde statique aveuglée

`r52-readiness-guard.test.ts` comptait le mot `Skeleton` parmi les signaux de
disponibilité. Un simple **import** de squelette (même non câblé) suffisait donc
à faire passer la garde — c'est exactement le cas de `Dashboard.tsx`.

## Correctif

1. `Dashboard.tsx` :
   ```ts
   const replicaPending = !isPowerSyncReadyNow();
   ...
   {recentTransactions.length === 0 && replicaPending ? (
     <ListSkeleton count={3} />
   ) : recentTransactions.length === 0 ? (
     <EmptyState title="Pas encore de mouvement" ... />
   ) : ( ... )}
   ```
   (motif déjà éprouvé : `Trace`, `MembresEnAvance`, `OrgRoles`, …)
2. `r52-readiness-guard.test.ts` :
   - `Skeleton` **retiré** des signaux de disponibilité (un import ne prouve
     rien) ; `aria-busy` ajouté ;
   - test de non-vacuité étendu au cas « squelette importé mais non câblé ».

## Preuves

- `npx tsc -b --force --noEmit` → **0 erreur**
- `npx eslint` sur les 3 fichiers touchés → **0 erreur**
- **Non-vacuité** : retirer la garde `replicaPending` fait échouer le test
  (`affiche un squelette … ` → `1 failed | 1 passed`) ; restauré → vert.
- Test ciblé : `src/pages/__tests__/r52l-dashboard-loading.test.tsx` (2 passed).
- Garde statique : `r52-readiness-guard.test.ts` (2 passed).

## Note méthodologique

La garde statique ne peut pas voir qu'une branche est morte. C'est pourquoi le
test **comportemental** (rendu réel, assertion sur `[aria-busy="true"]`) est
indispensable ici ; la garde statique n'assure qu'une première ligne de défense
et a été durcie en conséquence.
