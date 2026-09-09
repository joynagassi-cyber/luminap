/**
 * Member Service
 *
 * Handles all member business logic.
 */

import { generateId } from "./utils";
import { addMemberPS, updateMemberPS } from "./dataLayer";
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
    // Persist failure is non-fatal; offline queue will retry
  }
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
): Promise<void> {
  try {
    await updateMemberPS(id, data);
  } catch (error) {
    // Persist failure is non-fatal; offline queue will retry
  }
}

// --- deleteMember ---

export function applyDeleteMember(members: Member[], id: string): Member[] {
  return members.filter((m) => m.id !== id);
}
