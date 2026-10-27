/**
 * Couche d'écriture admin — rôle + capacités (chantier B, §3.5 du contrat RBAC).
 *
 * D3 : le rôle « dans une organisation » est `org_memberships.role` — on ne
 * touche PAS `profiles.role` (rôle global, gardé `ROLE_IMMUTABLE`).
 * D4 : l'écriture des `grants` reste admin-only ; le client se contente de
 * pousser l'écriture via PowerSync (la policy `grants_insert_admin` /
 * `grants_update_admin` tranche côté serveur).
 *
 * Toute la logique DÉCISIONNELLE (plan d'écriture du membership, décomposition
 * d'une capacité en grants, remontée grants → capacités) est isolée dans des
 * fonctions PURES, testables sans base : `roleToMembershipWrite`,
 * `buildGrantInputs`, `grantsToCapabilities`.
 */

import { capabilityById, capabilityGrantPayload, type Capability } from "@/lib/capabilities";
import type { Permission } from "@/lib/rbac";
import { CAPABILITIES } from "@/lib/capabilities";
import { getPowerSyncDatabase } from "@/lib/powersync";
import {
  createGrantPS,
  executeWrite,
  revokeGrantPS,
} from "@/lib/dataLayer";
import type { Role } from "@/types";

/** Ligne `org_memberships` telle que lue côté client (snake_case). */
export interface MembershipRow {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  is_primary?: number | boolean | null;
  status?: string | null;
}

/**
 * Plan d'écriture pour l'assignation d'un rôle dans une organisation.
 * - `insert` : aucune ligne (user, org) → on insère (primaire si l'user n'avait
 *   aucune appartenance).
 * - `update` : une ligne (user, org) existe → on change SON rôle (contrainte
 *   UNIQUE (user_id, org_id, role) respectée : jamais deux lignes concurrentes
 *   pour le même couple user/org).
 */
export type MembershipWritePlan =
  | { kind: "insert"; isPrimary: boolean }
  | { kind: "update"; id: string };

/**
 * Décide INSERT vs UPDATE pour `assignMemberRole`, à partir des lignes
 * `org_memberships` déjà présentes POUR CET UTILISATEUR (toutes orgs).
 *
 * Règle : s'il existe AU MOINS une ligne pour (user, org), on met à jour la
 * ligne cible (celle qui porte déjà le rôle visé, sinon la ligne ACTIVE, sinon
 * la première) ; sinon on insère — et cette insertion est `is_primary` s'il
 * s'agit de la toute première appartenance de l'utilisateur.
 */
export function roleToMembershipWrite(
  existing: readonly MembershipRow[],
  userId: string,
  orgId: string,
  role: Role,
): MembershipWritePlan {
  const forUserOrg = existing.filter(
    (m) => m.user_id === userId && m.org_id === orgId,
  );
  if (forUserOrg.length === 0) {
    return { kind: "insert", isPrimary: existing.length === 0 };
  }
  const target =
    forUserOrg.find((m) => m.role === role) ??
    forUserOrg.find((m) => m.status === "ACTIVE") ??
    forUserOrg[0];
  return { kind: "update", id: target.id };
}

/**
 * Entrée d'écriture d'un grant `subject_type='user'` dans une organisation.
 * `org_id` est le cloisonnement ajouté par le chantier A (migration
 * `20261027000010_grants_org_scope.sql`).
 */
export interface GrantWriteInput {
  org_id: string;
  subject_type: "user";
  subject_id: string;
  resource: string;
  action: string;
  scope_resource: string | null;
  scope_id: string | null;
  granted_by: string | null;
}

/**
 * Décompose une capacité en autant d'entrées de grant que de paires
 * `resource:action` uniques. Pur — aucune écriture.
 */
export function buildGrantInputs(
  userId: string,
  orgId: string,
  cap: Capability,
): GrantWriteInput[] {
  return capabilityGrantPayload(cap).map(({ resource, action }) => ({
    org_id: orgId,
    subject_type: "user" as const,
    subject_id: userId,
    resource,
    action,
    scope_resource: null,
    scope_id: null,
    granted_by: userId,
  }));
}

