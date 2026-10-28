/**
 * Tests du résolveur de routes — contrat §2.2 (Phase 2, P0).
 *
 * Chaque URL doit produire un résultat dans un ensemble FINI et ne jamais
 * aboutir à un écran vide. Ces tests figent le contrat (R3/R10).
 */
import { describe, it, expect } from "vitest";
import {
  resolveRoute,
  isAllowedReturnTo,
  parseDeepLink,
  ROUTE_REGISTRY,
  ROUTE_COUNT,
  type RouteState,
} from "../routeResolver";

const authed: RouteState = { isAuthenticated: true };
const anon: RouteState = { isAuthenticated: false };

describe("resolveRoute — cas publics", () => {
  it("/splash est rendu sans authentification", () => {
    expect(resolveRoute("/splash", anon)).toEqual({ outcome: "render" });
  });

  it("/auth et /auth/callback sont publics", () => {
    expect(resolveRoute("/auth", anon).outcome).toBe("render");
    expect(resolveRoute("/auth/callback", anon).outcome).toBe("render");
  });

  it("/sessions est public (reconnexion sans identifiants)", () => {
    expect(resolveRoute("/sessions", anon).outcome).toBe("render");
  });

  it("/invitation/claim est public (l'invité n'a pas encore de compte)", () => {
    expect(resolveRoute("/invitation/claim", anon).outcome).toBe("render");
  });
});

describe("resolveRoute — racine et routes inconnues", () => {
  it("/ redirige vers /splash (start_url PWA)", () => {
    expect(resolveRoute("/", authed)).toEqual({ outcome: "redirect", to: "/splash" });
  });

  it("une route inconnue → not-found (jamais un écran vide)", () => {
    expect(resolveRoute("/ceci-nexiste-pas", authed)).toEqual({ outcome: "not-found" });
  });

  it("une route paramétrée inconnue reste not-found", () => {
    expect(resolveRoute("/transaction/abc/xyz", authed).outcome).toBe("not-found");
  });
});

describe("resolveRoute — authentification", () => {
  it("route protégée sans session → needs-auth avec returnTo", () => {
    expect(resolveRoute("/dashboard", anon)).toEqual({
      outcome: "needs-auth",
      returnTo: "/dashboard",
    });
  });

  it("route paramétrée sans session → returnTo conservé (chemin interne)", () => {
    expect(resolveRoute("/transaction/42", anon)).toEqual({
      outcome: "needs-auth",
      returnTo: "/transaction/42",
    });
  });
});

describe("resolveRoute — permissions (point d'extension phase 4)", () => {
  it("permission manquante → forbidden avec la permission attendue", () => {
    const state: RouteState = {
      isAuthenticated: true,
      hasPermission: () => false,
    };
    expect(resolveRoute("/admin", state)).toEqual({
      outcome: "forbidden",
      permission: "admin:settings",
    });
  });

  it("permission accordée → render", () => {
    const state: RouteState = {
      isAuthenticated: true,
      hasPermission: () => true,
    };
    expect(resolveRoute("/admin", state).outcome).toBe("render");
  });

  it("route sans permission déclarée → render même si hasPermission refuse", () => {
    const state: RouteState = {
      isAuthenticated: true,
      hasPermission: () => false,
    };
    expect(resolveRoute("/dashboard", state).outcome).toBe("render");
  });
});

describe("resolveRoute — appartenance et contexte d'organisation", () => {
  it("non-membre de l'org active → needs-membership", () => {
    const state: RouteState = { isAuthenticated: true, isOrgMember: false };
    expect(resolveRoute("/dashboard", state).outcome).toBe("needs-membership");
  });

  it("R107 — /onboarding et /org-setup restent accessibles à un non-membre", () => {
    // Ce sont les écrans qui PERMETTENT d'acquérir une appartenance : les
    // bloquer empêcherait tout nouvel inscrit de terminer l'onboarding.
    const state: RouteState = { isAuthenticated: true, isOrgMember: false };
    expect(resolveRoute("/onboarding", state).outcome).toBe("render");
    expect(resolveRoute("/org-setup", state).outcome).toBe("render");
  });

  it("R107 — l'exemption ne s'applique qu'aux routes concernées", () => {
    const state: RouteState = { isAuthenticated: true, isOrgMember: false };
    for (const path of ["/dashboard", "/finance", "/members", "/settings"]) {
      expect(resolveRoute(path, state).outcome).toBe("needs-membership");
    }
  });

  it("R107 — isOrgMember absent (fail-open) → rendu, jamais needs-membership", () => {
    // `undefined` = non-appartenance NON prouvée (base pas encore synchronisée).
    const state: RouteState = { isAuthenticated: true };
    expect(resolveRoute("/dashboard", state).outcome).toBe("render");
  });

  it("deep link vers une autre org que l'org active → org-switch-required AVANT tout rendu", () => {
    const state: RouteState = {
      isAuthenticated: true,
      activeOrgId: "org-A",
      linkOrgId: "org-B",
    };
    expect(resolveRoute("/dashboard", state)).toEqual({
      outcome: "org-switch-required",
      orgId: "org-B",
    });
  });

  it("deep link vers l'org déjà active → pas de bascule", () => {
    const state: RouteState = {
      isAuthenticated: true,
      activeOrgId: "org-A",
      linkOrgId: "org-A",
    };
    expect(resolveRoute("/dashboard", state).outcome).toBe("render");
  });
});

