# Phase 4 — R137 : l'autorisation d'écriture n'est pas appliquée en base (mesure)

- **Date** : 2026-10-29
- **Priorité** : P2 (sécurité / contrôle d'accès) — **CORRIGÉ le 2026-10-29**
- **Statut** : CORRIGÉ (voie REST/PostgREST) — migration `20261029000002`

## Question posée

« Quels sont les rôles disponibles, comment fonctionne le RBAC et
l'assignation, peut-on créer un rôle ? »

Réponse par la mesure, en base **et** dans le code.

## 1. Les rôles — il y en a 14, définis en DONNÉES

`role_permissions` : **149 lignes**, **14 rôles**, **27 permissions
distinctes**. La colonne `role` est un **TEXT libre** (aucun `CHECK`, aucun
enum) : les 14 rôles sont une **convention de données**, pas une contrainte.

| Rôle | #perm | Rôle | #perm |
|---|---|---|---|
| PASTEUR_PRINCIPAL | 27 | RESPONSABLE_GROUPE | 8 |
| TREASURIER | 23 | DIACRE | 7 |
| ANCIEN | 19 | SECRETAIRE_ADJOINT | 5 |
| PASTEUR_ASSOCIE | 11 | BENEVOLE | 4 |
| RESPONSABLE_DEPARTEMENT | 11 | COMPTABLE | 4 |
| TREASURIER_ADJOINT | 10 | MEMBRE | 2 |
| PASTEUR_JEUNESSE | 9 | SECRETAIRE | 9 |

## 2. Deux sources de vérité (et elles sont alignées)

| | Source | Qui l'utilise |
|---|---|---|
| Frontend | `PERMISSION_MATRIX` (`src/lib/rbac.ts`, TS, 14 rôles) | UI : `hasPermission`, `evaluatePermission`, `useCanAccessMulti` |
| Base | `role_permissions` (SQL, 149 lignes) | `has_permission()` — **jamais appelée en écriture** |

Alignement vérifié : la migration `20261026000002` ≡ la base (149 lignes).
Seul écart : `ADMIN` / `CENTRAL_ADMIN` (R109, hors canon, décision en attente).

## 3. LE DÉFAUT MESURÉ (R137)

`has_permission(uid, org, resource, action)` **existe** et lit
`role_permissions`. Mais :

- politiques RLS qui l'appellent : **1 seule**, et c'est une **lecture**
  (`role_permissions_read`) ;
- `transactions` : INSERT/UPDATE/DELETE = `is_org_member(...)` **seul** ;
- **0 / 30** politiques d'écriture des tables sensibles ne vérifie une
  permission ;
- aucun trigger ne compense (0 trigger non-interne sur `transactions`).

**Conséquence** : un `MEMBRE` (`event:read`, `transaction:read`) peut
`INSERT`/`UPDATE`/`DELETE` une transaction de son org **au niveau base**.
L'UI l'en empêche (masquage client), mais tout client `authenticated` avec la
clé anon publique peut écrire directement en REST/PostgREST.

C'est la même classe de défaut que **R49** : une garde **déclarée mais jamais
câblée**. Le receipt `phase-04/2026-10-26-rbac.md` le disait déjà :
« `has_permission` est livrée **comme primitive** ; les politiques RLS
existantes n'ont **pas** été réécrites ».

## 4. Assignation de rôle — comment ça marche

- **UI** : `/admin/roles` (`OrgRoles.tsx`) → écran d'administration des accès.
  L'admin sélectionne un membre, choisit un **rôle** (14 possibles) et coche
  des **capacités** supplémentaires (allow/deny).
- **Écriture du rôle** : `assignMemberRole` → `org_memberships` (D3), gardé
  par la RLS `om_update` (`is_org_admin`). `profiles.role` n'est **pas**
  touché (rôle global, gardé `ROLE_IMMUTABLE`).
- **Capacités** : `grantCapability`/`revokeCapability` → table `grants`
  (org-scopée, chantier A). Mesure : `grants` = **0 ligne** (rien accordé).
- **Vocabulaire** : l'UI n'expose pas les 27 permissions brutes mais des
  **capacités** lisibles (« Gérer les finances »…), mappées via
  `src/lib/capabilities.ts`.

## 5. Peut-on créer un nouveau rôle ? Oui, techniquement — mais c'est un

piège de sécurité aujourd'hui.

- **Techniquement** : il suffit d'insérer des lignes
  `role_permissions(role, permission)` (TEXT libre, aucun CHECK). C'est
  **data-driven côté base**.
- **MAIS** le **frontend ne le saura pas** : `Role` (TS) est une **union
  littérale figée** de 14 valeurs ; `PERMISSION_MATRIX` est codé en dur. Un
  rôle créé en base serait **inconnu de l'UI** (`parseRole` → `null`,
  `getRolePermissions` → `[]`).
