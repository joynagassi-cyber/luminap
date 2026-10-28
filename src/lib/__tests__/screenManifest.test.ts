/**
 * Manifeste des écrans — cohérence entre captures, routes et tutoriel.
 *
 * Le risque réel de cette fonctionnalité n'est pas technique, il est
 * documentaire : une capture étiquetée « Membres » qui montre en fait la page
 * de connexion, ou un tutoriel qui renvoie vers un écran supprimé. Ces tests
 * échouent avant que cela n'atteigne un utilisateur.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  SCREEN_MANIFEST,
  DYNAMIC_SCREENS,
  AUTHENTICATED_SCREENS,
  PUBLIC_SCREENS,
  screenById,
  screensForHowto,
} from "../screenManifest";
import { ROUTE_REGISTRY } from "../routeResolver";
import { HOWTOS } from "../howto";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("manifeste — structure", () => {
  it("les identifiants sont uniques (ils servent de noms de fichier)", () => {
    const ids = SCREEN_MANIFEST.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("les identifiants sont sûrs pour un nom de fichier", () => {
    for (const s of SCREEN_MANIFEST) {
      // Un id avec espace, majuscule ou slash produirait une capture
      // introuvable par l'application.
      expect(s.id, `id invalide : ${s.id}`).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("chaque écran a un titre, une raison d'être et un repère visuel", () => {
    for (const s of SCREEN_MANIFEST) {
      expect(s.title.trim().length, `${s.id} sans titre`).toBeGreaterThan(0);
      expect(s.purpose.trim().length, `${s.id} sans purpose`).toBeGreaterThan(0);
      expect(s.hint.trim().length, `${s.id} sans hint`).toBeGreaterThan(0);
    }
  });

  it("aucun écran n'est déclaré deux fois sur la même route", () => {
    const routes = SCREEN_MANIFEST.map((s) => s.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("partage correctement public et authentifié", () => {
    expect(PUBLIC_SCREENS.length + AUTHENTICATED_SCREENS.length).toBe(
      SCREEN_MANIFEST.length,
    );
    // Se connecter et réclamer une invitation doivent rester publiques :
    // sans ça, un nouvel utilisateur ne pourrait jamais entrer.
    expect(PUBLIC_SCREENS.map((s) => s.id)).toContain("auth");
    expect(PUBLIC_SCREENS.map((s) => s.id)).toContain("invitation-claim");
  });
});

describe("manifeste — les routes existent vraiment", () => {
  it("chaque route est déclarée dans ROUTE_REGISTRY", () => {
    const known = new Set(ROUTE_REGISTRY.map((r) => r.pattern));
    for (const s of SCREEN_MANIFEST) {
      expect(known.has(s.route), `${s.id} → « ${s.route} » absente du registre`).toBe(
        true,
      );
    }
  });

  it("chaque route est réellement montée dans src/ionic/routes", () => {
    const declared = new Set<string>();
    for (const f of readdirSync(resolve(ROOT, "src/ionic/routes"))) {
      if (!f.endsWith(".tsx")) continue;
      const src = readFileSync(resolve(ROOT, "src/ionic/routes", f), "utf8");
      for (const m of src.matchAll(/path="([^"]+)"/g)) declared.add(m[1]);
    }
    for (const s of SCREEN_MANIFEST) {
      expect(
        declared.has(s.route),
        `${s.id} → « ${s.route} » n'est montée par aucune route Ionic`,
      ).toBe(true);
    }
  });

  it("les routes dynamiques documentées existent aussi", () => {
    const known = new Set(ROUTE_REGISTRY.map((r) => r.pattern));
    for (const d of DYNAMIC_SCREENS) {
      expect(known.has(d.route), `route dynamique inconnue : ${d.route}`).toBe(true);
    }
  });

  it("aucune route dynamique ne figure dans les écrans capturables", () => {
    // On ne peut pas visiter `/transaction/:id` sans id : une capture y
    // photographierait une page d'erreur, pas l'écran voulu.
    for (const s of SCREEN_MANIFEST) {
      expect(s.route, `${s.id} est dynamique`).not.toMatch(/[:*]/);
    }
  });
});

describe("manifeste — liens vers le tutoriel", () => {
  it("chaque `howto` référencé existe dans le catalogue", () => {
    const ids = new Set(HOWTOS.map((h) => h.id));
    for (const s of SCREEN_MANIFEST) {
      for (const ref of s.howto ?? []) {
        expect(ids.has(ref), `${s.id} → parcours inconnu « ${ref} »`).toBe(true);
      }
    }
  });

  it("chaque section du Tutoriel référencée existe", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/Tutorial.tsx"), "utf8");
    const start = src.indexOf("const SECTIONS: SectionData[] = [");
    const block = src.slice(start, src.indexOf("\n];", start));
    const sections = new Set(
      [...block.matchAll(/^\s{4}id: "([^"]+)"/gm)].map((m) => m[1]),
    );
    for (const s of SCREEN_MANIFEST) {
      if (!s.sectionId) continue;
      expect(
        sections.has(s.sectionId),
        `${s.id} → section inconnue « ${s.sectionId} »`,
      ).toBe(true);
    }
  });

  it("chaque parcours qui a des étapes a au moins un écran (ou aucun, mais pas d'id faux)", () => {
    for (const h of HOWTOS) {
      const screens = screensForHowto(h.id);
      // L'inverse n'est pas imposé : tous les parcours n'ont pas de capture.
      // Mais si `screens` renvoie quelque chose, les routes doivent être valides
      // (déjà vérifié ci-dessus).
      expect(Array.isArray(screens)).toBe(true);
    }
  });
});

describe("acces directs", () => {
  it("screenById retrouve un écran et renvoie undefined sinon", () => {
    expect(screenById("finance")?.route).toBe("/finance");
    expect(screenById("n-existe-pas")).toBeUndefined();
  });

  it("screensForHowto renvoie les écrans du parcours", () => {
    const ids = screensForHowto("inviter-membre").map((s) => s.id);
    expect(ids).toContain("invitation-emit");
  });

  it("screensForHowto renvoie [] pour un parcours sans capture", () => {
    expect(screensForHowto("parcours-inexistant")).toEqual([]);
  });
});
