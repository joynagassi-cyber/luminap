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
import { authService } from "@/lib/auth";
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
  | "REJECTED_REVOKED"
  | "REJECTED_ROLE_ESCALATION";

export interface Invitation {
  id: string;
  orgId: string;
  code: string;
  targetRole: string;
  targetScopeType: "ORG" | "GROUP" | "EVENT" | "REPORT";
  targetGroupId: string | null;
  targetMemberId: string | null;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  status: InvitationStatus;
  // B.3 — scope granulaire (Vague 3) : colonnes scopées de la table `invitations`
  targetScopeResource?: string | null;
  targetScopeId?: string | null;
  grantsPayload?: string;
  tagsPayload?: string;
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
  targetScopeType: "ORG" | "GROUP" | "EVENT" | "REPORT";
  targetGroupId?: string;
  targetMemberId?: string;
  issuedBy: string;
  expiresAt?: string; // default: 7 days from now
  maxUses?: number; // default: 1
  // B.3 — scope granulaire (Vague 3) : les champs sont LIBRES (invariant 8/9),
  // ils ne sont validés QUE par le type Grant[] (agnostique) et le CHECK
  // PG sur `subject_type` (5 sources : user|org_member|group_member|role|tag).
  targetScopeResource?: string;
  targetScopeId?: string;
  grantsPayload?: import("@/types/federation").Grant[];
  tagsPayload?: string[];
}

