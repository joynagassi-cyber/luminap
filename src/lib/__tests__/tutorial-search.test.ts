/**
 * PR16 — Centre d'aide : primitives pures de recherche + FAQ
 * (`src/lib/tutorialContent.ts`).
 *
 * Ce que ces tests verrouillent :
 *   1. **Normalisation accents/casse** — « événement » et « evenement »
 *      matchent la même section ; idem « trésorerie » / « tresorerie ».
 *   2. **Filtrage** — `searchSections` retourne les sections pertinentes
 *      (titre OU corps), et RIEN d'autre.
 *   3. **Requête vide = tout** — une requête vide/blanche renvoie TOUTES les
 *      sections (le centre d'aide ne doit PAS afficher « Aucun résultat »).
 *   4. **FAQ** — 5 à 8 entrées FR complètes, filtrables par question/réponse.
 *   5. **Source unique** — `TUTORIAL_SECTIONS` est bien la liste partagée
 *      (≥ 20 sections), donc Help et Tutorial ne peuvent pas diverger.
 *
 * ── NON-VACUITÉ (preuve documentée, vérifiée) ────────────────────────────────
 * Mutations testées (le test correspondant passe au ROUGE, puis la source est
 * restaurée) :
 *   - Retirer `.normalize("NFD").replace(/[\u0300-\u036f]/g, "")` de
 *     `normalizeForSearch` → 3 tests échouent (dont « insensible aux accents »).
 *   - Remplacer le `return sections.filter(...)` de `searchSections` par
 *     `return sections` → 2 tests échouent (le filtrage disparaît).
 *   Vérifié en appliquant ces mutations : les tests passent au rouge, puis la
 *   source a été restaurée.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeForSearch,
  searchSections,
  searchFaq,
  sectionHaystack,
  TUTORIAL_SECTIONS,
  HELP_FAQ,
} from "@/lib/tutorialContent";

describe("normalizeForSearch", () => {
  it("minuscule et retire les accents", () => {
    expect(normalizeForSearch("Événement")).toBe("evenement");
    expect(normalizeForSearch("Trésorerie")).toBe("tresorerie");
    expect(normalizeForSearch("  BILAN  ")).toBe("bilan");
  });

  it("deux graphies équivalentes deviennent identiques", () => {
    expect(normalizeForSearch("événement")).toBe(normalizeForSearch("evenement"));
  });
});

describe("TUTORIAL_SECTIONS (source unique)", () => {
  it("expose au moins 20 sections (corpus réel partagé)", () => {
    expect(TUTORIAL_SECTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it("chaque section a un id, un titre et un corps non vides", () => {
    for (const s of TUTORIAL_SECTIONS) {
      expect(s.id.trim().length).toBeGreaterThan(0);
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.paragraphs.length).toBeGreaterThan(0);
      expect(sectionHaystack(s).length).toBeGreaterThan(0);
    }
  });
});

describe("searchSections", () => {
  it("requête vide (ou blanche) → TOUTES les sections", () => {
    expect(searchSections("").length).toBe(TUTORIAL_SECTIONS.length);
    expect(searchSections("   ").length).toBe(TUTORIAL_SECTIONS.length);
  });

  it("trouve une section par son TITRE", () => {
    const res = searchSections("membres");
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((s) => s.id === "membres")).toBe(true);
  });

  it("trouve par le CORPS (pas seulement le titre)", () => {
    // « versement » apparaît dans le texte de la section versement.
    const res = searchSections("versement");
    expect(res.length).toBeGreaterThan(0);
  });

  it("insensible aux ACCENTS (evenement ↔ événement)", () => {
    const withAccent = searchSections("événement").map((s) => s.id).sort();
    const withoutAccent = searchSections("evenement").map((s) => s.id).sort();
    expect(withoutAccent).toEqual(withAccent);
    expect(withoutAccent.length).toBeGreaterThan(0);
  });

  it("insensible à la CASSE", () => {
    expect(searchSections("MEMBRES").map((s) => s.id)).toEqual(
      searchSections("membres").map((s) => s.id),
    );
  });

  it("requête sans correspondance → tableau vide", () => {
    expect(searchSections("zzzzqqqqxxxx-inexistant")).toEqual([]);
  });

  it("ne retourne que des sections qui matchent réellement", () => {
    const q = "transaction";
    const res = searchSections(q);
    expect(res.length).toBeGreaterThan(0);
    for (const s of res) {
      expect(normalizeForSearch(sectionHaystack(s))).toContain(
        normalizeForSearch(q),
      );
    }
  });
});

describe("HELP_FAQ", () => {
  it("contient entre 5 et 8 questions fréquentes complètes", () => {
    expect(HELP_FAQ.length).toBeGreaterThanOrEqual(5);
    expect(HELP_FAQ.length).toBeLessThanOrEqual(8);
    for (const f of HELP_FAQ) {
      expect(f.q.trim().length).toBeGreaterThan(0);
      expect(f.a.trim().length).toBeGreaterThan(0);
    }
  });

  it("searchFaq vide → toute la FAQ", () => {
    expect(searchFaq("").length).toBe(HELP_FAQ.length);
  });

  it("searchFaq filtre par question (accents/casse insensibles)", () => {
    const res = searchFaq("SAUVEGARDER");
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((f) => f.q.includes("sauvegarder"))).toBe(true);
  });

  it("searchFaq filtre aussi par réponse", () => {
    const res = searchFaq("squelette");
    expect(res.length).toBeGreaterThan(0);
  });

  it("searchFaq sans correspondance → vide", () => {
    expect(searchFaq("zzzzqqqqxxxx-inexistant")).toEqual([]);
  });
});
