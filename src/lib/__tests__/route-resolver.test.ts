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
  readReturnToFromSearch,
  parseDeepLink,
  webEntryOrgIntent,
  orgSwitchIntentFromLink,
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

  // R125 — les routes PUBLIQUES sont des cibles légitimes : un lien d'invitation
  // vise `/invitation/claim` (invité sans compte), et `/auth` sert de retour
  // après connexion. Avant le correctif, seule `kind === "app"` était retenue.
  it("accepte les routes publiques internes (R125)", () => {
    expect(isAllowedReturnTo("/invitation/claim")).toBe(true);
    expect(isAllowedReturnTo("/auth")).toBe(true);
    expect(isAllowedReturnTo("/sessions")).toBe(true);
  });

  it("refuse toujours le catch-all `*` (jamais une cible)", () => {
    expect(isAllowedReturnTo("*")).toBe(false);
    expect(isAllowedReturnTo("/*")).toBe(false);
  });
});

describe("parseDeepLink — lien d'invitation (R125)", () => {
  it("un lien `lumina://invitation/claim?code=…` atteint l'écran de réclamation", () => {
    const link = parseDeepLink("lumina://invitation/claim?code=AB12");
    // Avant le correctif : path réécrit en `/dashboard` → le parcours
    // d'adhésion par lien profond n'aboutissait jamais.
    expect(link?.path).toBe("/invitation/claim");
    // Le code est un code d'INVITATION, pas un code OAuth (sinon
    // `handleOAuthDeepLink` tenterait un échange PKCE sur ce code).
    expect(link?.invitationCode).toBe("AB12");
    expect(link?.code).toBeNull();
  });

  it("conserve la protection contre la redirection ouverte", () => {
    const bad = parseDeepLink("lumina://dashboard?returnTo=//evil.com");
    expect(bad?.returnTo).toBeNull();
    // Le parseur ne retient que le CHEMIN (jamais l'hôte) : pas de redirection
    // vers un domaine externe. Un hôte externe ne peut viser qu'une route
    // interne connue.
    const ext = parseDeepLink("https://evil.com/ceci-nexiste-pas");
    expect(ext?.path).toBe("/dashboard");
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
    expect(d?.invitationCode).toBeNull();
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

describe("R126 — needs-auth transmet un returnTo allowlisté et consommable", () => {
  it("une route protégée non authentifiée produit un returnTo vers elle-même", () => {
    const out = resolveRoute("/finance", anon);
    expect(out.outcome).toBe("needs-auth");
    if (out.outcome === "needs-auth") {
      expect(out.returnTo).toBe("/finance");
    }
  });

  it("readReturnToFromSearch lit et valide un returnTo transmis", () => {
    expect(readReturnToFromSearch("?returnTo=%2Ffinance")).toBe("/finance");
  });

  it("readReturnToFromSearch refuse une redirection ouverte", () => {
    expect(readReturnToFromSearch("?returnTo=//evil.com")).toBeNull();
    expect(readReturnToFromSearch("?returnTo=https://evil.com")).toBeNull();
  });

  it("readReturnToFromSearch retourne null sans paramètre", () => {
    expect(readReturnToFromSearch("")).toBeNull();
    expect(readReturnToFromSearch("?foo=bar")).toBeNull();
  });
});

describe("R127 — intention d'organisation depuis une URL d'ENTRÉE web", () => {
  const A = "org-A";
  const B = "org-B";

  it("un lien d'entrée web vers une autre org produit l'intention", () => {
    expect(
      webEntryOrgIntent(`https://app.lumina.dev/dashboard?org=${B}`, A),
    ).toEqual({ orgId: B, path: "/dashboard" });
  });

  it("l'intention alimente org-switch-required dans le résolveur", () => {
    const intent = webEntryOrgIntent(`https://app.lumina.dev/finance?org=${B}`, A);
    expect(intent).not.toBeNull();
    expect(
      resolveRoute(intent!.path, {
        isAuthenticated: true,
        activeOrgId: A,
        linkOrgId: intent!.orgId,
      }),
    ).toEqual({ outcome: "org-switch-required", orgId: B });
  });

  it("aucune intention quand l'URL vise l'org DÉJÀ active", () => {
    expect(
      webEntryOrgIntent(`https://app.lumina.dev/dashboard?org=${A}`, A),
    ).toBeNull();
  });

  it("aucune intention sans organisation active connue (fail-open)", () => {
    expect(
      webEntryOrgIntent(`https://app.lumina.dev/dashboard?org=${B}`, null),
    ).toBeNull();
  });

  it("aucune intention sans paramètre org", () => {
    expect(webEntryOrgIntent("https://app.lumina.dev/dashboard", A)).toBeNull();
  });

  it("`?org=` n'est PAS une bascule sur les pages qui le consomment localement", () => {
    // `/invitation/emit` et `/admin/units` lisent `?org=` comme leur PROPRE
    // sélecteur : les traiter comme une demande de bascule casserait ces écrans.
    expect(
      webEntryOrgIntent(`https://app.lumina.dev/invitation/emit?org=${B}`, A),
    ).toBeNull();
    expect(
      webEntryOrgIntent(`https://app.lumina.dev/admin/units?org=${B}`, A),
    ).toBeNull();
  });

  it("refuse une URL invalide", () => {
    expect(webEntryOrgIntent("pas une url", A)).toBeNull();
  });
});

describe("R127 — décision de bascule PARTAGÉE web/natif", () => {
  it("le natif et le web prennent la même décision pour la même URL", () => {
    const url = `lumina://dashboard?org=org-B`;
    const link = parseDeepLink(url);
    expect(orgSwitchIntentFromLink(link, "org-A")).toEqual({
      orgId: "org-B",
      path: "/dashboard",
    });
    expect(webEntryOrgIntent("https://app.lumina.dev/dashboard?org=org-B", "org-A")).toEqual(
      orgSwitchIntentFromLink(link, "org-A"),
    );
  });

  it("le natif n'exige pas de bascule depuis une page au `?org=` local", () => {
    // Divergence corrigée : le natif basculait aussi depuis /invitation/emit.
    const link = parseDeepLink("lumina://invitation/emit?org=org-B");
    expect(orgSwitchIntentFromLink(link, "org-A")).toBeNull();
  });

  it("aucune bascule quand le lien ne porte pas d'organisation", () => {
    expect(orgSwitchIntentFromLink(parseDeepLink("lumina://dashboard"), "org-A")).toBeNull();
  });
});
