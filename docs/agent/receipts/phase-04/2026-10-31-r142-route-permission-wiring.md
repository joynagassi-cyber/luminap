# Receipt — R142 : câblage de la garde de route (`hasPermission`)

- **Date** : 2026-10-31
- **Risque** : R142 (MOYENNE — défense en profondeur absente ; branche `forbidden`
  morte depuis R105)
- **Statut** : CORRIGÉ (livré + prouvé)
- **Branche** : `agent/r140-audit-append-only` (PR #157)

## Défaut

`resolveRoute` produisait la branche `forbidden` mais `App.tsx` ne fournissait
jamais `hasPermission` → la garde de permission était **inerte** (classe
R105/R106/R107 : « filet déclaré, jamais câblé »). Le champ était inscrit dans
`PENDING_WIRING` du test de câblage, bloqué par deux questions de périmètre.

## Décisions

### 1. `CENTRAL_ADMIN` (hors canon) — fail-closed

- `CENTRAL_ADMIN` est utilisé dans le code (`TopHeader`, `CentralAdmin`,
  `SettingsGestion`, …) mais **absent** de `Role`/`PERMISSION_MATRIX` ; **0
  compte** en base (`profiles` = 2 × `PASTEUR_PRINCIPAL`).
- **Décision** : ne PAS le canoniser (il faudrait définir ses permissions DB+TS
  sans décision produit et créer un rôle inutilisé). La garde **refuse** un rôle
  hors canon (`parseRole → null`). L'admin central canonique est **`ADMIN`**
  (R109), qui détient `admin:settings`.

### 2. `/admin/reports*` — appartenance seule (aucune permission de route)

- **Pas** `admin:settings` (l'ancien mapping, qui enfermait dehors les
  destinataires) **ni** `report:read` (mesure : **`MEMBRE` ne détient pas
  `report:read`** — 12/14 rôles seulement).
- Le lien « Voir tout → » du `Dashboard` est rendu **sans garde de rôle** ; la
  RLS `org_reports_receiver` n'exige qu'une **appartenance d'org** → garde
  d'appartenance seule, comme `/reports`. Un non-membre obtient
  `needs-membership`.

## Livrables

- `src/lib/rbac.ts` : `roleHasPermission(rawRole, permission)` — décision
  centralisée, source unique `PERMISSION_MATRIX`, fail-closed hors canon.
- `src/App.tsx` : état `userRole` (profil live, repli `null`) +
  `hasPermission` fourni au résolveur.
- `src/lib/routeResolver.ts` : `/admin/reports` et `/admin/reports/:id` sans
  permission (appartenance seule).
- `src/lib/__tests__/r142-route-permission-wiring.test.ts` (9 assertions).
- `src/lib/__tests__/route-state-wiring.test.ts` : `hasPermission` retiré de
  `PENDING_WIRING`, ajouté aux champs « réellement alimentés ».

## Preuve

- `npx tsc -b` → **0**
- `npx vitest run` → **1736/1736** (156 fichiers)
- Invariants testés : rôle canon → permissions déclarées ; hors-canon → refus ;
  `null`/`""`/`undefined` → refus ; aucune route gardée par une permission que
  **0 rôle** détient ; `/admin/reports*` sans permission de route ; `App.tsx`
  fournit bien `hasPermission`.

## Sûreté

Défense en profondeur **uniquement** : la RLS reste la barrière serveur. Aucune
donnée n'est exposée ni fermée qui ne l'était déjà au niveau base. Le câblage
n'ajoute aucune restriction serveur — il rend visible une restriction de route
déjà cohérente avec les permissions canon.
