/**
 * Garde structurelle — classe « garde de route inatteignable » (R105).
 *
 * Un `RouteDef` peut déclarer une `permission` que `resolveRoute` exige via
 * `state.hasPermission`. Si cette permission n'est détenue par AUCUN rôle canon,
 * la route est **inatteignable pour tout le monde** : `forbidden` systématique,
 * écran muet silencieux, sans qu'aucun test ne le voie. C'est exactement la
 * classe de R105 (`invitation:create`/`invitation:manage` exigées par le
 * registre, détenues par aucun rôle avant correction).
 *
 * Ce test verrouille la CAUSE, indépendamment de R109/R16 (qui ne concernent
 * que le *câblage* de `hasPermission`, pas la *détention* des permissions) :
 *
 *   1. toute `permission` déclarée par une route est une permission canonique
 *      (membre de l'union `Permission`) ;
 *   2. cette permission est détenue par AU MOINS UN rôle de `PERMISSION_MATRIX`.
 *
 * Ajouter une route protégée par une permission que personne ne détient fait
 * donc échouer la CI.
 */
import { describe, it, expect } from "vitest";
import { ROUTE_REGISTRY } from "../routeResolver";
import { PERMISSION_MATRIX, type Permission } from "../rbac";

/** Toutes les permissions détenues par au moins un rôle canon. */
function grantedPermissions(): Set<string> {
  const set = new Set<string>();
  for (const perms of Object.values(PERMISSION_MATRIX)) {
    for (const p of perms as Permission[]) set.add(p);
  }
  return set;
}

const routePermissions = Array.from(
  new Set(
    ROUTE_REGISTRY.map((r) => r.permission).filter(
      (p): p is string => typeof p === "string",
    ),
  ),
).sort();

describe("ROUTE_REGISTRY — aucune garde de route inatteignable (R105)", () => {
  it("le registre déclare au moins une route protégée (sanity)", () => {
    expect(routePermissions.length).toBeGreaterThan(0);
  });

  it("chaque permission de route est détenue par au moins un rôle canon", () => {
    const granted = grantedPermissions();
    const orphans = routePermissions.filter((p) => !granted.has(p));
    expect(
      orphans,
      `permission(s) exigée(s) par une route mais détenue(s) par aucun rôle → route inatteignable`,
    ).toEqual([]);
  });

  it("chaque permission de route est une permission canonique connue", () => {
    // Une permission hors union `Permission` serait une faute de frappe : la
    // route serait gardée par une chaîne que `hasPermission` ne peut jamais
    // satisfaire (aucun rôle ne la détient) → même effet que R105.
    const granted = grantedPermissions();
    for (const p of routePermissions) {
      expect(granted.has(p), `${p} n'est détenue par aucun rôle`).toBe(true);
    }
  });
});
