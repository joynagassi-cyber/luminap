# Receipt — R52.m / R52.n : verdicts vides avant la première lecture (listes + détail groupe)

- **Phase** : 11
- **Priorité** : P2
- **Branche / PR** : `agent/r52j-trace-orgreport-loading`
- **Date** : 2026-10-28

## Défaut (famille R52) — cause **systémique**

Plusieurs écrans portaient un squelette dédié, mais leur garde était
`if (…Loading)`. Or les hooks correspondants de `dataLayer` renvoient
`isLoading: false` **en dur** (l'état de chargement temporel a été retiré par
la décision **D-R41**). Ces branches étaient donc du **code mort** et le verdict
vide s'affichait pendant la première synchronisation PowerSync.

Hooks concernés (mesuré par script) : `useMembers`, `useEvents`, `useGroups`,
`useOrgUnits`, `useNotifications`, `useCotisations` (et 13 autres).

| Écran | Verdict faux affiché |
| --- | --- |
| `/members` | « Aucun membre » |
| `/events` | « Aucun événement » |
| `/groups` | « Aucun groupe » |
| `/cotisations` | « Aucun culte » |
| `/notifications` | « Pas encore de notification » |
| `/group/:id` | « Groupe introuvable » |

## Correctif

Motif déjà éprouvé (`Trace`, `MembresEnAvance`, `OrgRoles`, …) : garde
`isPowerSyncReadyNow()` + squelette existant.

```ts
// ex. /members
if (membersLoading || (members.length === 0 && replicaPending)) return <MembersSkeleton />;
// ex. /group/:id
if (orgUnitsLoading || (!orgUnit && !isPowerSyncReadyNow())) return <GroupDetailSkeleton />;
```

## Preuves

- `npx tsc -b --force --noEmit` → **0 erreur**
- `npx eslint` sur les 6 fichiers → **0 erreur**
- `list-loading-vs-empty.test.tsx` : **21 passed** (6 nouveaux : R52.m ×5, R52.n ×1)
- **Non-vacuité mesurée** : gardes retirées → **6 failed | 15 passed** ;
  restaurées → **21 passed**.
- Suite complète : **1623/1623** (134 fichiers).

## Note méthodologique

La garde statique `r52-readiness-guard` ne pouvait pas détecter ce cas : la
branche morte *contenait* le mot `Skeleton`. C'est pourquoi (a) la garde a été
durcie (R52.l) et (b) chaque cas est verrouillé par un test **comportemental**
qui rend réellement l'écran et exige `[aria-busy="true"]`.

## Suite à examiner

`isLoading: false` en dur reste la règle dans ~19 hooks de `dataLayer`. Tout
écran qui dérive un verdict de `isLoading` sur ces hooks est un candidat R52.
Les cas restants ont été recensés ; aucun autre verdict vide dérivé d'un
`isLoading` mort n'a été trouvé sur les pages.
