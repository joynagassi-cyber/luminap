/**
 * Invitation Capability — QR/code-based offline invitation system
 *
 * Domain-agnostic invitation management via PowerSync.
 * Two-phase flow: transfer (QR/code, offline) -> confirmation (online, via PowerSync).
 *
 * Usage:
 *   import { invitation, generateCode, buildQRPayload, parseQRPayload } from '@/capabilities/invitation'
 *   const code = generateCode()
 *   const qrPayload = buildQRPayload(input)
 *   const payload = parseQRPayload(raw)
 *   const id = await invitation.createInvitation(input)
 *   await invitation.revokeInvitation(id, actorId)
 *   const { userId, claimId } = await invitation.claimInvitation(payload, deviceId)
 *   const list = await invitation.getInvitations()
 *   const pending = invitation.isPendingUser(userId)
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId } from "@/lib/orgContext";
import {
  createInvitationPS,
  revokeInvitationPS,
  claimInvitationPS,
} from "@/lib/dataLayer";
import type {
  PSInvitation,
  PSInvitationClaim,
} from "@/lib/dataLayer";
import { auditLogRepo } from "@/lib/audit";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type InvitationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";
export type ClaimStatus =
  | "PENDING_SYNC"
  | "CONFIRMED"
  | "REJECTED_DUPLICATE"
  | "REJECTED_EXPIRED"
  | "REJECTED_EXHAUSTED"
  | "REJECTED_REVOKED";

export interface Invitation {
  id: string;
  orgId: string;
  code: string;
  targetRole: string;
  targetScopeType: "ORG" | "GROUP";
  targetGroupId: string | null;
  targetMemberId: string | null;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  status: InvitationStatus;
}

export interface InvitationClaim {
  id: string;
  invitationId: string;
  claimedByDeviceId: string;
  claimedAt: string;
  resultingUserId: string | null;
  status: ClaimStatus;
  rejectReason: string | null;
}

export interface CreateInvitationInput {
  orgId: string;
  targetRole: string;
  targetScopeType: "ORG" | "GROUP";
  targetGroupId?: string;
  targetMemberId?: string;
  issuedBy: string;
  expiresAt?: string; // default: 7 days from now
  maxUses?: number; // default: 1
}

export interface ClaimPayload {
  v: number;
  orgId: string;
  invitationId: string;
  code: string;
  role: string;
  scope: { type: "ORG" | "GROUP"; groupId?: string };
  memberId: string | null;
  issuedAt: string;
  expiresAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Code generation & QR payload helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable invitation code (6 chars, alphanumeric, no ambiguities).
 * Format: "LUM-XXXXXX" where X is alphanumeric.
 */
