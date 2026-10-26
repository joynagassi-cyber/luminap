/**
 * Phase 4 — RBAC fin : décision UNIQUE de permission (miroir DB ↔ TS).
 *
 * Source de vérité : `PERMISSION_MATRIX` (`src/lib/rbac.ts`, 14 rôles canon).
 * Ce module en dérive :
 *   - `PERMISSION_TABLE` / `ROLE_PERMISSION_ROWS` : la table de vérité,
 *     consommée par la migration SQL `20261026000002_rbac_has_permission.sql`
 *     (générée depuis ces mêmes données → **mêmes tests** DB et TS) ;
 *   - `evaluatePermission()` : la décision, qui applique **les mêmes règles**
 *     que la fonction SQL `has_permission(uid, org, resource, action, scope)`.
 *
 * Règles (identiques DB ↔ TS) :
 *   1. Un **deny** explicite et applicable (même portée) l'emporte toujours.
 *   2. Sinon, un **rôle canon ACTIF** dans l'org détenant `resource:action`.
 *   3. Sinon, un **grant allow actif** (non révoqué, non expiré) couvrant la
 *      portée demandée (un grant sans portée = global ; un grant scopé ne
 *      couvre que sa portée exacte).
 *   4. Sinon : refus.
 *
 * Portées : `scope === undefined` ⇒ on exige un grant/deny GLOBAL. Un scope
 * fourni est couvert par un élément global OU de portée identique.
 */

import { PERMISSION_MATRIX, type Permission } from "./rbac";
import type { Role } from "@/types";

export type PermissionTable = Readonly<Record<Role, readonly Permission[]>>;

/** Table de vérité dérivée de la matrice canon (aucune copie manuelle). */
export const PERMISSION_TABLE: PermissionTable = PERMISSION_MATRIX;

export interface RolePermissionRow {
  role: Role;
  permission: Permission;
}

/**
 * Lignes (role, permission) — sérialisables en SQL. L'ordre est déterministe
 * (rôles triés, permissions triées) pour que la migration générée soit
 * reproductible et comparable en test.
 */
export const ROLE_PERMISSION_ROWS: RolePermissionRow[] = (
  Object.keys(PERMISSION_MATRIX) as Role[]
)
  .sort()
  .flatMap((role) =>
    [...PERMISSION_MATRIX[role]]
      .sort()
      .map((permission) => ({ role, permission })),
  );

export interface GrantRow {
  subjectType: "user" | "org_member" | "group_member" | "role" | "tag";
  subjectId: string;
  resource: string;
  action: string;
  effect?: "allow" | "deny";
  scope?: { resource: string; id: string };
  revokedAt?: string | null;
  expiresAt?: string | null;
}

export interface RoleAssignmentRow {
  role: Role | string;
  orgId: string;
  status: string;
}

export interface EvaluateInput {
  userId: string;
  orgId: string;
  resource: string;
  action: string;
  scope?: { resource: string; id: string };
  roles: RoleAssignmentRow[];
  grants: GrantRow[];
  /** Ids des tags portés par l'appelant (résolution des grants `tag`). */
  userTagIds?: string[];
  /** Ids des memberships/group_memberships de l'appelant (sources 3/5). */
  membershipIds?: string[];
  groupMembershipIds?: string[];
  /** Injectable pour les tests (expiration). */
  now?: Date;
}

export type DecisionReason = "deny" | "role" | "grant" | "none";

export interface PermissionDecision {
  allowed: boolean;
  reason: DecisionReason;
}

function isActive(g: GrantRow, now: Date): boolean {
  if (g.revokedAt) return false;
  if (g.expiresAt && new Date(g.expiresAt).getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

function scopeCovers(
  grantScope: { resource: string; id: string } | undefined,
  requested: { resource: string; id: string } | undefined,
): boolean {
  // Grant global (sans portée) couvre tout.
  if (!grantScope) return true;
  // Grant scopé : ne couvre qu'une demande de portée identique.
  if (!requested) return false;
  return grantScope.resource === requested.resource && grantScope.id === requested.id;
}

function grantAppliesToCaller(g: GrantRow, input: EvaluateInput): boolean {
  switch (g.subjectType) {
    case "user":
      return g.subjectId === input.userId;
    case "role":
      return input.roles.some(
        (r) => r.orgId === input.orgId && String(r.role) === g.subjectId,
      );
    case "tag":
      return (input.userTagIds ?? []).includes(g.subjectId);
    case "org_member":
      return (input.membershipIds ?? []).includes(g.subjectId);
    case "group_member":
      return (input.groupMembershipIds ?? []).includes(g.subjectId);
    default:
      return false;
  }
}

/**
 * Décision unique. **Deny prioritaire**, puis rôle canon, puis grant allow.
 */
export function evaluatePermission(input: EvaluateInput): PermissionDecision {
  const now = input.now ?? new Date();
  const matching = input.grants.filter(
    (g) =>
      g.resource === input.resource &&
      g.action === input.action &&
      isActive(g, now) &&
      grantAppliesToCaller(g, input) &&
      scopeCovers(g.scope, input.scope),
  );

  // 1. Deny prioritaire.
  if (matching.some((g) => g.effect === "deny")) {
    return { allowed: false, reason: "deny" };
  }

  // 2. Rôle canon ACTIF dans l'org détenant la permission.
  const permission = `${input.resource}:${input.action}` as Permission;
  for (const r of input.roles) {
    if (r.orgId !== input.orgId) continue;
    if (r.status !== "ACTIVE") continue;
    const perms = PERMISSION_TABLE[r.role as Role] as readonly string[] | undefined;
    if (perms?.includes(permission)) {
      return { allowed: true, reason: "role" };
    }
  }

  // 3. Grant allow applicable.
  if (matching.some((g) => (g.effect ?? "allow") === "allow")) {
    return { allowed: true, reason: "grant" };
  }

  return { allowed: false, reason: "none" };
}
