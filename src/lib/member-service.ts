/**
 * Member Service
 *
 * Handles all member business logic.
 */

import { generateId } from "./utils";
import { addMemberPS, updateMemberPS } from "./dataLayer";
import { reportError } from "./observability/errorReporter";
import { writeAudit, resolveAuditActor } from "./audit";
import { getOrganizationId } from "./orgContext";
import type { Member } from "@/types";

export interface MemberState {
  members: Member[];
}

// --- createMember ---

export function buildCreateMember(
  data: Omit<Member, "id" | "createdAt" | "updatedAt">,
): Member {
  const now = new Date().toISOString();
  const id = generateId();
  return { ...data, id, createdAt: now, updatedAt: now };
}

export async function persistCreateMember(member: Member): Promise<void> {
  try {
    await addMemberPS({
      org_id: member.orgId,
      first_name: member.firstName,
      last_name: member.lastName,
      phone: member.phone,
      email: member.email,
      status: member.status,
      joined_at: member.joinedAt,
      archived_at: member.archivedAt,
      archived_by: member.archivedBy,
      archive_reason: member.archiveReason,
    });
  } catch (error) {
    // Écriture LOCALE : pas de file de reprise derrière — signaler + relancer.
    reportError(error, {
      type: "database",
      source: "persist-create-member",
      context: { memberId: member.id },
    });
    throw error;
  }
  // NeverBreak #6 — la création d'un membre est une action sensible : elle
  // laisse une trace consultable dans `/trace`.
  await writeAudit({
    orgId: getOrganizationId(),
    transactionId: null,
    ...resolveAuditActor(),
    action: "CREATE",
    entityType: "Member",
    entityId: member.id,
    beforeState: null,
    afterState: member,
    comment: null,
  });
}

// --- updateMember ---

export function applyUpdateMember(
  members: Member[],
  id: string,
  data: Partial<Member>,
): Member[] {
  return members.map((m) =>
    m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m,
  );
}

export async function persistUpdateMember(
  id: string,
  data: Partial<Member>,
  beforeState: Member | null = null,
): Promise<void> {
  try {
    await updateMemberPS(id, data);
  } catch (error) {
    reportError(error, {
      type: "database",
      source: "persist-update-member",
      context: { memberId: id },
    });
    throw error;
  }
  // NeverBreak #6 — toute mise à jour de membre est tracée (avant/après).
  await writeAudit({
    orgId: getOrganizationId(),
    transactionId: null,
    ...resolveAuditActor(),
    action: "UPDATE",
    entityType: "Member",
    entityId: id,
    beforeState,
    afterState: { id, ...data },
    comment: null,
  });
}

// --- deleteMember ---
//
// PM8 — la suppression d'un membre n'est pas un effacement muet : la base
// refuse (RESTRICT) de supprimer un membre porteur de cotisations, et toute
// suppression restante est tracée dans `audit_entries` (trigger
// `trg_members_audit_delete`, migration 20261026000008). Le chemin sanctionné
// pour un membre avec historique est l'archivage (`archiveMember`), qui
// conserve la ligne et son lien financier.

export function applyDeleteMember(members: Member[], id: string): Member[] {
  return members.filter((m) => m.id !== id);
}
