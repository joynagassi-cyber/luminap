// @vitest-environment jsdom
/**
 * Fil d'Ariane — tampon borné, expurgation PII, capture automatique
 * (clic, navigation, réseau) et désinstallation propre.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  pushBreadcrumb,
  getBreadcrumbs,
  clearBreadcrumbs,
  installBreadcrumbCapture,
  MAX_BREADCRUMBS,
} from "@/lib/observability/breadcrumbs";

beforeEach(() => clearBreadcrumbs());

describe("tampon borné", () => {
  it("conserve les dernières actions dans l'ordre", () => {
    pushBreadcrumb("ui", "un");
    pushBreadcrumb("ui", "deux");
    const items = getBreadcrumbs();
    expect(items.map((b) => b.message)).toEqual(["un", "deux"]);
  });

  it("évince les plus anciennes au-delà de la borne", () => {
    for (let i = 0; i < MAX_BREADCRUMBS + 20; i += 1) pushBreadcrumb("ui", `a${i}`);
    expect(getBreadcrumbs()).toHaveLength(MAX_BREADCRUMBS);
    expect(getBreadcrumbs(1)[0].message).toBe(`a${MAX_BREADCRUMBS + 19}`);
  });

  it("getBreadcrumbs(limit) borne aussi", () => {
    for (let i = 0; i < 10; i += 1) pushBreadcrumb("ui", `a${i}`);
    expect(getBreadcrumbs(3).map((b) => b.message)).toEqual(["a7", "a8", "a9"]);
  });
});

describe("expurgation PII", () => {
  it("masque un e-mail dans le message", () => {
    pushBreadcrumb("network", "échec pour user@example.com");
    expect(getBreadcrumbs(1)[0].message).not.toContain("user@example.com");
  });

  it("masque un e-mail dans les données", () => {
    pushBreadcrumb("ui", "clic", { email: "a@b.com" });
    expect(getBreadcrumbs(1)[0].data?.email).not.toContain("a@b.com");
  });

  it("ne conserve que des primitives", () => {
    pushBreadcrumb("ui", "clic", { obj: { nested: true } as unknown as string, ok: "valeur" });
    expect(getBreadcrumbs(1)[0].data).toEqual({ ok: "valeur" });
  });
});

describe("installBreadcrumbCapture", () => {
  let uninstall: () => void = () => {};

  afterEach(() => {
    uninstall();
    clearBreadcrumbs();
  });

  it("capture un clic sur un bouton identifié par data-testid", () => {
    uninstall = installBreadcrumbCapture();
    const btn = document.createElement("button");
    btn.setAttribute("data-testid", "bouton-enregistrer");
    document.body.appendChild(btn);
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const items = getBreadcrumbs();
    expect(items.some((b) => b.category === "ui" && b.message.includes("bouton-enregistrer"))).toBe(true);
    document.body.removeChild(btn);
  });

  it("capture un changement de connectivité", () => {
    uninstall = installBreadcrumbCapture();
    window.dispatchEvent(new Event("offline"));
    expect(getBreadcrumbs().some((b) => b.category === "network")).toBe(true);
  });

  it("journalise un échec réseau (statut ≥ 400) sans lire le corps", async () => {
    const original = window.fetch;
    window.fetch = (async () => new Response("nope", { status: 403 })) as typeof window.fetch;
    uninstall = installBreadcrumbCapture();
    const res = await window.fetch("/rest/v1/transactions", { method: "POST" });
    expect(res.status).toBe(403);
    const net = getBreadcrumbs().find((b) => b.category === "network");
    expect(net?.message).toContain("403");
    expect(net?.message).toContain("POST");
    uninstall();
    uninstall = () => {};
    window.fetch = original;
  });

  it("se désinstalle proprement (fetch restauré)", () => {
    const original = window.fetch;
    const off = installBreadcrumbCapture();
    expect(window.fetch).not.toBe(original);
    off();
    expect(window.fetch).toBe(original);
  });
});
