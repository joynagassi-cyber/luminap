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

// ─── Réactivité ─────────────────────────────────────────────────────────────
//
// `_orgId` est une variable de module : la poser ne re-rend AUCUN composant.
// Résultat : une page montée avant la résolution du contexte (au boot,
// `AppContext` lit le profil de façon asynchrone) interrogeait PowerSync avec
// `org_id = '__no_org__'` → **listes vides** (« 0 événements », « Aucun
// membre ») alors que les données existent. L'UI ne se corrigeait qu'au
// re-rendu suivant, jusqu'à ~30 s plus tard.
//
// `subscribeOrganization` permet aux hooks de lecture de se re-rendre dès que
// l'organisation est connue.
const _orgListeners = new Set<() => void>();

export function subscribeOrganization(listener: () => void): () => void {
  _orgListeners.add(listener);
  return () => {
    _orgListeners.delete(listener);
  };
}

export function setOrganizationId(orgId: string): void {
  if (_orgId === orgId) return;
  _orgId = orgId;
  _orgListeners.forEach((l) => l());
}

// Restauration SYNCHRONE au chargement du module : `AppContext` persiste
// l'organisation résolue dans `lumina-active-org`. La relire ici évite que le
// PREMIER rendu de chaque page parte sur `__no_org__` (et donc affiche des
// listes vides) sur toute visite après la première.
try {
  const stored = localStorage.getItem("lumina-active-org");
  if (stored && stored !== NO_ORG_SELECTED) _orgId = stored;
} catch {
  /* stockage indisponible (SSR / test) — résolution asynchrone plus tard */
}

export function getOrganizationId(): string {
  // N'exposer JAMAIS un ID brut inconnu ("default-org", UUID, …) dans l'UI :
  // on signale explicitement l'absence d'organisation résolue.
  return _orgId ?? NO_ORG_SELECTED;
}

export function hasResolvedOrganization(): boolean {
  return _orgId !== null && _orgId !== "" && _orgId !== NO_ORG_SELECTED;
}