export interface ClaimPayload {
  v: 1 | 2;
  orgId: string;
  invitationId: string;
  code: string;
  role: string;
  scope: {
    type: "ORG" | "GROUP" | "EVENT" | "REPORT";
    groupId?: string;
    /** B.3 — ressource cible libre (invariant 8 : toute ressource, tout ID). */
    resource?: string;
    /** B.3 — id de la ressource cible (harmonisé sur AccessScope.id). */
    id?: string;
  };
  memberId: string | null;
  /** B.3 — grants agnostiques transportés dans le QR/fichier (v2). */
  grants?: import("@/types/federation").Grant[];
  /** B.3 — tag_ids transportés dans le QR/fichier (v2). */
  tags?: string[];
  issuedAt: string;
  expiresAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mappers — PowerSync `db.execute()` renvoie les colonnes en SNAKE_CASE.
// Les méthodes de lecture ci-dessous les exposent en camelCase (type
// `Invitation`). Sans cette conversion explicite, tout appelant lisant
// `invite.targetRole` / `invite.orgId` recevait `undefined` (bug latent
// mesuré : le claim par code construisait un payload sans org/rôle/scope —
// `selectRole` était donc sauté et l'audit perdait l'org). Le mapping est
// TOLÉRANT (accepte déjà-camelCase) pour ne pas casser un appelant qui aurait
// pré-normalisé.
// ─────────────────────────────────────────────────────────────────────────────

export function mapInvitationRow(row: any): Invitation {
  return {
    id: row.id,
    orgId: row.org_id ?? row.orgId,
    code: row.code,
    targetRole: row.target_role ?? row.targetRole,
    targetScopeType: row.target_scope_type ?? row.targetScopeType,
    targetGroupId: row.target_group_id ?? row.targetGroupId ?? null,
    targetMemberId: row.target_member_id ?? row.targetMemberId ?? null,
    issuedBy: row.issued_by ?? row.issuedBy,
    issuedAt: row.issued_at ?? row.issuedAt,
    expiresAt: row.expires_at ?? row.expiresAt,
    maxUses: row.max_uses ?? row.maxUses,
    usedCount: row.used_count ?? row.usedCount,
    status: row.status,
    targetScopeResource: row.target_scope_resource ?? row.targetScopeResource ?? null,
    targetScopeId: row.target_scope_id ?? row.targetScopeId ?? null,
    grantsPayload: row.grants_payload ?? row.grantsPayload,
    tagsPayload: row.tags_payload ?? row.tagsPayload,
  };
}

export function mapClaimRow(row: any): InvitationClaim {
  return {
    id: row.id,
    invitationId: row.invitation_id ?? row.invitationId,
    claimedByDeviceId: row.claimed_by_device_id ?? row.claimedByDeviceId,
    claimedAt: row.claimed_at ?? row.claimedAt,
    resultingUserId: row.resulting_user_id ?? row.resultingUserId ?? null,
    status: row.status,
    rejectReason: row.reject_reason ?? row.rejectReason ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Code generation & QR payload helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable invitation code (6 chars, alphanumeric, no ambiguities).
 * Format: "LUM-XXXXXX" where X is alphanumeric.
 *
 * Le code est un JETON PORTEUR : il ouvre l'accès à une organisation (rôle +
 * grants). Il est donc tiré d'un générateur CRYPTOGRAPHIQUE
 * (`crypto.getRandomValues`), jamais de `Math.random()` (flux prévisible →
 * code devinable). Repli `Math.random()` uniquement si WebCrypto est absent
 * (environnements non navigateur) ; l'entropie reste alors non déterministe.
 */
export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const bytes = new Uint8Array(6);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(bytes[i] % chars.length);
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
    v: 2,
    orgId: input.orgId,
    invitationId: "", // filled after PS write
    code,
    role: input.targetRole,
    scope: {
      type: input.targetScopeType,
      ...(input.targetScopeType === "GROUP" && input.targetGroupId ? { groupId: input.targetGroupId } : {}),
      // B.3 — scope granulaire libre (invariant 8 : toute ressource, tout ID)
      ...(input.targetScopeResource ? { resource: input.targetScopeResource } : {}),
      // Harmonisé sur AccessScope.id (pas "resourceId") : l'UI/claim lit
      // payload.scope.id pour le passer à federation.canAccess.
      ...(input.targetScopeId ? { id: input.targetScopeId } : {}),
    },
    memberId: input.targetMemberId ?? null,
    // B.3 — transport du payload scopé dans le QR (claim hors-ligne, B.4)
    grants: input.grantsPayload ?? [],
    tags: input.tagsPayload ?? [],
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
      (parsed?.v === 1 || parsed?.v === 2) &&
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
   * Returns the generated `id` AND the `code` that was actually persisted.
   *
   * Le code est renvoyé (et non régénéré par l'appelant) : le code affiché à
   * l'invité (QR, « copier », export fichier) doit être exactement celui écrit
   * en base, sinon aucune invitation n'est réclamable.
   */
  async createInvitation(
    input: CreateInvitationInput,
  ): Promise<{ id: string; code: string }> {
    const id = crypto.randomUUID();
    const code = generateCode();
    const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const maxUses = input.maxUses ?? 1;
    const now = new Date().toISOString();

    const persistedId = await createInvitationPS(
      {
        id,
        org_id: input.orgId,
        code,
        target_role: input.targetRole,
        target_scope_type: input.targetScopeType,
        target_group_id: input.targetGroupId ?? null,
        target_member_id: input.targetMemberId ?? null,
        issued_by: input.issuedBy,
        max_uses: maxUses,
        // B.3 — scope granulaire (grants + tags + cible libre)
        target_scope_resource: input.targetScopeResource ?? null,
        target_scope_id: input.targetScopeId ?? null,
        grants_payload: JSON.stringify(input.grantsPayload ?? []),
        tags_payload: JSON.stringify(input.tagsPayload ?? []),
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

    // `createInvitationPS` réutilise l'id transmis : l'id renvoyé ici est donc
    // exactement celui persisté (export fichier + claim s'appuient dessus).
    return { id: persistedId, code };
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
   * Claim an invitation. Requires an AUTHENTICATED session: the claim binds
   * the invitation to the caller's real Supabase Auth account
   * (`resulting_user_id = auth.uid()`).
   *
   * R111 — pourquoi l'inscription est OBLIGATOIRE avant le claim :
   * `profiles.id` et `org_memberships.user_id` portent une FK NON deferrable
   * vers `auth.users(id)` ; la RLS `profiles_insert_self` exige de plus
   * `initplan_uid() = id`. L'ancien code générait un `crypto.randomUUID()`
   * (profil PENDING orphelin) → `23503` à l'upload ET au règlement, et 42501
   * à l'insertion locale : le parcours était inopérant de bout en bout.
   *
   * Le profil local n'écrit QUE `status = 'PENDING'` (role/org_id restent
   * inchangés) : le rôle et l'organisation cibles sont appliqués par le
   * trigger SECURITY DEFINER `settle_invitation_claim`, seul chemin autorisé
   * à franchir les gardes `ROLE_IMMUTABLE` / `ORG_ID_IMMUTABLE`.
   */
  async claimInvitation(
    payload: ClaimPayload,
    claimedByDeviceId: string,
    issuerProfileId: string,
  ): Promise<{ userId: string; claimId: string }> {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    // Inscription obligatoire : le claim porte sur le compte Auth réel.
    const session = await authService.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      throw new Error("AUTH_REQUIRED");
    }

    // Check expiration locally
    if (new Date(payload.expiresAt) < new Date()) {
      throw new Error("INVITATION_EXPIRED");
    }

    // Le profil Auth existe déjà (créé par `handle_new_user` au signup). On le
    // passe PENDING SANS toucher role/org_id (gardes ROLE/ORG_IMMUTABLE) : le
    // trigger de règlement réconciliera le rôle et l'organisation de
    // l'invitation. UPSERT : si la ligne n'est pas encore visible localement,
    // l'INSERT pose les valeurs par défaut tolérées (role MEMBRE, org
    // `__no_org__` — miroir exact de `handle_new_user`).
    await db.execute(
      `INSERT INTO profiles (
        id, email, first_name, last_name, role, org_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'MEMBRE', '__no_org__', 'PENDING', ?, ?)
      ON CONFLICT (id) DO UPDATE SET status = 'PENDING', updated_at = excluded.updated_at`,
      [
        userId,
        session?.user?.email ?? `pending-${userId.slice(0, 8)}@lumina.local`,
        "",
        "",
        now,
        now,
      ],
    );

    // Create the claim (resulting_user_id = auth.uid())
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

    const sql = `SELECT id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id, issued_by, issued_at, expires_at, max_uses, used_count, status, target_scope_resource, target_scope_id, grants_payload, tags_payload FROM invitations WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
    const result = await db.execute(sql, params);
    return ((result?.array || []) as any[]).map(mapInvitationRow);
  }

  /**
   * Get a single invitation by id.
   */
  async getInvitation(id: string): Promise<Invitation | null> {
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      "SELECT id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id, issued_by, issued_at, expires_at, max_uses, used_count, status, target_scope_resource, target_scope_id, grants_payload, tags_payload FROM invitations WHERE id = ?",
      [id],
    );
    const row = result?.array?.[0] as any;
    return row ? mapInvitationRow(row) : null;
  }

  /**
   * Get an invitation by its human-readable code.
   */
  async getInvitationByCode(code: string): Promise<Invitation | null> {
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      "SELECT id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id, issued_by, issued_at, expires_at, max_uses, used_count, status, target_scope_resource, target_scope_id, grants_payload, tags_payload FROM invitations WHERE code = ?",
      [code],
    );
    const row = result?.array?.[0] as any;
    return row ? mapInvitationRow(row) : null;
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
    return ((result?.array || []) as any[]).map(mapClaimRow);
  }

  /**
   * Update a claim status — local mirror of the server trigger
   * `settle_invitation_claim`.
   *
   * - CONFIRMED : also promotes the resulting PENDING profile to ACTIVE so
   *   the user is unlocked offline. Idempotent — a later sync re-running the
   *   server trigger is a no-op (claim already CONFIRMED, profile already
   *   ACTIVE).
   * - REJECTED_*: records the reason; the profile stays PENDING.
   * Writes an audit entry for traceability.
   */
  async updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    rejectReason?: string,
    actorId?: string,
  ): Promise<void> {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    const res = await db.execute(
      "SELECT invitation_id, resulting_user_id FROM invitation_claims WHERE id = ?",
      [claimId],
    );
    const claim = res?.array?.[0] as
      | { invitation_id: string; resulting_user_id: string | null }
      | undefined;

    await db.execute(
      "UPDATE invitation_claims SET status = ?, reject_reason = ?, updated_at = ? WHERE id = ?",
      [status, rejectReason ?? null, now, claimId],
    );

    // Local settlement: unlock the PENDING user on confirmation.
    if (status === "CONFIRMED" && claim?.resulting_user_id) {
      await db.execute(
        "UPDATE profiles SET status = 'ACTIVE', updated_at = ? WHERE id = ? AND status = 'PENDING'",
        [now, claim.resulting_user_id],
      );
    }

    if (claim?.invitation_id) {
      const invRes = await db.execute(
        "SELECT org_id FROM invitations WHERE id = ?",
        [claim.invitation_id],
      );
      const orgId = String(
        invRes?.array?.[0]?.org_id ?? getOrganizationId(),
      );
      const confirming = status === "CONFIRMED";
      await auditLogRepo.write({
        orgId,
        transactionId: null,
        userId: actorId ?? "",
        actorRoleAtTime: null,
        action: confirming ? "APPROVE" : "REJECT",
        entityType: "InvitationClaim",
        entityId: claimId,
        beforeState: null,
        afterState: { status, rejectReason: rejectReason ?? null },
        comment: confirming
          ? `Demande d'invitation confirmée (${claimId})`
          : `Demande d'invitation rejetée : ${rejectReason ?? "non précisée"} (${claimId})`,
      });
    }
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
