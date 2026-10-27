# Contrat d'interface — RBAC organisationnel simplifié (session 11)

> **But** : rendre le RBAC *utilisable par un administrateur non technique* —
> assigner un rôle à un utilisateur **et** accorder des capacités, dans le
> périmètre d'**une organisation** — et rendre **visible dans l'UI** ce que
> l'utilisateur peut ou ne peut pas faire.
>
> Ce document est **figé avant implémentation**. Les chantiers parallèles
> (§5) ne peuvent pas modifier les interfaces ci-dessous sans coordination :
> c'est ce qui évite les collisions de fichiers.

## 1. État mesuré (2026-10-26)

| Élément | État réel | Preuve |
|---|---|---|
| `has_permission(uid, org, res, act, scope_res, scope_id)` | **existe** (SQL, deny > rôle canon > grant) | migration `20261026000002` |
| `role_permissions` (14 rôles × 28 perms = **149 lignes**) | **existe**, miroir de `PERMISSION_MATRIX` | requête DB |
| `grants` (`subject_type`/`subject_id`/`resource`/`action`/`scope_*`/`effect`/`expires_at`) | **existe**, **0 ligne** | requête DB |
| `settle_invitation_claim` (rôle + org + grants + tags + groupe) | **existe** (SECURITY DEFINER) | migration `20261024000004` |
| `federation.canAccess(userId, orgId, resource, action, scope?)` | **existe** (union 5 sources) | `src/capabilities/federation` |
| `evaluatePermission()` (miroir TS de `has_permission`) | **existe** | `src/lib/permissions.ts` |
| **UI d'assignation rôle + capacités** | **ABSENTE** | — |
| **UI « ce que je peux faire »** | **ABSENTE** | — |
| **Cloisonnement des `grants` par organisation** | **ABSENT** : `grants` n'a **pas** de colonne `org_id` ; la policy est `SELECT USING (true)` → tout grant `subject_type='user'` s'applique dans **toutes** les orgs | migration `20260921000005` |

## 2. Décisions d'architecture (figées)

### D1 — Le périmètre d'un grant est une organisation
Un `grant` accorde une capacité **dans une organisation**. On ajoute donc une
colonne **`org_id TEXT NOT NULL`** à `public.grants` (défaut `'__no_org__'`
pour les lignes historiques), indexée. Conséquences :

- `has_permission` ne considère un grant `user`/`org_member`/`group_member`
  que si **`g.org_id = p_org`**.
- Les grants `role`/`tag` restent **résolus dans l'org** (déjà le cas) et
  sont donc aussi contraints par `g.org_id = p_org`.
- La policy de lecture devient org-scopée : un membre ne lit que les grants
  de **ses** organisations.

### D2 — Une capacité se désigne par `resource:action`, jamais par un rôle
L'UI n'expose **pas** les 28 permissions brutes comme un mur de cases. Elle
expose des **capacités lisibles** (« Gérer les finances », « Émettre des
invitations », …) regroupées par domaine, chacune mappée à une ou plusieurs
`resource:action`. Un rôle = un **paquet** de capacités ; un grant = une
capacité **supplémentaire** (allow) ou **retirée** (deny).

### D3 — L'assignation de rôle passe par `org_memberships`, pas par `profiles`
Le rôle « dans une organisation » est `org_memberships.role` (clé
`(user_id, org_id, role)`), gardé par la policy `om_update`
(`is_org_admin`). On **ne touche pas** `profiles.role` (rôle global, gardé
`ROLE_IMMUTABLE`). L'UI écrit donc `org_memberships`, ce qui est déjà
autorisé pour un admin d'org — aucune nouvelle RLS requise pour le rôle.

### D4 — L'écriture des capacités (grants) reste admin-only
`grants` n'a aujourd'hui **aucune** policy d'écriture (donc deny-all hors
`service_role`/`powersync_role`). On ajoute une policy `INSERT/UPDATE`
réservée à `is_org_admin(initplan_uid(), org_id)` — l'admin accorde/retire
des capacités **dans sa propre org**, jamais ailleurs.

### D5 — La décision unique reste `has_permission` / `evaluatePermission`
Aucun chantier ne réimplémente la décision. L'UI consomme
`federation.canAccess(...)` (via `useCanAccessMulti`). Le nouveau hook de
visibilité (§4) en est une **projection en lecture**.

## 3. Interfaces figées (ne pas casser)

### 3.1 SQL — `public.grants`
```sql
-- Ajout (migration 20261027000010_grants_org_scope.sql)
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT '__no_org__';
CREATE INDEX IF NOT EXISTS idx_grants_org ON public.grants (org_id);
-- Lecture : org-scopée
DROP POLICY IF EXISTS grants_read_org ON public.grants;
CREATE POLICY grants_read_org ON public.grants FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.org_memberships
                     WHERE user_id = initplan_uid() AND status = 'ACTIVE')
         OR public.is_org_admin(initplan_uid(), org_id));
-- Écriture : admin de l'org uniquement
CREATE POLICY grants_insert_admin ON public.grants FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(initplan_uid(), org_id));
CREATE POLICY grants_update_admin ON public.grants FOR UPDATE TO authenticated
  USING (public.is_org_admin(initplan_uid(), org_id))
  WITH CHECK (public.is_org_admin(initplan_uid(), org_id));
```