export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LUM-${code}`;
}

/**
 * Build a QR-ready JSON payload from a create invitation input and the generated code.
 */
export function buildQRPayload(input: CreateInvitationInput, code: string): ClaimPayload {
  const now = new Date().toISOString();
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    v: 1,
    orgId: input.orgId,
    invitationId: "", // filled after PS write
    code,
    role: input.targetRole,
    scope: { type: input.targetScopeType, ...(input.targetScopeType === "GROUP" && input.targetGroupId ? { groupId: input.targetGroupId } : {}) },
    memberId: input.targetMemberId ?? null,
    issuedAt: now,
    expiresAt,
  };
}

/**
 * Parse a QR/code string back to a ClaimPayload.
 * Returns null if invalid.
 */
export function parseQRPayload(raw: string): ClaimPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed?.v === 1 &&
      parsed?.orgId &&
      parsed?.invitationId &&
      parsed?.code &&
      parsed?.role &&
      parsed?.scope?.type &&
      parsed?.issuedAt &&
      parsed?.expiresAt
    ) {
      return parsed as ClaimPayload;
    }
  } catch {
    // silent
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Invitation service
// ─────────────────────────────────────────────────────────────────────────────

export class InvitationService {
  /**
   * Create a new invitation and persist it via PowerSync.
   * Returns the invitation id.
   */
  async createInvitation(input: CreateInvitationInput): Promise<string> {
    const id = crypto.randomUUID();
    const code = generateCode();
    const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const maxUses = input.maxUses ?? 1;
    const now = new Date().toISOString();

    await createInvitationPS(
      {
        org_id: input.orgId,
        code,
        target_role: input.targetRole,
        target_scope_type: input.targetScopeType,
        target_group_id: input.targetGroupId ?? null,
        target_member_id: input.targetMemberId ?? null,
        issued_by: input.issuedBy,
        max_uses: maxUses,
      },
      expiresAt,
    );

    // Audit
    await auditLogRepo.write({
      orgId: input.orgId,
      transactionId: null,
      userId: input.issuedBy,
      actorRoleAtTime: null,
      action: "CREATE",
      entityType: "Invitation",
      entityId: id,
      beforeState: null,
      afterState: { code, targetRole: input.targetRole, targetScopeType: input.targetScopeType, expiresAt },
      comment: `Invitation created: ${code}`,
    });

    return id;
  }

  /**
   * Revoke an active invitation.
   */
  async revokeInvitation(invitationId: string, actorId: string): Promise<void> {
    const db = getPowerSyncDatabase();
    const orgId = getOrganizationId();

    // Verify ownership and active status
    const check = await db.execute(
      "SELECT id, code, status FROM invitations WHERE id = ? AND org_id = ?",
      [invitationId, orgId],
    );
    const inv = check?.array?.[0] as any;
    if (!inv || inv.status !== "ACTIVE") {
      throw new Error("INVITATION_NOT_FOUND_OR_NOT_ACTIVE");
    }

    await revokeInvitationPS(invitationId);

    await auditLogRepo.write({
      orgId,
      transactionId: null,
      userId: actorId,
      actorRoleAtTime: null,
      action: "REVOKE",
      entityType: "Invitation",
      entityId: invitationId,
      beforeState: inv,
      afterState: { ...inv, status: "REVOKED" },
      comment: `Invitation ${inv.code} revoked by ${actorId}`,
    });
  }

  /**
   * Claim an invitation locally. Creates a PENDING user + InvitationClaim.
   * Returns the new user id and claim id.
   */
  async claimInvitation(
    payload: ClaimPayload,
    claimedByDeviceId: string,
    issuerProfileId: string,
  ): Promise<{ userId: string; claimId: string }> {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    // Check expiration locally
    if (new Date(payload.expiresAt) < new Date()) {
      throw new Error("INVITATION_EXPIRED");
    }

    // Create a PENDING user
    const userId = crypto.randomUUID();
    const pendingEmail = `pending-${userId.slice(0, 8)}@lumina.local`;

    await db.execute(
      `INSERT INTO profiles (
        id, email, first_name, last_name, role, org_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        userId,
        pendingEmail,
        "",
        "",
        payload.role,
        payload.orgId,
        now,
        now,
      ],
    );

    // Create the claim
    const claimId = await claimInvitationPS(
      payload.invitationId,
      claimedByDeviceId,
      userId,
      "PENDING_SYNC",
      null,
    );

    // Audit
    await auditLogRepo.write({
      orgId: payload.orgId,
      transactionId: null,
      userId: issuerProfileId,
      actorRoleAtTime: null,
      action: "CLAIM",
      entityType: "Invitation",
      entityId: payload.invitationId,
      beforeState: null,
      afterState: { userId, claimId, device: claimedByDeviceId },
      comment: `Invitation ${payload.code} claimed locally by device ${claimedByDeviceId}`,
    });

    return { userId, claimId };
  }

  /**
   * List invitations for the current org with optional filters.
   */
  async getInvitations(filters?: {
    status?: InvitationStatus;
    roleId?: string;
  }): Promise<Invitation[]> {
    const db = getPowerSyncDatabase();
    const orgId = getOrganizationId();
    const conditions: string[] = ["org_id = ?"];
    const params: any[] = [orgId];

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    if (filters?.roleId) {
      conditions.push("target_role = ?");
      params.push(filters.roleId);
    }

    const sql = `SELECT id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id, issued_by, issued_at, expires_at, max_uses, used_count, status FROM invitations WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
    const result = await db.execute(sql, params);
    return (result?.array || []) as any[] as Invitation[];
  }

  /**
   * Get a single invitation by id.
   */
  async getInvitation(id: string): Promise<Invitation | null> {
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      "SELECT id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id, issued_by, issued_at, expires_at, max_uses, used_count, status FROM invitations WHERE id = ?",
      [id],
    );
    return (result?.array?.[0] as any) ?? null;
  }

  /**
   * Get an invitation by its human-readable code.
   */
  async getInvitationByCode(code: string): Promise<Invitation | null> {
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      "SELECT id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id, issued_by, issued_at, expires_at, max_uses, used_count, status FROM invitations WHERE code = ?",
      [code],
    );
    return (result?.array?.[0] as any) ?? null;
  }

  /**
   * List claims for an invitation.
   */
  async getClaims(invitationId: string): Promise<InvitationClaim[]> {
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      "SELECT id, invitation_id, claimed_by_device_id, claimed_at, resulting_user_id, status, reject_reason FROM invitation_claims WHERE invitation_id = ? ORDER BY claimed_at ASC",
      [invitationId],
    );
    return (result?.array || []) as any[] as InvitationClaim[];
  }

  /**
   * Update a claim status (called after server-side confirmation).
   */
  async updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    rejectReason?: string,
  ): Promise<void> {
    const db = getPowerSyncDatabase();
    await db.execute(
      "UPDATE invitation_claims SET status = ?, reject_reason = ?, updated_at = ? WHERE id = ?",
      [status, rejectReason ?? null, new Date().toISOString(), claimId],
    );
  }

  /**
   * Check if a user is in PENDING status (claimed via invitation but not yet confirmed).
   */
  async isPendingUser(userId: string): Promise<boolean> {
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      "SELECT status FROM profiles WHERE id = ?",
      [userId],
    );
    const row = result?.array?.[0] as { status: string } | undefined;
    return row?.status === "PENDING";
  }
}

/** Singleton instance */
export const invitation = new InvitationService();

// ─────────────────────────────────────────────────────────────────────────────
// File transport (T9) — 4ᵉ canal, même moteur
//
// Même payload que le QR (JSON v1). L'export produit un fichier partageable
// (transfert local hors ligne) ; l'import parse + revendique exactement
// comme un scan QR. Idempotence garantie par le trigger serveur
// `settle_invitation_claim` — ne PAS réimplémenter.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export an invitation as a shareable JSON file payload.
 * Reads the persisted invitation (its real code), fills the payload's
 * invitationId, and returns a JSON string ready to save/share.
 */
export async function exportInvitationToFile(
  invitationId: string,
): Promise<string> {
  // getInvitation returns the raw sync row (snake_case columns), not a
  // camelCase Invitation — map fields explicitly.
  const inv: any = await invitation.getInvitation(invitationId);
  if (!inv) throw new Error("INVITATION_NOT_FOUND");

  const targetScopeType: "ORG" | "GROUP" =
    inv.target_scope_type ?? inv.targetScopeType ?? "ORG";
  const targetGroupId: string | null =
    inv.target_group_id ?? inv.targetGroupId ?? null;

  const payload: ClaimPayload = {
    v: 1,
    orgId: inv.org_id ?? inv.orgId,
    invitationId: inv.id ?? inv.invitationId,
    code: inv.code,
    role: inv.target_role ?? inv.targetRole,
    scope: {
      type: targetScopeType,
      ...(targetScopeType === "GROUP" && targetGroupId
        ? { groupId: targetGroupId }
        : {}),
    },
    memberId: inv.target_member_id ?? inv.targetMemberId ?? null,
    issuedAt: inv.issued_at ?? inv.issuedAt,
    expiresAt: inv.expires_at ?? inv.expiresAt,
  };
  return JSON.stringify(payload, null, 2);
}

/** Parse an imported JSON file back into a claim payload (null if invalid). */
export function importInvitationFromFile(raw: string): ClaimPayload | null {
  return parseQRPayload(raw);
}

/**
 * Claim an invitation from an imported file. Delegates to the SAME engine as
 * the QR flow — duplicate handling is the server trigger's job, not ours.
 */
export async function claimInvitationFromFile(
  raw: string,
  claimedByDeviceId: string,
  actorProfileId: string,
): Promise<{ userId: string; claimId: string }> {
  const payload = importInvitationFromFile(raw);
  if (!payload) throw new Error("INVALID_INVITATION_FILE");
  return invitation.claimInvitation(payload, claimedByDeviceId, actorProfileId);
}