describe("resolveRoute — versionnage de schéma", () => {
  it("client trop ancien → update-required (prime sur tout)", () => {
    const state: RouteState = {
      isAuthenticated: true,
      clientSchemaVersion: 1,
      minSchemaVersion: 2,
    };
    expect(resolveRoute("/dashboard", state).outcome).toBe("update-required");
  });

  it("client à jour → render", () => {
    const state: RouteState = {
      isAuthenticated: true,
      clientSchemaVersion: 2,
      minSchemaVersion: 2,
    };
    expect(resolveRoute("/dashboard", state).outcome).toBe("render");
  });
});

describe("isAllowedReturnTo — anti redirection ouverte", () => {
  it("accepte un chemin interne connu", () => {
    expect(isAllowedReturnTo("/dashboard")).toBe(true);
    expect(isAllowedReturnTo("/transaction/42")).toBe(true);
  });

  it("refuse une URL absolue externe", () => {
    expect(isAllowedReturnTo("https://evil.com")).toBe(false);
  });

  it("refuse un chemin protocol-relatif (//evil.com)", () => {
    expect(isAllowedReturnTo("//evil.com")).toBe(false);
  });

  it("refuse un chemin inconnu", () => {
    expect(isAllowedReturnTo("/ceci-nexiste-pas")).toBe(false);
  });

  it("ignore query et fragment pour la validation", () => {
    expect(isAllowedReturnTo("/dashboard?tab=1#x")).toBe(true);
  });
});

describe("registre de routes", () => {
  it("contient le catch-all en un seul exemplaire", () => {
    const wildcards = ROUTE_REGISTRY.filter((r) => r.pattern === "*");
    expect(wildcards).toHaveLength(1);
  });

  it("ROUTE_COUNT exclut le catch-all", () => {
    expect(ROUTE_COUNT).toBe(ROUTE_REGISTRY.length - 1);
    expect(ROUTE_COUNT).toBeGreaterThan(50);
  });

  it("aucune route ne résout vers un résultat hors de l'ensemble fini", () => {
    const allowed = new Set([
      "render",
      "redirect",
      "needs-auth",
      "needs-membership",
      "forbidden",
      "not-found",
      "org-switch-required",
      "update-required",
      "loading",
    ]);
    for (const r of ROUTE_REGISTRY) {
      const path = r.pattern === "*" ? "/__x__" : r.pattern.replace(/:id/g, "1");
      expect(allowed.has(resolveRoute(path, authed).outcome)).toBe(true);
      expect(allowed.has(resolveRoute(path, anon).outcome)).toBe(true);
    }
  });
});

describe("parseDeepLink — deep links web et applicatifs", () => {
  it("extrait le chemin d'un lien web interne", () => {
    const d = parseDeepLink("https://lumina.app/transaction/42");
    expect(d?.path).toBe("/transaction/42");
  });

  it("normalise un lien applicatif lumina://", () => {
    const d = parseDeepLink("lumina://transaction/42");
    expect(d?.path).toBe("/transaction/42");
  });

  it("extrait le code OAuth d'un callback", () => {
    const d = parseDeepLink("lumina://auth/callback?code=abc123");
    expect(d?.code).toBe("abc123");
  });

  it("valide returnTo contre la liste d'autorisation", () => {
    const ok = parseDeepLink("lumina://dashboard?returnTo=/members");
    expect(ok?.returnTo).toBe("/members");
    const bad = parseDeepLink("lumina://dashboard?returnTo=//evil.com");
    expect(bad?.returnTo).toBeNull();
  });

  it("extrait l'organisation du lien", () => {
    const d = parseDeepLink("lumina://dashboard?org=org-B");
    expect(d?.orgId).toBe("org-B");
  });

  it("rejette un chemin inconnu et retombe sur /dashboard", () => {
    const d = parseDeepLink("lumina://ceci-nexiste-pas");
    expect(d?.path).toBe("/dashboard");
  });

  it("retourne null pour une URL illisible", () => {
    expect(parseDeepLink("pas une url")).toBeNull();
  });
});
