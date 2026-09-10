/**
 * Organization Context Service (T4 — administration centrale multi-org).
 *
 * This is the authoritative switch between "central admin" and "an
 * organization" context. It does NOT replace `orgContext.ts` — it feeds it:
 *   - every `enterOrganization(id)` calls `setOrganizationId(id)`
 *   - `exitToCentral()` restores the default / central context
 *
 * Security (spec §9/§21): entering an organization context requires the user
 * to actually be linked to it locally — a membership row (profiles.org_id)
 * or an ACTIVE central grant (org_admins) — checked against the local SQLite
 * DB, not just React state. The server re-enforces the same boundary via RLS
 * on every real query, so this local check only gates UI context, never data.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { getOrganizationId, setOrganizationId } from "./orgContext";
import {
  canAccessOrganization,
  listUserOrgs,
  type UserOrg,
} from "./dataLayer";
import { authService } from "./auth";

export type ContextMode = "CENTRAL" | "ORG";

export interface OrganizationContext {
  /** "CENTRAL" = dashboard de l'admin central ; "ORG" = une organisation */
  mode: ContextMode;
  /** Id de l'organisation courante (ou "org-central" en mode CENTRAL) */
  orgId: string;
  /** Libellé affiché (nom de l'org, ou "Administration centrale") */
  label: string;
}

/** Id de l'organisation centrale (seedée par la migration T1). */
export const CENTRAL_ORG_ID = "org-central";

// ─── State + reactivity ─────────────────────────────────────────────────────

let _mode: ContextMode = "ORG";
let _listeners = new Set<() => void>();
let _version = 0;

function emit(): void {
  _version++;
  _listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  _listeners.add(l);
  return () => _listeners.delete(l);
}

function getSnapshot(): number {
  return _version;
}

// ─── Current user id resolution ─────────────────────────────────────────────

/**
 * Resolve the current user's profile id. Prefers the live auth profile, falls
 * back to localStorage. The dataLayer hooks use the localStorage key
 * ("lumina-user"); this resolver keeps the two in agreement.
 */
export function resolveCurrentUserId(): string {
  try {
    const id = authService.getState().profile?.id;
    if (id) return id;
  } catch {
    /* auth not ready */
  }
  try {
    const raw = localStorage.getItem("lumina-user");
    if (raw) return (JSON.parse(raw as string) as { id?: string }).id ?? "";
  } catch {
    /* no storage */
  }
  return "";
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Read the current context without triggering React. */
export function currentContext(): OrganizationContext {
  if (_mode === "CENTRAL") {
    return { mode: "CENTRAL", orgId: CENTRAL_ORG_ID, label: "Administration centrale" };
  }
  const orgId = getOrganizationId();
  return { mode: "ORG", orgId, label: orgId };
}

export function isCentralContext(): boolean {
  return _mode === "CENTRAL";
}

/**
 * Enter an organization context. Verifies the caller is linked to it
 * (member or ACTIVE grant) against the local DB before switching.
 *
 * @returns the entered context, or `null` when access is denied — the caller
 * must surface the denial; the context is NOT changed.
 */
export async function enterOrganization(orgId: string): Promise<OrganizationContext | null> {
  if (!orgId) return null;

  const uid = resolveCurrentUserId();
  const allowed = await canAccessOrganization(uid, orgId);
  if (!allowed) return null;

  _mode = "ORG";
  setOrganizationId(orgId);
  emit();
  return currentContext();
}

/** Return to the central administration dashboard. */
export function exitToCentral(): OrganizationContext {
  _mode = "CENTRAL";
  setOrganizationId(CENTRAL_ORG_ID);
  emit();
  return currentContext();
}

/**
 * React hook: the current organization context, re-rendered on every switch.
 */
export function useOrganizationContext(): OrganizationContext {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return currentContext();
}

/**
 * List the organizations the current user may enter (member or granted).
 * Backs the "switch organization" picker in the header / settings. Re-runs on
 * demand (`refetch`) and whenever the context mode changes.
 */
export function useMyOrgs(): {
  data: UserOrg[] | null;
  refetch: () => Promise<UserOrg[]>;
} {
  const { mode } = useOrganizationContext();
  const [data, setData] = useState<UserOrg[] | null>(null);

  const refetch = async () => {
    const rows = await listUserOrgs(resolveCurrentUserId());
    setData(rows);
    return rows;
  };

  useEffect(() => {
    refetch();
  }, [mode]);

  return { data, refetch };
}
