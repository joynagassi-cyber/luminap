# Receipt — Clôture de l'audit d'écriture + mesures R16/R62/R74

- **Date** : 2026-10-31
- **Branche** : `agent/r140-audit-append-only` (PR #157)
- **Nature** : audit exhaustif + documentation (R141.e ouvert, R16/R62 mesuré, R74 cadré)

## 1. R141.e — dernière politique d'écriture hors garde

Après R141.d, un **audit exhaustif** de `pg_policies` (toute politique
INSERT/UPDATE/DELETE hors `has_permission`/`is_org_member`/`is_org_admin`) ne
laisse qu'**une** politique d'écriture hors garde de rôle :

- `org_reports_emitter` — `FOR ALL`, `TO public`,
  `USING/WITH CHECK (from_org_id = current_org_id())`.

`current_org_id()` lit `profiles.org_id` → tout membre authentifié de l'org
émettrice peut INSERT/UPDATE un rapport fédéré via le client REST direct.

**Non corrigé (décision assumée)** : le flux d'émission est **fédéré** et
`/admin/report-send` est atteignable depuis `CentralAdmin` — donc potentiellement
par un `CENTRAL_ADMIN`, rôle **hors canon** (R109 / D-S10-3, décision
propriétaire). Exiger `has_permission(...,'admin','settings')` **casserait**
l'émission si elle est faite par un `CENTRAL_ADMIN`. Le durcissement est
**bloqué** par la même décision de modèle que R142.

Sûreté mesurée : les écritures applicatives de `org_reports` passent par
PowerSync (`powersync_role` = BYPASSRLS ; `FORCE RLS` ne le concerne pas) → un
durcissement serait app-safe, il ne reste qu'à choisir la permission.

Autres politiques hors garde, **toutes correctes** (revues) :
- `profiles_insert_self` / `profiles_update` / `profiles_delete` — `initplan_uid() = id` (ses propres lignes ; `role` immuable par trigger, R15/R91).
- `org_admins_insert_merged` / `org_admins_update_merged` / `orgs_update_merged` — `profiles.role = 'ADMIN'` (branche admin canonique de R109).
- `invitation_claims_insert` — `initplan_uid() IS NOT NULL AND (… OR can_manage_invitations(…))` (garde présente).

## 2. R16 / R62 — divergence du rôle (mesurée)

- **Données actuelles** : 2 profils, **2/2 cohérents** (`profiles.role` =
  `org_memberships.role`) → 0 divergence.
- **Résolution du rôle (mesurée)** : `has_permission` (DB, et donc toutes les
  politiques d'écriture R137/R141/R141.d) lit **`org_memberships.role`** ;
  l'UI legacy lit **`profiles.role`** (via `authService.persistCurrentUser` →
  `lumina-user` → `useCurrentUser`).
- **Vecteur résiduel** : `assignMemberRole` (`src/lib/orgAdmin.ts`) écrit
  `org_memberships` **seul** (commentaire « jamais `profiles.role` (D3) ») →
  changer le rôle d'un membre par l'UI admin ne met pas à jour `profiles.role` ;
  l'UI legacy reste sur l'ancien rôle **jusqu'au prochain claim** (qui, lui,
  écrit les deux depuis la même valeur — `settle_invitation_claim`).
- **Décision** : source unique de rôle = **décision propriétaire** ; aucune
  réparation de données ni changement de modèle en autonomie (conservateur).

## 3. R74 / P-NEW-6 — sémantique de `action_type` (cadrée)

Icône corrigée (2026-10-27). Reste la **sémantique** : 3 sites écrivent un rôle
dans `action_type` via `as any` (`InvitationClaim.tsx`, `Versement.tsx`,
`EventNew.tsx`). Décision de conception (séparer « type d'événement » de
« destinataire ») = propriétaire ; non bloquante.

## Gates

- `npx tsc -b` → **0**
- `npx vitest run` → **1750/1750** (159 fichiers)
