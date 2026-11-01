/**
 * Garde anti-doublon à la création d'organisation (P0 — blocage de synchro).
 *
 * ## Défaut visé (cause racine mesurée)
 *
 * Un compte qui REJOUE l'onboarding recréait une organisation à CHAQUE
 * passage au lieu de réutiliser la sienne. Mesure en base live : le compte
 * E2E `lumina-org-e2e@lumina.dev` était admin de **1493 organisations**
 * (1452 ACTIVE). Comme le stream PowerSync `org_administered` fait
 * `WHERE id IN (SELECT org_id FROM org_admins WHERE admin_profile_id = …)`,
 * ce compte dépassait la limite PowerSync de **1000 résultats de paramètre**
 * (`PSYNC_S2305`) → la synchronisation échouait → « Synchronisation
 * indisponible » et aucune donnée ne descendait.
 *
 * ## Périmètre
 *
 * Cette garde ne vise QUE la création d'une organisation **RACINE** par un
 * compte qui en possède DÉJÀ une (le chemin du wizard d'onboarding, qui
 * appelle `bootstrapOrganization` sans `parentOrgId`). Les cas légitimes
 * restent intacts :
 *   - un compte SANS organisation (self-serve neuf, profil `__no_org__`) DOIT
 *     pouvoir créer sa première organisation ;
 *   - un ADMIN canonique peut créer des **ANNEXES** (`parent_org_id` non nul)
 *     — ce chemin (`Federation`/`OrgChildren`) ne passe pas par ici.
 *
 * ## Pureté
 *
 * La décision est PURE (aucune E/S) : elle est donc testable directement et
 * la non-vacuité du correctif est démontrable sans mock de PowerSync. La
 * lecture du miroir local (`organizations` / `org_memberships` / `org_admins`)
 * vit dans `findExistingRootOrganization` (dataLayer).
 */

/** Marqueurs explicites « aucune organisation » — jamais une vraie org. */
export const NO_ORG_SENTINELS: readonly string[] = ["__no_org__", "no-org"];

/** `true` si `orgId` ne désigne PAS une organisation réelle. */
export function isSentinelOrgId(orgId: string | null | undefined): boolean {
  if (!orgId) return true;
  const trimmed = orgId.trim();
  return trimmed === "" || NO_ORG_SENTINELS.includes(trimmed);
}

/** Une organisation telle que lue depuis le miroir PowerSync. */
export interface ExistingOrgCandidate {
  orgId: string;
  name?: string | null;
  /** Statut de cycle de vie (`ACTIVE`/`PENDING`/`SUSPENDED`/`ARCHIVED`). */
  status?: string | null;
}

export interface ExistingOrgDecision {
  /** `true` ⇒ le wizard NE DOIT PAS créer d'organisation racine. */
  blocked: boolean;
  /** Organisation à réutiliser (redirection `/dashboard`), si connue. */
  org: { id: string; name: string } | null;
}

/**
 * Décide si le compte possède DÉJÀ une organisation racine exploitable.
 *
 * @param input.profileOrgId `profiles.org_id` du compte (`__no_org__` = aucune).
 * @param input.profileName Nom d'org mis en cache localement (facultatif).
 * @param input.orgs Organisations du compte lues dans le miroir PowerSync.
 *   `null` = miroir INDISPONIBLE (pas « vide ») → repli sur le seul profil.
 *   Un tableau (même vide) est **autoritaire** : c'est l'état réel du compte.
 *
 * Une organisation compte comme « déjà possédée » dès qu'elle est réelle
 * (≠ sentinelle) et n'est pas `ARCHIVED` : une org archivée est neutralisée
 * (soft-delete), le compte peut donc repartir de zéro.
 */
export function decideExistingRootOrg(input: {
  profileOrgId?: string | null;
  profileName?: string | null;
  orgs?: readonly ExistingOrgCandidate[] | null;
}): ExistingOrgDecision {
  const profileId = input.profileOrgId ?? null;
  const profileReal = !isSentinelOrgId(profileId);
  const profileFallback = profileReal
    ? { id: profileId as string, name: (input.profileName ?? "").trim() }
    : null;

  // Miroir indisponible : on ne se fie qu'au profil (source minimale fiable,
  // déjà en localStorage). C'est le repli qui rattrape le cas P0 même quand la
  // réplique PowerSync est cassée (elle l'était, justement).
  if (input.orgs == null) {
    return profileFallback
      ? { blocked: true, org: profileFallback }
      : { blocked: false, org: null };
  }

  const known = input.orgs.filter((o) => !isSentinelOrgId(o.orgId));
  const archived = new Set(
    known.filter((o) => o.status === "ARCHIVED").map((o) => o.orgId),
  );
  const usable = known.filter((o) => o.status !== "ARCHIVED");
  // Le profil ne compte pas s'il pointe une org que le miroir dit ARCHIVED.
  const profileUsable = profileReal && !archived.has(profileId as string);

  const chosen =
    usable.find((o) => o.orgId === profileId) ??
    usable[0] ??
    (profileUsable ? { orgId: profileId as string, name: input.profileName ?? null } : null);

  const blocked = usable.length > 0 || profileUsable;
  return {
    blocked,
    org: chosen
      ? { id: chosen.orgId, name: (chosen.name ?? "").trim() }
      : null,
  };
}
