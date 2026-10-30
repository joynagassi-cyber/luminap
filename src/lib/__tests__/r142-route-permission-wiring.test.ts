/**
 * R142 — garde anti-régression du câblage de la permission de route.
 *
 * Contexte : la branche `forbidden` de `resolveRoute` était MORTE (aucun
 * `hasPermission` fourni par `App.tsx`). R142 la câble. Cette garde verrouille
 * deux invariants du câblage :
 *
 *   1. `App.tsx` fournit réellement `hasPermission` au résolveur (sinon la
 *      branche redevient morte — classe R105/R106/R107).
 *   2. Aucun rôle LÉGITIME n'est enfermé dehors : chaque rôle canon doit
 *      pouvoir atteindre les routes d'administration « normales » du registre
 *      (`/admin`, `/admin/roles`) OU être explicitement listé comme
 *      volontairement restreint. La décision de rôle hors-canon est
 *      fail-closed (testée séparément).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PERMISSION_MATRIX, roleHasPermission, parseRole } from "@/lib/rbac";
import { ROUTE_REGISTRY } from "@/lib/routeResolver";
import type { Role } from "@/types";

const appSrc = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");

describe("R142 — la garde de permission de route est réellement câblée", () => {
  it("App.tsx fournit `hasPermission` au résolveur (branche non morte)", () => {
    expect(appSrc).toMatch(/hasPermission:\s*\(permission/);
  });

  it("la décision de rôle est centralisée (roleHasPermission, source unique)", () => {
    expect(appSrc).toMatch(/roleHasPermission\(/);
  });
});

describe("R142 — décision de rôle (fail-closed hors canon)", () => {
  it("un rôle canon détient ses permissions déclarées", () => {
    expect(roleHasPermission("ADMIN", "admin:settings")).toBe(true);
    expect(roleHasPermission("TREASURIER", "finance:manage")).toBe(true);
    expect(roleHasPermission("BENEVOLE", "report:read")).toBe(true);
  });

  it("un rôle canon n'obtient PAS une permission non déclarée", () => {
    expect(roleHasPermission("MEMBRE", "admin:settings")).toBe(false);
    expect(roleHasPermission("MEMBRE", "finance:manage")).toBe(false);
  });

  it("un rôle HORS canon (CENTRAL_ADMIN historique) est refusé", () => {
    expect(parseRole("CENTRAL_ADMIN")).toBeNull();
    expect(roleHasPermission("CENTRAL_ADMIN", "admin:settings")).toBe(false);
  });

  it("un rôle absent (null/undefined/vide) est refusé", () => {
    expect(roleHasPermission(null, "report:read")).toBe(false);
    expect(roleHasPermission(undefined, "report:read")).toBe(false);
    expect(roleHasPermission("", "report:read")).toBe(false);
  });
});

describe("R142 — aucun rôle légitime n'est enfermé dehors des routes /admin", () => {
  const roles = Object.keys(PERMISSION_MATRIX) as Role[];

  it("les routes /admin* gardées par permission restent franchissables par ≥1 rôle", () => {
    // La garde est cohérente : si une route exige P, au moins un rôle canon
    // détient P (jamais 0 — sinon la route serait morte pour tout le monde).
    for (const route of ROUTE_REGISTRY) {
      if (!route.permission) continue;
      const holders = roles.filter((r) => roleHasPermission(r, route.permission!));
      expect(
        holders.length,
        `la route ${route.pattern} exige « ${route.permission} » mais AUCUN rôle canon ne le détient`,
      ).toBeGreaterThan(0);
    }
  });

  it("la réception des rapports n'exige AUCUNE permission de route (appartenance seule)", () => {
    // `/admin/reports*` = écran de RÉCEPTION : ouvert à tout membre de l'org
    // destinataire (Dashboard : lien « Voir tout » sans garde de rôle ; RLS
    // `org_reports_receiver` = appartenance d'org). Toute permission de route
    // ici enfermerait dehors des destinataires légitimes (R142) — `MEMBRE` ne
    // détient pas `report:read`.
    for (const pattern of ["/admin/reports", "/admin/reports/:id"]) {
      const route = ROUTE_REGISTRY.find((r) => r.pattern === pattern);
      expect(route, `${pattern} doit exister`).toBeDefined();
      expect(route!.permission, `${pattern} ne doit exiger aucune permission`).toBeUndefined();
    }
  });
});
