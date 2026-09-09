/**
 * Organization Context — minimal, replaceable source of org identity.
 *
 * All services should read the organization identifier from this module
 * instead of using a hardcoded string literal.
 *
 * Current source of truth: dynamically resolved org ID.
 * Future: resolve from authenticated profile / Supabase.
 */

const DEFAULT_ORG_ID = "default-org";

let _orgId: string | null = null;

export function setOrganizationId(orgId: string): void {
  _orgId = orgId;
}

export function getOrganizationId(): string {
  return _orgId ?? DEFAULT_ORG_ID;
}
