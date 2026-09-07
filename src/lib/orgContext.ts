/**
 * Organization Context — minimal, replaceable source of org identity.
 *
 * All services should read the organization identifier from this module
 * instead of using a hardcoded string literal.
 *
 * Current source of truth: the default org-1 value.
 * Future: resolve from authenticated profile / Supabase.
 */

const DEFAULT_ORG_ID = 'org-1';

let _orgId: string | null = null;

export function setOrganizationId(orgId: string): void {
  _orgId = orgId;
}

export function getOrganizationId(): string {
  return _orgId ?? DEFAULT_ORG_ID;
}
