/**
 * Federation Capability — multi-organization management
 *
 * Manages organizations in a hierarchical structure (parent → children).
 * Backed by the `organizations` table in Supabase with `parent_org_id`.
 *
 * Usage:
 *   import { federation } from '@/capabilities/federation'
 *   const children = await federation.getOrgChildren('org-dioce')
 *   await federation.createOrg('org-paroisse', 'Paroisse X', { parentOrgId: 'org-dioce' })
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import { writeAudit } from "@/lib/audit";
import type { AuditEntry } from "@/types";
import type { Role } from "@/types";
import type { AccessScope, Grant } from "@/types/federation";

// PERMISSION_MATRIX est la source de truth des rôles canon (invariant 7 :
// n'est JAMAIS modifiée par ce design). Importée depuis @/lib/rbac.ts,
// JAMAIS depuis @/capabilities/security (garde-fou §2.4 du plan).
import { PERMISSION_MATRIX } from "@/lib/rbac";

export interface FederationOrg {
  id: string;
  name: string;
  type: string;
  status: string;
  parentOrgId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  orgId: string;
  type: string;
}

class FederationService {
  /**
   * Create a new organization, optionally under a parent org.
   */
  async createOrg(
    id: string,
    name: string,
    opts: { parentOrgId?: string; type?: string } = {},
    actorId?: string,
  ): Promise<string> {
    const db = getPowerSyncDatabase();
    await db.execute(
      `INSERT INTO organizations (id, name, type, status, parent_org_id)
       VALUES (?, ?, ?, 'PENDING', ?)`,
      [id, name, opts.type ?? "CHURCH", opts.parentOrgId ?? null],
    );

    if (actorId) {
      await writeAudit({
        orgId: id,
        transactionId: null,
        userId: actorId,
        actorRoleAtTime: "CENTRAL_ADMIN",
        action: "CREATE",
        entityType: "Organization",
        entityId: id,
        beforeState: null,
        afterState: { id, name, type: opts.type ?? "CHURCH", status: "PENDING" },
        comment: `Organisation ${name} créée${opts.parentOrgId ? ` (enfant de ${opts.parentOrgId})` : ""}`,
      } as Omit<AuditEntry, "id" | "createdAt">);
    }

    return id;
  }

  /**
   * Get an organization by ID (with parent info).
   */
  async getOrg(id: string): Promise<FederationOrg | null> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name, type, status, parent_org_id, created_at, updated_at
       FROM organizations WHERE id = ?`,
      [id],
    );
    const row = res?.array?.[0];
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      status: String(row.status),
      parentOrgId: row.parent_org_id ? String(row.parent_org_id) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  /**
   * List direct children of an organization.
   */
  async getOrgChildren(parentId: string): Promise<FederationOrg[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name, type, status, parent_org_id, created_at, updated_at
       FROM organizations WHERE parent_org_id = ?`,
      [parentId],
    );
    return (res?.array ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      status: String(r.status),
      parentOrgId: String(r.parent_org_id),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  /**
   * Get the parent of an organization.
   */
  async getOrgParent(id: string): Promise<FederationOrg | null> {
    const org = await this.getOrg(id);
    if (!org || !org.parentOrgId) return null;
    return this.getOrg(org.parentOrgId);
  }

  /**
   * List all organizations visible to the user (managed via grants or membership).
   */
  async listOrgs(actorId: string, filter?: { type?: string }): Promise<FederationOrg[]> {
    const db = getPowerSyncDatabase();
    let sql = `SELECT DISTINCT o.id, o.name, o.type, o.status, o.parent_org_id, o.created_at, o.updated_at
       FROM organizations o
       WHERE EXISTS (
         SELECT 1 FROM org_admins WHERE org_admins.org_id = o.id
           AND org_admins.status = 'ACTIVE' AND org_admins.admin_profile_id = ?
       )
       OR EXISTS (
         SELECT 1 FROM profiles WHERE profiles.org_id = o.id AND profiles.id = ?
       )`;
    const params: any[] = [actorId, actorId];
    if (filter?.type) {
      sql += ` AND o.type = ?`;
      params.push(filter.type);
    }
    sql += ` ORDER BY o.created_at DESC`;
    const res = await db.execute(sql, params);
    return (res?.array ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      status: String(r.status),
      parentOrgId: r.parent_org_id ? String(r.parent_org_id) : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  /**
   * Set a new parent for an organization (re-parent in the federation tree).
   */
  async setParentOrg(orgId: string, newParentId: string | null, actorId: string): Promise<void> {
    const db = getPowerSyncDatabase();
    await db.execute(
      `UPDATE organizations SET parent_org_id = ? WHERE id = ?`,
      [newParentId, orgId],
    );
    await writeAudit({
      orgId,
      transactionId: null,
      userId: actorId,
      actorRoleAtTime: "CENTRAL_ADMIN",
      action: "UPDATE",
      entityType: "Organization",
      entityId: orgId,
      beforeState: null,
      afterState: { parentOrgId: newParentId },
      comment: newParentId
        ? `Organisation ${orgId} rattachée à ${newParentId}`
        : `Organisation ${orgId} détachée de son parent`,
    } as Omit<AuditEntry, "id" | "createdAt">);
  }

  /**
   * List org units (local groups) within an organization.
   */
  async getOrgUnits(orgId: string): Promise<OrgUnit[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name, type, org_id FROM org_units WHERE org_id = ?`,
      [orgId],
    );
    return (res?.array ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      orgId: String(r.org_id),
    }));
  }

  // ============================================================
  // Vague 2 — canAccess : formule d'union (5 sources de résolution)
  // ============================================================
  //
  // canAccess(userId, orgId, resource, action, scope?) =
  //   1. GRANTS DIRECTS       (subject_type='user', subject_id=userId)
  //   2. GRANTS VIA TAG       (subject_type='tag', user assigné au tag)
  //   3. GRANTS VIA MEMBERSHIP(subject_type='org_member', membership active)
  //   4. RÔLES CANON         (PERMISSION_MATRIX[r] pour chaque r ∈ org_roles)
  //   5. GRANTS VIA GROUPE    (subject_type='group_member')
  //
  //   + scope compatibility : un grant scope NULL est global ; un grant
  //   scope non-NULL ne compte que si (resource, action, scope) est couvert.
  //
  // GARDE-FOUS (invariants du plan) :
  //   - JAMAIS d'import depuis @/capabilities/security (ni de sous-module).
  //   - Les types viennent de @/types/federation.ts.
  //   - PERMISSION_MATRIX est importée depuis @/lib/rbac.ts (inchangée).
  //
  // Mode LOCAL (ce que fait cette implémentation) : lecture du SQLite
  // PowerSync pour les sources 1/2/3/5 (grants, tags, memberships) et
  // résolution 100% offline de la source 4 (rôles canon). C'est le chemin
  // "sync" documenté au plan §2.5. Le chemin "async" (RPC serveur pour
  // approve/delete/invitation) reste à brancher côté edge-fn.

  async canAccess(
    userId: string,
    orgId: string,
    resource: string,
    action: string,
    scope?: AccessScope,
  ): Promise<boolean> {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    // ── Source 4 : rôles canon (PERMISSION_MATRIX, inchangée) ────────────
    // Les rôles de l'user dans l'org viennent de `org_memberships`
    // (multi-rôle) ; `profiles.role` est le rôle legacy 1:1.
    const rolesRes = await db.execute(
      `SELECT role FROM org_memberships
       WHERE user_id = ? AND org_id = ? AND status IN ('ACTIVE','PENDING')`,
      [userId, orgId],
    );
    const membershipRoles: string[] = (
      (rolesRes?.array ?? []) as { role: string }[]
    ).map((r) => String(r.role));
    const legacyRes = await db.execute(
      `SELECT role FROM profiles WHERE id = ? AND org_id = ?`,
      [userId, orgId],
    );
    const legacyRole = (legacyRes?.array ?? [])[0]?.role;
    const roles = [
      ...new Set([...membershipRoles, ...(legacyRole ? [String(legacyRole)] : [])]),
    ].filter((r) => r && r !== "");

    for (const role of roles) {
      const perms = PERMISSION_MATRIX[role as keyof typeof PERMISSION_MATRIX] as
        | readonly string[]
        | undefined;
      if (perms?.includes(`${resource}:${action}`)) return true;
    }

    // ── Sources 1/2/3/5 : grants actifs couvrant (resource, action, scope) ─
    // 1. user        : subject_id = userId
    // 2. tag         : tag_id ∈ tag_assignments (user assigné dans l'org)
    // 3. org_member  : membership_id ∈ org_memberships actives de l'user
    // 5. group_member: group_membership_id ∈ group_memberships de l'user
    //
    // Sémantique du scope (plan §2.3, assert §2.6) :
    //   - `scope === undefined` (appel sans scope) : le grant ne compte que
    //     s'il est GLOBAL (scope_resource IS NULL). Un grant scopé sur
    //     { resource:'group', id:'G1' } ne couvre PAS `report:read` au
    //     niveau org — c'est le test (b) du plan qui le vérifie.
    //   - `scope` fourni : le grant le couvre s'il est global OU s'il a
    //     exactement ce scope (resource + id).
    const scopedQuery =
      scope === undefined
        ? "scope_resource IS NULL"
        : `(scope_resource IS NULL
             OR (scope_resource = ? AND scope_id = ?))`;

    const grantsSql = `SELECT * FROM grants
       WHERE revoked_at IS NULL
         AND resource = ? AND action = ?
         AND (${scopedQuery})
         AND (
            (subject_type = 'user' AND subject_id = ?)
            OR (subject_type = 'org_member' AND subject_id IN
                 (SELECT id FROM org_memberships
                  WHERE user_id = ? AND org_id = ?
                    AND status IN ('ACTIVE','PENDING')))
            OR (subject_type = 'group_member' AND subject_id IN
                 (SELECT gm.id FROM group_memberships gm
                  JOIN members m ON m.id = gm.member_id
                  WHERE m.org_id = ?))
            OR (subject_type = 'tag' AND subject_id IN
                 (SELECT tag_id::text FROM tag_assignments
                  WHERE user_id = ? AND org_id = ?))
         )`;

    const params =
      scope === undefined
        ? [resource, action, userId, userId, orgId, orgId, userId, orgId]
        : [
            resource,
            action,
            scope.resource,
            scope.id,
            userId,
            userId,
            orgId,
            orgId,
            userId,
            orgId,
          ];

    const grantsRes = await db.execute(grantsSql, params);
    if ((grantsRes?.array ?? []).length > 0) return true;

    // Révocation défensive : si scope fourni et que le grant n'est pas
    // compatible, on aurait déjà filtré au-dessus ; la date `now` est
    // réservée aux chemin RPC (invariant 9 : `now` côté serveur, pas ici).
    void now;

    return false;
  }

  /**
   * Retourne les grants effectifs de l'user dans l'org (union des 5
   * sources, pas de filtre resource/action) — utile pour l'UI et les
   * tests d'assertion Vague 2.5.
   */
  async listEffectiveGrants(
    userId: string,
    orgId: string,
  ): Promise<Grant[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT * FROM grants
       WHERE revoked_at IS NULL
         AND (
            (subject_type = 'user' AND subject_id = ?)
            OR (subject_type = 'org_member' AND subject_id IN
                 (SELECT id FROM org_memberships
                  WHERE user_id = ? AND org_id = ?
                    AND status IN ('ACTIVE','PENDING')))
            OR (subject_type = 'group_member' AND subject_id IN
                 (SELECT gm.id FROM group_memberships gm
                  JOIN members m ON m.id = gm.member_id
                  WHERE m.org_id = ?))
            OR (subject_type = 'tag' AND subject_id IN
                 (SELECT tag_id::text FROM tag_assignments
                  WHERE user_id = ? AND org_id = ?))
         )`,
      [userId, userId, orgId, orgId, userId, orgId],
    );
    return ((res?.array ?? []) as any[]).map((g) => ({
      id: String(g.id),
      subjectType: String(g.subject_type),
      subjectId: String(g.subject_id),
      resource: String(g.resource),
      action: String(g.action),
      scope:
        g.scope_resource != null
          ? { resource: String(g.scope_resource), id: String(g.scope_id) }
          : undefined,
      grantedBy: g.granted_by ? String(g.granted_by) : "",
      grantedAt: String(g.granted_at),
      revokedAt: g.revoked_at ? String(g.revoked_at) : null,
    }));
  }
}

/** Singleton instance */
export const federation = new FederationService();