`has_permission` ajoute `AND g.org_id = p_org` dans le CTE `applicable`.

### 3.2 SQL — `public.invitations` (portage du rôle/org/capacités)
Colonnes **déjà présentes** : `target_role`, `grants_payload`, `tags_payload`,
`target_scope_resource`, `target_scope_id`, `org_id`. **Aucun changement**
n'est requis : le trigger `settle_invitation_claim` les matérialise déjà.
Seul ajout utile : propager `org_id` dans les grants insérés par le trigger
(`g.org_id := inv.org_id`).

### 3.3 TS — `src/lib/capabilities.ts` (NOUVEAU, figé)
```ts
export interface Capability {
  id: string;              // ex. "finance.manage"
  label: string;           // ex. "Gérer les finances"
  description: string;     // phrase courte pour l'admin
  domain: "finance" | "members" | "events" | "groups" | "reports" | "invitations" | "admin";
  permissions: Permission[]; // resource:action réellement vérifiés
}
export const CAPABILITIES: readonly Capability[];
export function capabilitiesForRole(role: Role): Capability[];
export function capabilityById(id: string): Capability | undefined;
export function permissionsOfCapability(id: string): Permission[];
export function capabilityGrantPayload(cap: Capability): { resource: string; action: string }[];
```

### 3.4 TS — `src/hooks/useMyCapabilities.ts` (NOUVEAU, figé)
```ts
export interface CapabilityState { capability: Capability; allowed: boolean; source: string; }
export function useMyCapabilities(orgId?: string): {
  role: Role | null;
  capabilities: CapabilityState[];   // toutes, allowed = vrai/faux
  allowed: Capability[];             // projection lisible
  loading: boolean;
};
```

### 3.5 TS — `src/lib/orgAdmin.ts` (NOUVEAU, figé)
```ts
export async function assignMemberRole(userId: string, orgId: string, role: Role): Promise<void>;
export async function grantCapability(userId: string, orgId: string, capabilityId: string): Promise<string>;
export async function revokeCapability(grantId: string): Promise<void>;
export async function listMemberCapabilities(userId: string, orgId: string): Promise<{grantId: string; capabilityId: string; effect: "allow"|"deny"}[]>;
```
(Implémentation : `org_memberships` via PowerSync + `grants` via
`createGrantPS`/`revokeGrantPS`, en renseignant `org_id`.)

### 3.6 UI — page `src/pages/OrgRoles.tsx` (NOUVEAU, route `/admin/roles`)
Écran unique d'administration des accès :
1. liste des membres de l'org avec leur rôle (select) ;
2. pour le membre sélectionné : les capacités (cases à cocher) héritées du
   rôle (verrouillées) + les capacités supplémentaires (grants) ;
3. bouton « Enregistrer » → `assignMemberRole` + `grantCapability`/`revokeCapability`.

Route ajoutée au registre : `{ pattern: "/admin/roles", kind: "app", permission: "admin:roles" }`
et au fichier `src/ionic/routes/admin.tsx`.

### 3.7 UI — bandeau de capacités `src/components/CapabilityBanner.tsx` (NOUVEAU)
Composant réutilisable affichant « Vous pouvez / Vous ne pouvez pas » à
partir de `useMyCapabilities`. Placé en tête de `Members`, `Finance`,
`Events`, `Groups`, `Reports`, `InvitationManage`.

## 4. Chantiers parallèles (périmètre de fichiers strict)

| # | Chantier | Fichiers autorisés (exclusifs) |
|---|---|---|
| **A** | Migration SQL : `grants.org_id`, policies org-scopées, `has_permission` contraint, trigger propage `org_id` | `supabase/migrations/20261027000010_grants_org_scope.sql`, `supabase/migrations/rollback/20261027000010_rollback.sql`, `supabase/migrations/20261027000011_settle_propagate_org.sql` |
| **B** | Modèle de capacités + hooks + couche d'écriture | `src/lib/capabilities.ts`, `src/lib/orgAdmin.ts`, `src/hooks/useMyCapabilities.ts`, tests `src/lib/__tests__/capabilities.test.ts`, `src/hooks/__tests__/useMyCapabilities.test.tsx`, `src/lib/__tests__/orgAdmin.test.ts` |
| **C** | UI admin (`OrgRoles.tsx`, route) + bandeau de capacités dans les pages | `src/pages/OrgRoles.tsx`, `src/ionic/routes/admin.tsx`, `src/lib/routeResolver.ts`, `src/components/CapabilityBanner.tsx`, `src/pages/Members.tsx`, `src/pages/Finance.tsx`, `src/pages/Events.tsx`, `src/pages/Groups.tsx`, `src/pages/Reports.tsx`, `src/pages/InvitationManage.tsx` |
| **D** | Preuve E2E du flux d'invitation (rôle + org + capacités par les 4 transports) | `src/capabilities/__tests__/invitation-rbac-e2e.test.ts` |

**Règles** : aucun chantier n'édite un fichier d'un autre chantier. `PROGRESS.md`
et le receipt sont édités **par le coordinateur** (moi) au merge, pas par les
agents (évite le conflit sur un fichier partagé).

## 5. Ordre de merge

A (SQL) → B (modèle) → C (UI) → D (E2E). B et C dépendent de A seulement par
les **interfaces** ci-dessus, pas par le code : ils peuvent être développés en
parallèle et mergés dans cet ordre.
