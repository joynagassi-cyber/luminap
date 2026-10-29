# Phase 4 — R109 : `ADMIN` devient le 15e rôle canonique (toutes permissions)

- **Date** : 2026-10-29
- **Priorité** : P1 (modèle de rôles ; bloquait le câblage de la garde de route
  `hasPermission`, R105/R107)
- **Statut** : **TRANCHÉ et livré** (décision propriétaire : `ADMIN` = rôle
  suprême détenant **toutes** les permissions)
- **Migrations** : `20261029000001_admin_role_canonical` (+ rollback)

## Décision

`ADMIN` devient le **15e rôle canonique** (au-dessus de `PASTEUR_PRINCIPAL`).
Un porteur d'`ADMIN` :

- administre **son** organisation (profil ou membership ACTIF) ;
- peut **créer des annexes** (`parent_org_id`) rattachées à son organisation ;
- détient **toutes** les permissions (28), l'union des permissions des 14 rôles.

## Livrables

| Couche | Fichier | Changement |
|---|---|---|
| DB | `20261029000001_admin_role_canonical.sql` | 28 lignes `role_permissions` pour `ADMIN` ; `is_org_admin`/`can_manage_invitations` reconnaissent `ADMIN` |
| TS (types) | `src/types/index.ts` | `Role` inclut `"ADMIN"` |
| TS (matrice) | `src/lib/rbac.ts` | `PERMISSION_MATRIX.ADMIN` = toutes les permissions ; `ROLE_LABELS.ADMIN` = « Administrateur » ; `ROLE_HIERARCHY.ADMIN = 999` |
| TS (gabarits) | `src/templates/church.ts` | rôle exposé dans le gabarit d'organisation |
| Snapshot | `docs/agent/role-model.json` | 15 rôles canoniques, `ADMIN` = 28 permissions |
| Garde | `src/lib/__tests__/role-model-drift.test.ts` | `ADMIN` = 15e rôle, détient TOUTES les permissions |
| Edge | `supabase/functions/create_org/index.ts` | gate sur `org_admins` ACTIF **ou** rôle `ADMIN` ; contrôle d'admin de l'org parente |
| Mirror | `20261026000002_rbac_has_permission.sql` | inclut `ADMIN` |

## Preuves mesurées (instance DEV `hhgovvrnalibhgpakswi`, 2026-10-29)

| Contrôle | Mesure |
|---|---|
| `role_permissions` total | **177 lignes** |
| rôles distincts | **15** |
| `role_permissions.role='ADMIN'` | **28** |
| `has_permission(<ADMIN>, org, 'transaction','create')` | **true** (avant : false) |
| `has_permission(<MEMBRE>, …)` | **false** |
| `ADMIN` INSERT transaction (REST simulé) | **accepté** |
| `ADMIN` création annexe (`parent_org_id`) | **acceptée**, relue par le même compte (supervision) |

## Invariant gardé

`ADMIN` ⊇ toutes les permissions. Si une permission est ajoutée à un autre rôle
sans l'être à `ADMIN`, `role-model-drift.test.ts` **échoue**.

## Risque induit, fermé dans le même lot

Rendre `ADMIN` attribuable par **invitation** ouvrait une voie d'escalade → cf.
**R139** (garde à deux barrières, migration `20261029000003`).

## Gates

`tsc -b --noEmit` = 0 ; `eslint .` = **0 erreur** ; `vitest run` = **1677/1677**.
