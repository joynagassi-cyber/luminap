// @vitest-environment jsdom
/**
 * PM2 — deep link vers une AUTRE organisation : la branche `org-switch-required`
 * du résolveur était MORTE (aucun appelant ne passait `linkOrgId`).
 *
 * Ce test couvre la pièce manquante : le porteur d'intention qui alimente
 * `linkOrgId`, et la décision du résolveur qui en découle.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  setDeepLinkOrgIntent,
  getDeepLinkOrgIntent,
  clearDeepLinkOrgIntent,
} from "@/lib/deepLinkIntent";
import { resolveRoute } from "@/lib/routeResolver";

describe("deepLinkIntent — PM2", () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearDeepLinkOrgIntent();
  });

  it("mémorise et restitue l'organisation visée", () => {
    setDeepLinkOrgIntent({ orgId: "org-B", path: "/dashboard" });
    expect(getDeepLinkOrgIntent()).toEqual({ orgId: "org-B", path: "/dashboard" });
  });

  it("survit à une relecture depuis sessionStorage (redirection routeur)", () => {
    sessionStorage.setItem(
      "lumina-deeplink-org-intent",
      JSON.stringify({ orgId: "org-B", path: "/transactions" }),
    );
    // `beforeEach` a remis la mémoire à zéro → `get` doit relire le stockage.
    expect(getDeepLinkOrgIntent()).toEqual({ orgId: "org-B", path: "/transactions" });
  });

  it("ignore une valeur corrompue", () => {
    sessionStorage.setItem("lumina-deeplink-org-intent", "{pas du json");
    expect(getDeepLinkOrgIntent()).toBeNull();
  });

  it("clear efface mémoire ET sessionStorage", () => {
    setDeepLinkOrgIntent({ orgId: "org-B", path: "/dashboard" });
    clearDeepLinkOrgIntent();
    expect(getDeepLinkOrgIntent()).toBeNull();
    expect(sessionStorage.getItem("lumina-deeplink-org-intent")).toBeNull();
  });
});

describe("resolveRoute alimenté par l'intention — PM2", () => {
  it("intention vers une autre org → org-switch-required", () => {
    const intent = { orgId: "org-B", path: "/dashboard" };
    const activeOrgId = "org-A";
    const linkOrgId = intent.orgId !== activeOrgId ? intent.orgId : null;
    expect(
      resolveRoute("/dashboard", { isAuthenticated: true, activeOrgId, linkOrgId }),
    ).toEqual({ outcome: "org-switch-required", orgId: "org-B" });
  });

  it("intention vers l'org déjà active → render (pas de bascule inutile)", () => {
    const activeOrgId = "org-A";
    const linkOrgId = "org-A" !== activeOrgId ? "org-A" : null;
    expect(
      resolveRoute("/dashboard", { isAuthenticated: true, activeOrgId, linkOrgId })
        .outcome,
    ).toBe("render");
  });
});
