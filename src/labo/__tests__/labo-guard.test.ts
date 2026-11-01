/**
 * Labo Design — tests du garde de compilation (labo-guard.ts).
 *
 * Vérifie que :
 *  - `assertLaboAbsentFromBuild` détecte les fuites de Labo / seed IDs
 *  - `assertLaboAbsentFromBuild` retourne true sur un contenu propre
 *  - Les IDs de seed sont bien définis et uniques
 */

import {
  assertLaboAbsentFromBuild,
  LABO_SEED_IDS,
} from "../labo-guard";

describe("Labo guard", () => {
  it("détecte une fuite d'ID de seed dans un contenu de build", () => {
    const contentAvecFuite = `
      <html><body>
        <script>const seed = "labo-seed-5000-transactions";</script>
      </body></html>
    `;
    expect(assertLaboAbsentFromBuild(contentAvecFuite)).toBe(false);
  });

  it("détecte le mot Labo dans un contenu de build", () => {
    const contentAvecFuite = `
      <html><body>
        <script>const PanneauLabo = () => null;</script>
      </body></html>
    `;
    expect(assertLaboAbsentFromBuild(contentAvecFuite)).toBe(false);
  });

  it("retourne true sur un contenu propre (sans Labo ni seed)", () => {
    const contenuPropre = `
      <html><body>
        <script>const app = "Lumina production";</script>
      </body></html>
    `;
    expect(assertLaboAbsentFromBuild(contenuPropre)).toBe(true);
  });

  it("les IDs de seed sont définis et uniques", () => {
    expect(LABO_SEED_IDS.length).toBeGreaterThan(0);
    const uniques = new Set(LABO_SEED_IDS);
    expect(uniques.size).toBe(LABO_SEED_IDS.length);
    for (const id of LABO_SEED_IDS) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("chaque ID de seed est détecté individuellement", () => {
    for (const id of LABO_SEED_IDS) {
      const content = `<!-- ${id} -->`;
      expect(assertLaboAbsentFromBuild(content)).toBe(false);
    }
  });
});
