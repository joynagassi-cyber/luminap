/**
 * Central Administration Capability (T6 — administration centrale multi-org).
 *
 * Actions de l'admin central sur les organisations :
 *   - cycle de vie    : suspend / réactiver / archiver (ARCHIVED ≠ DELETE)
 *   - délégation      : assigner / révoquer un admin central (grant)
 *   - lecture         : stats par statut, activité récente (audit_entries)
 *
 * Règle de sécurité (spec §21) : le front n'est PAS la barrière. Chaque
 * action est écrite via l'upload queue PowerSync vers PostgreSQL, où le
 * scoping RLS (helper `is_org_member`) rejette toute mutation sans le
 * grant/membership correspondant. L'UI ne fait que déclencher ; le serveur
 * arbitre. Chaque mutation est journalisée dans `audit_entries`
 * (qui/quoi/quand/org/avant/après/pourquoi) via le système d'audit canonique.
 */

import {
  createOrganizationPS,
  setOrganizationStatusPS,
  grantOrgAdminPS,
  revokeOrgAdminPS,
  getOrgAdminsFull,
  type OrgStatus,
  type OrgType,
  type PSOrganization,
  type PSOrgAdminWithProfile,
} from "@/lib/dataLayer";
import { writeAudit } from "@/lib/audit";
import { getPowerSyncDatabase } from "@/lib/powersync";
import type { AuditEntry } from "@/types";

const ACTIONS = {
  SUSPEND: "UPDATE",
  REACTIVATE: "UPDATE",
  ARCHIVE: "ARCHIVE",
  CREATE_ORG: "CREATE",
  ASSIGN_ADMIN: "CREATE",
  REVOKE_ADMIN: "REVOKE",
} as const;

function buildAudit(
  orgId: string,
  actorId: string,
  action: AuditEntry["action"],
  entity: string,
  entityId: string,
  before: unknown,
  after: unknown,
  comment: string,
): Omit<AuditEntry, "id" | "createdAt"> {
  return {
    orgId,
    transactionId: null,
    userId: actorId,
    actorRoleAtTime: "CENTRAL_ADMIN",
    action,
    entityType: entity,
    entityId,
    beforeState: before ?? null,
    afterState: after ?? null,
    comment,
  };
}

/**
 * Suspend une organisation (lifecycle). L'historique est conservé.
 * Le serveur rejette si l'acteur n'a pas le droit (RLS org_admins).
 */
export async function suspendOrganization(
  orgId: string,
  actorId: string,
  before?: PSOrganization,
): Promise<void> {
  await setOrganizationStatusPS(orgId, "SUSPENDED", actorId);
  await writeAudit(
    buildAudit(
      orgId,
      actorId,
      ACTIONS.SUSPEND,
      "Organization",
      orgId,
      before,
      { status: "SUSPENDED" },
      `Organisation ${orgId} suspendue`,
    ),
  );
}

/** Réactiver une organisation suspendue. */
export async function reactivateOrganization(
  orgId: string,
  actorId: string,
  before?: PSOrganization,
): Promise<void> {
  await setOrganizationStatusPS(orgId, "ACTIVE", actorId);
  await writeAudit(
    buildAudit(
      orgId,
      actorId,
      ACTIONS.REACTIVATE,
      "Organization",
      orgId,
      before,
      { status: "ACTIVE" },
      `Organisation ${orgId} réactivée`,
    ),
  );
}

/** Archiver une organisation (ARCHIVED ≠ DELETE — l'historique reste). */
export async function archiveOrganization(
  orgId: string,
  actorId: string,
  reason: string,
  before?: PSOrganization,
): Promise<void> {
  await setOrganizationStatusPS(orgId, "ARCHIVED", actorId, reason);
  await writeAudit(
    buildAudit(
      orgId,
      actorId,
      ACTIONS.ARCHIVE,
      "Organization",
      orgId,
      before,
      { status: "ARCHIVED", archiveReason: reason },
      `Organisation ${orgId} archivée : ${reason}`,
    ),
  );
}

/**
 * Créer une organisation (registre). RLS serveur : réservé à un admin
 * central détenu au moins un grant actif (policy `orgs_insert_admin`).
 */
export async function createOrganization(
  input: { id: string; name: string; type?: OrgType },
  actorId: string,
): Promise<string> {
  const id = await createOrganizationPS({
    id: input.id,
    name: input.name,
    type: input.type ?? "CHURCH",
  });
  await writeAudit(
    buildAudit(
      id,
      actorId,
      ACTIONS.CREATE_ORG,
      "Organization",
      id,
      null,
      { id, name: input.name, type: input.type ?? "CHURCH", status: "PENDING" },
      `Organisation ${input.name} créée`,
    ),
  );
  return id;
}