/** Grant actif tel que lu pour la remontée vers les capacités. */
export interface MemberGrantRow {
  id: string;
  resource: string;
  action: string;
  effect?: string | null;
}

/** Capacité effective d'un membre, rattachée au grant qui la porte. */
export interface MemberCapability {
  grantId: string;
  capabilityId: string;
  effect: "allow" | "deny";
}

/**
 * Remonte une liste de grants vers les capacités qu'ils composent.
 * Pur — aucune lecture DB. Un même grant peut alimenter plusieurs capacités
 * (ex. `report:read` ∈ `finance.view` ET `reports.manage`).
 */
export function grantsToCapabilities(
  grants: readonly MemberGrantRow[],
): MemberCapability[] {
  const out: MemberCapability[] = [];
  const seen = new Set<string>();
  for (const grant of grants) {
    const permission = `${grant.resource}:${grant.action}`;
    const effect: "allow" | "deny" = grant.effect === "deny" ? "deny" : "allow";
    for (const cap of CAPABILITIES) {
      if (!cap.permissions.includes(permission as Permission)) continue;
      const key = `${grant.id}|${cap.id}|${effect}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ grantId: grant.id, capabilityId: cap.id, effect });
    }
  }
  return out;
}

/**
 * Assigne (ou change) le rôle d'un membre dans une organisation.
 * Écrit `org_memberships` via PowerSync — jamais `profiles.role` (D3).
 */
export async function assignMemberRole(
  userId: string,
  orgId: string,
  role: Role,
): Promise<void> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT id, user_id, org_id, role, status FROM org_memberships
      WHERE user_id = ? AND org_id = ?`,
    [userId, orgId],
  );
  const existing = ((res?.array ?? []) as unknown) as MembershipRow[];
  const plan = roleToMembershipWrite(existing, userId, orgId, role);

  if (plan.kind === "insert") {
    await executeWrite(
      `INSERT INTO org_memberships (id, user_id, org_id, role, is_primary, status, joined_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [
        crypto.randomUUID(),
        userId,
        orgId,
        role,
        plan.isPrimary ? 1 : 0,
        new Date().toISOString(),
      ],
    );
    return;
  }

  await executeWrite(
    `UPDATE org_memberships
        SET role = ?, status = 'ACTIVE', left_at = NULL
      WHERE id = ?`,
    [role, plan.id],
  );
}

/**
 * Accorde une capacité à un utilisateur dans une organisation : un grant
 * `subject_type='user'` par paire `resource:action` de la capacité.
 * Retourne l'identifiant de la capacité accordée.
 */
export async function grantCapability(
  userId: string,
  orgId: string,
  capabilityId: string,
): Promise<string> {
  const cap = capabilityById(capabilityId);
  if (!cap) {
    throw new Error(`[orgAdmin] capacité inconnue : ${capabilityId}`);
  }
  for (const input of buildGrantInputs(userId, orgId, cap)) {
    await createGrantPS(input);
  }
  return cap.id;
}

/** Révoque un grant (soft delete : `revoked_at`). */
export async function revokeCapability(grantId: string): Promise<void> {
  await revokeGrantPS(grantId);
}

/**
 * Liste les capacités effectives d'un membre dans une organisation, en lisant
 * ses grants actifs (`subject_type='user'`) et en les remontant vers le modèle
 * de capacités.
 */
export async function listMemberCapabilities(
  userId: string,
  orgId: string,
): Promise<MemberCapability[]> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT id, resource, action, effect FROM grants
      WHERE org_id = ?
        AND subject_type = 'user'
        AND subject_id = ?
        AND revoked_at IS NULL`,
    [orgId, userId],
  );
  return grantsToCapabilities(((res?.array ?? []) as unknown) as MemberGrantRow[]);
}
