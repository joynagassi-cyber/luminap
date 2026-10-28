# Receipt — Phase 2 : garde structurelle « garde de route inatteignable » (R105)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-02-route-permission-guard`
- **Contrat** : Phase 2 (routage / écrans noirs / deep links).

## Défaut visé

Un `RouteDef` peut déclarer une `permission` que `resolveRoute` exige via
`state.hasPermission`. Si cette permission n'est **détenue par aucun rôle
canon**, la route est **inatteignable pour tout le monde** : `forbidden`
systématique, écran muet silencieux, sans qu'aucun test ne le voie.

C'est la classe de **R105** : le registre exigeait `invitation:create` /
`invitation:manage`, détenues par aucun rôle avant correction. Le risque a été
documenté mais **aucun test ne verrouillait la cause** — la même faute pouvait
être réintroduite.

## Livré

`src/lib/__tests__/route-permission-guard.test.ts` (3 tests) :

1. le registre déclare au moins une route protégée (sanity) ;
2. **chaque** `permission` de route est détenue par ≥1 rôle de
   `PERMISSION_MATRIX` ;
3. chaque `permission` de route est une permission canonique connue (une faute
   de frappe = une chaîne que `hasPermission` ne peut jamais satisfaire).

Ce test verrouille la **détention** des permissions, indépendamment de
R109/R16 (qui ne concernent que le *câblage* de `hasPermission`, pas le fait
qu'un rôle détienne la permission).

## Preuve que la garde mord

En ajoutant une route fictive `/admin/secret` gardée par `admin:superuser`
(permission détenue par aucun rôle), le test échoue :

```
permission(s) exigée(s) par une route mais détenue(s) par aucun rôle → route
inatteignable: expected [ 'admin:superuser' ] to deeply equal []
```

Puis restauré. La classe ne peut donc plus récidiver silencieusement.

## Gates

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `tsc -b` | **0** |
| Lint | `eslint` | **0 erreur** |
| Unitaires | `vitest run` | **1349/1349** |
