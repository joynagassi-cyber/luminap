/**
 * Phase 8 — entrées hostiles : injection de formule CSV (OWASP).
 *
 * Un champ contrôlé par un utilisateur commençant par `=`, `+`, `-`, `@` est
 * exécuté comme formule par Excel / LibreOffice / Sheets à l'ouverture du
 * fichier exporté (`=HYPERLINK(...)`, `=cmd|'/c calc'!A0`, …). Le garde-fou
 * neutralise ces préfixes et applique la citation RFC 4180.
 */
import { describe, it, expect } from "vitest";
import { escapeCsvCell, escapeCsvRow } from "../csv";

describe("escapeCsvCell — injection de formule", () => {
  it("neutralise les préfixes de formule dangereux", () => {
    for (const payload of [
      '=HYPERLINK("http://evil","x")',
      "+1+1",
      "-2+3",
      "@SUM(A1)",
      '=cmd|\'/c calc\'!A0',
    ]) {
      const out = escapeCsvCell(payload);
      // Neutralisé = apostrophe en tête (après un éventuel guillemet de citation).
      expect(out.replace(/^"/, "").startsWith("'")).toBe(true);
      // le contenu d'origine reste présent (les guillemets internes sont doublés
      // par la citation RFC 4180, on les normalise avant comparaison).
      expect(out.replace(/""/g, '"')).toContain(payload);
    }
  });

  it("neutralise les préfixes de contrôle (TAB/CR/LF)", () => {
    // Neutralisé = préfixé par une apostrophe (éventuellement dans une cellule
    // entre guillemets si elle contient aussi un caractère de contrôle).
    expect(escapeCsvCell("\t=1+1")).toMatch(/^'|"'/);
    expect(escapeCsvCell("\r=1+1")).toMatch(/^'|"'/);
  });

  it("ne touche pas aux valeurs inoffensives", () => {
    expect(escapeCsvCell("Dîme")).toBe("Dîme");
    expect(escapeCsvCell(1500)).toBe("1500");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("escapeCsvCell — citation RFC 4180", () => {
  it("entoure de guillemets si la valeur contient le délimiteur", () => {
    expect(escapeCsvCell("a;b")).toBe('"a;b"');
  });

  it("double les guillemets internes", () => {
    expect(escapeCsvCell('il a dit "oui"')).toBe('"il a dit ""oui"""');
  });

  it("entoure de guillemets si la valeur contient un saut de ligne", () => {
    expect(escapeCsvCell("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });
});

describe("escapeCsvRow", () => {
  it("joint les cellules échappées avec le délimiteur", () => {
    expect(escapeCsvRow(["a", "=b;c", "d"])).toBe('a;"\'=b;c";d');
  });
});
