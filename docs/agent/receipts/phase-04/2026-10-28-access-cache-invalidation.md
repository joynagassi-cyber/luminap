# Receipt — R128 : invalidation du cache d'accès après mutation de grants/rôles

- **Phase** : 4 (RBAC fin) / famille « filet déclaré, jamais câblé »
- **Date** : 2026-10-28
- **Branche** : `agent/r128-access-cache-invalidation`
- **Défaut visé** : R128

## Symptôme

Un administrateur accorde une capacité (`OrgRoles` → « Enregistrer ») : le
membre continue de ne pas y avoir accès. Idem pour un retrait. Seul un
rechargement complet de l'application prenait en compte le changement — et sur
mobile, il n'y a pas de rechargement.

## Cause

`clearCanAccessMultiCache()` était **documenté** pour l'invalidation « après
mutation de grants » mais n'était appelé que par le test. Le cache
module-level de `useCanAccessMulti` retenait le verdict fédéré périmé, et la
purge sur fin de sync ne se produit qu'**une fois par session**
(`_cacheStale` consommé au premier sync).

## Correctif

| Fichier | Changement |
|---|---|
| `src/hooks/useCanAccessMulti.ts` | `clearCanAccessMultiCache()` notifie `_invalidationListeners` (les hooks montés re-résolvent) |
| `src/lib/orgAdmin.ts` | invalidation après `assignMemberRole`, `grantCapability`, `revokeCapability` |

## Tests et non-vacuité

- `useCanAccessMulti.test.tsx` : test comportemental — après une mutation qui
  accorde l'accès, le hook monté re-résout (`allowed=true`,
  `source="federation"`) sans rechargement. Retirer la notification → échec.
- `orgAdmin.test.ts` : garde anti-dérive — les 3 mutations doivent appeler
  `clearCanAccessMultiCache()`. Retirer les appels → échec.

## Gates

| Gate | Résultat |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx eslint` (fichiers touchés) | 0 erreur (warnings `any` pré-existants) |
| `npx vitest run` | **1591/1591** (128 fichiers) |