- **Danger** : un rôle ainsi créé n'aurait **aucun effet de sécurité**, puisque
  **aucune politique d'écriture n'appelle `has_permission`** (R137). Il
  afficherait des droits sans en conférer aucun — ou, plus grave, un rôle
  **sans** permission aurait quand même les droits d'écriture d'un membre
  (via `is_org_member`).

## 6. Reste à faire (concret)

1. **R137 (P2, sécurité)** : câbler `has_permission` dans les politiques
   d'écriture sensibles (~30). Bloque toute notion de « rôle créable » fiable.
2. **R109 (décision)** : trancher `ADMIN`/`CENTRAL_ADMIN` (2 options
   documentées) — débloque la garde de route `hasPermission` (P1).
3. **Création de rôle (nouveau, P3)** : si on veut la rendre possible,
   il faut rendre le modèle **data-driven des deux côtés** : charger les rôles
   depuis `role_permissions` au boot (au lieu de l'union TS figée), exposer un
   écran d'administration des rôles, et **d'abord** livrer R137 (sinon un rôle
   sans permission reste inopérant ou dangereux).

## Preuves (rejouables)

```sql
-- 1. has_permission jamais appelée en écriture
select count(*) filter (where qual ilike '%has_permission%'
                         or with_check ilike '%has_permission%') as avec,
       count(*) as total
from pg_policies where schemaname='public';   -- → 1 / 149 (la seule = lecture)

-- 2. Les politiques de transactions
select cmd, qual, with_check from pg_policies
where schemaname='public' and tablename='transactions';  -- → is_org_member seul

-- 3. Le rôle MEMBRE n'a que 2 permissions
select * from role_permissions where role='MEMBRE';  -- → event:read, transaction:read
```


## 7. CORRECTIF LIVRÉ (2026-10-29) — migration `20261029000002`

Les politiques d'écriture des **5 tables sensibles** (`transactions`,
`versements`, `members`, `events`, `groups`) ont été réécrites :

```sql
is_org_member(initplan_uid(), org_id)
AND has_permission(initplan_uid(), org_id, <res>, <act>)
```

Mesure après correctif : **15 politiques** d'écriture appellent
`has_permission` (3 par table × 5), contre **1** (une lecture) avant.

**Tables laissées en `is_org_member` seul (R137.a, documenté)** : `documents`
et `accounts` — aucune permission `document:*` / `account:*` n'existe dans le
modèle ; les contraindre fermerait l'écriture à tous les rôles.

### Preuves fonctionnelles (instance DEV, 2026-10-29, 0 résidu)

| Cas | Attendu | Mesuré |
|---|---|---|
| `MEMBRE` INSERT transaction (REST simulé) | refusé | **`42501` row-level security** |
| `ADMIN` INSERT transaction | accepté | **accepté** (erreur → contrainte métier, puis succès avec catégorie valide) |
| `has_permission(MEMBRE,…, 'transaction','create')` | false | **false** |
| `has_permission(ADMIN/PASTEUR/TREASURIER,…)` | true | **true** |

### Limite honnête

Le chemin d'écriture de l'**application** passe par PowerSync
(`powersync_role`, `rolbypassrls = true`) : la RLS ne le concerne **pas**. Le
correctif ferme la voie **REST/PostgREST directe**. Fermer la voie PowerSync
exige un contrôle côté connecteur/backend — chantier distinct, non traité ici.
