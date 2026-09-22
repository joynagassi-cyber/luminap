/**
 * useCanAccessMulti — B.1 du plan de clôture multi-org.
 *
 * Gate d'accès MULTI-ORG : union (OR) de deux chemins de résolution :
 *
 *   1. FÉDÉRATION (chemin cible) — `federation.canAccess(userId, orgId,
 *      resource, action, scope?)` : grants (user/tag/org_member/group_member)
 *      + rôles canon de l'org (PERMISSION_MATRIX via org_memberships).
 *   2. LEGACY (transition) — `security.hasPermission(role, "resource:action")` :
 *      gate 1:1 par rôle (le repli actuel de l'UI).
 *
 * `allowed = canAccess(...) OR hasPermission(...)`. Le champ `source` indique
 * quel chemin a accordé l'accès (pour le debug UI) :
 *   - "legacy"     : seul le chemin legacy accorde.
 *   - "federation" : seule la fédération accorde (pas de rôle canon legacy).
 *   - "both"       : les deux chemins accordent.
 *   - "neither"    : ni l'un ni l'autre → `allowed = false`.
 *
 * Cache module-level par clé complète `userId|orgId|resource|action|scope` :
 * deux rendus/crampons identiques n'appellent JAMAIS le service 2 fois.
 * La clé inclut le scope — un grant scopé ne couvre pas le niveau org
 * (test (b) du plan §2.6).
 *
 * GARDE-FOUS (cahier §2.4) :
 *   - Ce hook vit dans `src/hooks/` (pas dans une capability) : le test
 *     `no-cross-imports` ne le couvre pas, mais son appelant `federation`
 *     n'importe PAS `security` — seule la règle d'importation interdit
 *     l'inverse : ici on importe `security` depuis le hook, JAMAIS l'inverson.
 *   - `federation.canAccess` lit le SQLite PowerSync local (chemin "sync",
 *     plan §2.5) ; le chemin RPC serveur reste côté edge-fn.
 *
 * Notes de conception :
 *   - Cache NON borné : une session UI se limite à (ressources × actions ×
 *     scopes) utilisés par les pages — de l'ordre de dizaines de clés par
 *     utilisateur, jamais des milliers. On assume une session de navigation
 *     normale ; si un jour on cache par ressource dynamique (ex. chaque
 *     `transaction:<id>`), il faudra borner (LRU).
 *   - `loading` est vrai uniquement tant que le chemin fédéré n'a pas résolu.
 *     Le chemin legacy est synchrone → si la fédération ne peut pas accorder
 *     (et le legacy non plus), le résultat final est connu dès la fin de la
 *     1re résolution.
 *   - `canAccess` rejette (DB non prête, user inconnu) → on traite ça comme
 *     "fédération ne peut pas accorder" : on laisse le legacy trancher.
 */

import { useEffect, useState } from "react";
import { federation } from "@/capabilities/federation";
import { security } from "@/capabilities/security";
import type { AccessScope } from "@/types/federation";
import type { Role } from "@/types";

export type AccessSource = "legacy" | "federation" | "both" | "neither";

export interface CanAccessMultiResult {
  allowed: boolean;
  loading: boolean;
  source: AccessSource;
}

// ─── Cache module-level ─────────────────────────────────────────────────────

type CacheEntry = {
  fedResult: boolean | undefined; // undefined = résolution en cours/échouée
  legacyResult: boolean;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(
  userId: string,
  orgId: string,
  resource: string,
  action: string,
  scope?: AccessScope,
): string {
  return [userId, orgId, resource, action, scope ? `${scope.resource}:${scope.id}` : "global"].join("|");
}

/**
 * Réinitialise le cache (tests + invalidation après mutation de grants).
 */
export function clearCanAccessMultiCache(): void {
  cache.clear();
}

/**
 * Hook d'accès multi-org (union fédération + legacy).
 *
 * @param userId   — id du profil (ex. `useCurrentUser().id` ; `""` ou null si
 *                   user non sync → le chemin fédération échoue, le legacy
 *                   tranchera seul).
 * @param orgId    — org courante (ex. `getOrganizationId()` ou `user.org.id`).
 * @param resource — ressource ciblée ("report", "transaction", "group", …).
 * @param action   — action ciblée ("read", "export", "approve", …).
 * @param scope    — scope optionnel ({ resource, id }) ; sans scope = org-level.
 * @param legacyRole — rôle legacy à évaluer (le `user.role` de l'UI). `null`
 *                     pour désactiver le chemin legacy.
 */
export function useCanAccessMulti(
  userId: string | null | undefined,
  orgId: string | null | undefined,
  resource: string,
  action: string,
  scope?: AccessScope,
  legacyRole?: Role | string | null,
): CanAccessMultiResult {
  const key = cacheKey(userId ?? "", orgId ?? "", resource, action, scope);
  const legacyResult =
    legacyRole != null ? security.hasPermission(legacyRole as any, `${resource}:${action}` as any) : false;

  const [entry, setEntry] = useState<CacheEntry>(() => {
    const existing = cache.get(key);
    if (existing) return existing;
    return { fedResult: undefined, legacyResult };
  });

  useEffect(() => {
    let cancelled = false;
    const current = cache.get(key);
    if (!current || current.fedResult === undefined) {
      federation
        .canAccess(userId ?? "", orgId ?? "", resource, action, scope)
        .then((res) => {
          if (cancelled) return;
          const next: CacheEntry = {
            fedResult: res,
            legacyResult:
              legacyRole != null
                ? security.hasPermission(legacyRole as any, `${resource}:${action}` as any)
                : false,
          };
          cache.set(key, next);
          setEntry(next);
        })
        .catch(() => {
          // Fédéré inaccessible (DB pas prête) : on fige fedResult=false et on
          // laisse le legacy trancher. Pas de re-throw.
          if (cancelled) return;
          const next: CacheEntry = {
            fedResult: false,
            legacyResult:
              legacyRole != null
                ? security.hasPermission(legacyRole as any, `${resource}:${action}` as any)
                : false,
          };
          cache.set(key, next);
          setEntry(next);
        });
    } else if (current.legacyResult !== legacyResult) {
      // Le rôle legacy a changé depuis le cache : on met à jour l'entrée.
      const next: CacheEntry = { fedResult: current.fedResult, legacyResult };
      cache.set(key, next);
      setEntry(next);
    }
    return () => {
      cancelled = true;
    };
  }, [key, legacyRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const fed = entry.fedResult === true;
  const legacy = entry.legacyResult === true;
  const source: AccessSource =
    fed && legacy ? "both" : fed ? "federation" : legacy ? "legacy" : "neither";

  return {
    allowed: fed || legacy,
    loading: entry.fedResult === undefined,
    source,
  };
}
