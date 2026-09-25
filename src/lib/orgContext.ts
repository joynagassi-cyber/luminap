/**
 * Organization Context — minimal, replaceable source of org identity.
 *
 * All services should read the organization identifier from this module
 * instead of using a hardcoded string literal.
 *
 * Current source of truth: dynamically resolved org ID.
 * Future: resolve from authenticated profile / Supabase.
 */

// Le "no-org" est un marqueur explicite (pas un faux ID ressemblant à une
// organisation réelle). Les UI en tirent l'affichage "chargement…" plutôt
// qu'un ID technique.
const NO_ORG_SELECTED = "__no_org__";

let _orgId: string | null = null;

export function setOrganizationId(orgId: string): void {
  _orgId = orgId;
}

export function getOrganizationId(): string {
  // N'exposer JAMAIS un ID brut inconnu ("default-org", UUID, …) dans l'UI :
  // on signale explicitement l'absence d'organisation résolue.
  return _orgId ?? NO_ORG_SELECTED;
}

export function hasResolvedOrganization(): boolean {
  return _orgId !== null && _orgId !== "" && _orgId !== NO_ORG_SELECTED;
}
