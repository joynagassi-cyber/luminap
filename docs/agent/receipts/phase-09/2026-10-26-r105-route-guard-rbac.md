# Receipt — Phase 9/11 (robustesse RBAC) : R105 — garde de route inerte + permissions `invitation:*` orphelines

- **Date** : 2026-10-26
- **Branche** : `agent/r105-route-guard-rbac`
- **Risque source** : R105 (nouveau) ; famille R16 (divergence source de vérité RBAC)
- **Statut** : corrigé (vocabulaire) + verrouillé par test ; câblage de la garde = dépendance PR18

## Défaut

1. `resolveRoute()` implémente une garde de permission par route
   (`route.permission` → `forbidden`) et un contrôle d'appartenance
   (`isOrgMember === false` → `needs-membership`), mais `App.tsx` l'appelle avec
   **seulement** `{ isAuthenticated }`. Ces deux branches sont **du code mort**.
2. `ROUTE_REGISTRY` déclare `invitation:create` / `invitation:manage`, mais
   **aucun rôle canon** ne les détenait (`PERMISSION_MATRIX`) et la table DB
   `role_permissions` n'avait **aucune** ligne `invitation%` — alors que la
   fonction SQL `can_manage_invitations` (déjà en prod) accorde la gestion des
   invitations à PASTEUR_PRINCIPAL / ANCIEN / TREASURIER.

## Preuve (avant)

| Contrôle | Avant |
|---|---|
| `select role, permission from role_permissions where permission like 'invitation%'` | **0 ligne** |
| `getRolesWithPermission("invitation:manage")` | `[]` |
| Test anti-dérive ROUTE_REGISTRY ↔ PERMISSION_MATRIX | **échouait** |

## Correctif

| Fichier | Changement |
|---|---|
| `src/lib/rbac.ts` | `invitation:create/manage/revoke` ajoutés à PASTEUR_PRINCIPAL, ANCIEN, TREASURIER (miroir de `can_manage_invitations`) |
| `supabase/migrations/20261026000002_rbac_has_permission.sql` | mêmes 9 lignes ajoutées à l'INSERT `role_permissions` |
| base dev | migration `rbac_invitation_permissions_mirror` appliquée (3 rôles × 3 permissions) |
| `src/lib/__tests__/permissions.test.ts` | +2 tests anti-dérive (permission de route détenue par ≥1 rôle) |

## Preuve (après)

- `role_permissions` (dev) : `ANCIEN`, `PASTEUR_PRINCIPAL`, `TREASURIER` →
  `invitation:create,invitation:manage,invitation:revoke` (vérifié).
- Gates : `tsc -b` = **0** ; `vitest run` = **1227/1227** (81 fichiers) ;
  `eslint` = **0 erreur**.

## Décision assumée (non-régression)

Le câblage réel de la garde dans `App.tsx` n'est **pas** fait : `admin:settings`
n'est détenu que par PASTEUR_PRINCIPAL, alors que `/admin` est utilisé par
`ADMIN` (central) et `CENTRAL_ADMIN`. Câbler aujourd'hui **enfermerait dehors**
les admins d'organisation. Le câblage est une dépendance de PR18 (R16), et devra
s'accompagner d'un test E2E par rôle.