/**
 * Assigner un admin central sur une organisation (grant actif).
 * Le trigger serveur `log_org_admin_change` journalise aussi la mutation du
 * grant ; on garde un audit applicatif pour la traçabilité métier.
 */
export async function assignOrgAdmin(input: {
  adminProfileId: string;
  orgId: string;
  grantedBy: string;
}): Promise<string> {
  const grantId = await grantOrgAdminPS(input);
  await writeAudit(
    buildAudit(
      input.orgId,
      input.grantedBy,
      ACTIONS.ASSIGN_ADMIN,
      "OrgAdminGrant",
      grantId,
      null,
      {
        adminProfileId: input.adminProfileId,
        orgId: input.orgId,
        status: "ACTIVE",
        grantedBy: input.grantedBy,
      },
      `Grant admin central : ${input.adminProfileId} → ${input.orgId}`,
    ),
  );
  return grantId;
}

/** Révoquer un admin central (grant → REVOKED ; RLS retire l'accès à chaud). */
export async function revokeOrgAdmin(
  grantId: string,
  orgId: string,
  actorId: string,
  before?: unknown,
): Promise<void> {
  await revokeOrgAdminPS(grantId);
  await writeAudit(
    buildAudit(
      orgId,
      actorId,
      ACTIONS.REVOKE_ADMIN,
      "OrgAdminGrant",
      grantId,
      before,
      { status: "REVOKED" },
      `Grant admin central révoqué : ${grantId}`,
    ),
  );
}

// ─── Lecture (KPIs + activité récente) ─────────────────────────────────────

export interface OrgStats {
  total: number;
  byStatus: Record<OrgStatus, number>;
}

/** Comptage par statut depuis le registre local (vue admin central). */
export async function getOrgStats(actorId: string): Promise<OrgStats> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT status, COUNT(*) AS n FROM organizations
     WHERE EXISTS (
       SELECT 1 FROM org_admins WHERE org_admins.org_id = organizations.id
         AND org_admins.status = 'ACTIVE' AND org_admins.admin_profile_id = ?
     ) OR EXISTS (
       SELECT 1 FROM profiles WHERE profiles.org_id = organizations.id
         AND profiles.id = ?
     )
     GROUP BY status`,
    [actorId, actorId],
  );
  const rows = res?.array ?? [];
  const byStatus: Record<OrgStatus, number> = {
    PENDING: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
    ARCHIVED: 0,
  };
  let total = 0;
  for (const r of rows) {
    const n = Number(r.n);
    total += n;
    const s = r.status as OrgStatus;
    byStatus[s] = (byStatus[s] ?? 0) + n;
  }
  return { total, byStatus };
}

export interface RecentActivity {
  action: string;
  entityType: string;
  entityId: string;
  comment: string | null;
  createdAt: string;
  actorId: string;
}

/** Activité récente (journal d'audit) pour une organisation. */
export async function getRecentActivity(
  orgId: string,
  limit = 20,
): Promise<RecentActivity[]> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT action, entity_type, entity_id, comment, created_at, user_id
     FROM audit_entries
     WHERE org_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [orgId, limit],
  );
  const rows = res?.array ?? [];
  return rows.map((r: any) => ({
    action: String(r.action),
    entityType: String(r.entity_type),
    entityId: String(r.entity_id),
    comment: (r.comment as string | null) ?? null,
    createdAt: String(r.created_at),
    actorId: String(r.user_id),
  }));
}

// ─── Org Report Card ───────────────────────────────────────────────────────

export interface OrgReportCard {
  /** Total members in the org */
  memberCount: number;
  /** Active admin count */
  activeAdminCount: number;
  /** Revoked admin count */
  revokedAdminCount: number;
}

export async function getOrgReportCard(orgId: string): Promise<OrgReportCard> {
  const db = getPowerSyncDatabase();

  const memberRes = await db.execute(
    `SELECT COUNT(*) AS n FROM members WHERE org_id = ? AND archived_at IS NULL`,
    [orgId],
  );
  const memberCount = Number(memberRes?.array?.[0]?.n) ?? 0;

  const adminRes = await getOrgAdminsFull(orgId);
  const activeAdminCount = adminRes.filter((a) => a.status === "ACTIVE").length;
  const revokedAdminCount = adminRes.filter((a) => a.status === "REVOKED").length;

  return { memberCount, activeAdminCount, revokedAdminCount };
}

// ─── Admin List with Profiles ──────────────────────────────────────────────

export interface OrgAdminDetail extends PSOrgAdminWithProfile {
  displayName: string;
}

export async function getOrgAdminDetails(
  orgId: string,
): Promise<OrgAdminDetail[]> {
  const admins = await getOrgAdminsFull(orgId);
  return admins.map((a) => ({
    ...a,
    displayName: a.last_name
      ? `${a.first_name} ${a.last_name}`.trim()
      : a.email || a.admin_profile_id.slice(0, 8),
  }));
}
