/**
 * Phase 8 — entrées hostiles : helpers de neutralisation (défense en
 * profondeur). Ces tests DOIVENT échouer sans `src/lib/sanitize.ts`.
 *
 * Couverture :
 *   - `escapeHtml`       : XSS stocké neutralisé dans un contexte HTML/attribut ;
 *   - `sanitizeCssValue` : pas de sortie de la valeur CSS (`</style>`, `}`) ;
 *   - `normalizeText`    : suppression des caractères de contrôle + plafond.
 */
import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  sanitizeCssValue,
  normalizeText,
  MAX_TEXT_LENGTH,
} from "../sanitize";

describe("escapeHtml — XSS stocké", () => {
  it("neutralise une balise script injectée", () => {
    const out = escapeHtml('<script>alert("x")</script>');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("neutralise une évasion d'attribut", () => {
    const out = escapeHtml('" onmouseover="alert(1)');
    expect(out).not.toContain('"');
    expect(out).toBe("&quot; onmouseover=&quot;alert(1)");
  });

  it("échappe & < > \" '", () => {
    expect(escapeHtml("a & b < c > d \" e ' f")).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &#39; f",
    );
  });

  it("échappe l'esperluette AVANT les autres (pas de double-encodage cassé)", () => {
    // « &lt; » doit rester littéralement « &amp;lt; » : sinon l'entité
    // injectée par l'utilisateur redeviendrait « < ».
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("null / undefined → chaîne vide", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("sanitizeCssValue — évasion de la feuille de style", () => {
  it("retire les caractères de sortie de la balise <style>", () => {
    const hostile = 'red}</style><script>alert(1)</script>';
    const out = sanitizeCssValue(hostile);
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("</style>");
    expect(out).not.toContain("{");
    expect(out).not.toContain("}");
  });

  it("retire les points-virgules (injection de règles CSS)", () => {
    expect(sanitizeCssValue("red; background:url(http://evil)")).not.toContain(
      ";",
    );
  });

  it("conserve une couleur légitime", () => {
    expect(sanitizeCssValue("#6366f1")).toBe("#6366f1");
    expect(sanitizeCssValue("var(--data-income)")).toBe("var(--data-income)");
  });

  it("plafonne la longueur et retire les caractères de contrôle", () => {
    const out = sanitizeCssValue("\u001b[31m" + "x".repeat(400));
    expect(out.startsWith("\u001b")).toBe(false);
    expect(out.length).toBeLessThanOrEqual(256);
  });
});

describe("normalizeText — caractères de contrôle + longueur", () => {
  it("supprime NUL et les caractères de contrôle C0/C1 (dont ESC)", () => {
    expect(normalizeText("a\u0000b\u0007c\u001bd")).toBe("abcd");
  });

  it("convertit TAB/CR/LF en un espace unique puis trim", () => {
    expect(normalizeText("  a\tb\r\nc  ")).toBe("a b c");
  });

  it("collapseWhitespace réduit les suites d'espaces", () => {
    expect(normalizeText("a    b", { collapseWhitespace: true })).toBe("a b");
  });

  it("plafonne la longueur (défaut et explicite)", () => {
    expect(normalizeText("x".repeat(MAX_TEXT_LENGTH + 50)).length).toBe(
      MAX_TEXT_LENGTH,
    );
    expect(normalizeText("abcdef", { maxLength: 3 })).toBe("abc");
  });

  it("null / undefined → chaîne vide ; valeurs non-chaînes converties", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
    expect(normalizeText(1500)).toBe("1500");
  });

  it("préserve le texte légitime (accents, apostrophes)", () => {
    expect(normalizeText("Dîme d'octobre")).toBe("Dîme d'octobre");
  });
});
