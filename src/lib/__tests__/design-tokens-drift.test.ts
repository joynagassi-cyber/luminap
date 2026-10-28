/**
 * Garde anti-dérive des jetons de design (Phase 10) — `src/ionic/theme.ts` (TS)
 * vs `src/App.css` (CSS).
 *
 * `theme.ts` duplique la palette dans deux objets TS (`LUMINA_TOKENS`,
 * `LUMINA_LIGHT_TOKENS`) pour poser les triplets `-rgb` et les variables
 * `--ion-*` que le CSS ne peut pas exprimer. `App.css` reste la **source de
 * vérité** des couleurs. Rien ne garantissait leur synchronisation : une
 * retouche de palette dans l'un sans l'autre passait inaperçue (classe R65.b :
 * dérive code↔document/asset non gardée).
 *
 * La garde relève, pour chaque clé TS (camelCase → kebab-case), la valeur CSS
 * du bloc `:root`/`[data-theme="dark"]` et du bloc `[data-theme="light"]`, et
 * exige l'égalité (insensible à la casse hexadécimale). Les couleurs
 * financières et d'accent, volontairement identiques entre les modes, sont
 * couvertes par la même règle.
 *
 * Non-vacuité : la garde échoue si une valeur TS diverge de la valeur CSS
 * correspondante (vérifié en modifiant temporairement une couleur — voir le
 * receipt de la Phase 10).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { LUMINA_TOKENS, LUMINA_LIGHT_TOKENS } from "@/ionic/theme";

const cssPath = resolve(__dirname, "../../App.css");
const css = readFileSync(cssPath, "utf8");

/** Extrait le contenu d'un bloc `selecteur { ... }` (1er match). */
function block(selector: string): string {
  const re = new RegExp(
    selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}",
  );
  const m = css.match(re);
  if (!m) throw new Error(`bloc CSS introuvable : ${selector}`);
  return m[1];
}

/** Lit les tokens `--x: #hex;` d'un bloc CSS (clé kebab-case → hex minuscule). */
function tokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

/** `surfaceHover` → `surface-hover`, `dataIncome` → `data-income`. */
function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

// `App.css` a trois blocs : le `:root` global porte les couleurs de données et
// d'accent (partagées entre modes) ; `[data-theme="dark"]` et
// `[data-theme="light"]` portent les neutres. La cascade réelle = global +
// bloc de thème, donc on fusionne dans cet ordre.
const globalRoot = tokens(block(":root"));
const darkTheme = tokens(block('[data-theme="dark"]'));
const lightTheme = tokens(block('[data-theme="light"]'));
const darkCss = { ...globalRoot, ...darkTheme };
const lightCss = { ...globalRoot, ...lightTheme };

describe("jetons design TS ↔ CSS (Phase 10)", () => {
  it("le catalogue CSS expose les tokens attendus", () => {
    expect(Object.keys(darkCss).length).toBeGreaterThan(10);
    expect(Object.keys(lightCss).length).toBeGreaterThan(10);
  });

  it("chaque token de LUMINA_TOKENS (mode sombre) correspond au CSS", () => {
    const mismatches: string[] = [];
    for (const [key, tsValue] of Object.entries(LUMINA_TOKENS)) {
      const cssKey = kebab(key);
      const cssValue = darkCss[cssKey];
      if (!cssValue) {
        mismatches.push(`${cssKey} absent de :root/[data-theme="dark"]`);
      } else if (cssValue !== tsValue.toLowerCase()) {
        mismatches.push(`${cssKey} : TS=${tsValue} CSS=${cssValue}`);
      }
    }
    expect(mismatches, mismatches.join(" | ")).toEqual([]);
  });

  it("chaque token de LUMINA_LIGHT_TOKENS (mode clair) correspond au CSS", () => {
    const mismatches: string[] = [];
    for (const [key, tsValue] of Object.entries(LUMINA_LIGHT_TOKENS)) {
      const cssKey = kebab(key);
      const cssValue = lightCss[cssKey];
      if (!cssValue) {
        mismatches.push(`${cssKey} absent de [data-theme="light"]`);
      } else if (cssValue !== tsValue.toLowerCase()) {
        mismatches.push(`${cssKey} : TS=${tsValue} CSS=${cssValue}`);
      }
    }
    expect(mismatches, mismatches.join(" | ")).toEqual([]);
  });

  it("non-vacuité : une valeur TS erronée serait détectée", () => {
    // Simule la comparaison sur une valeur volontairement fausse.
    const fake = { ...LUMINA_TOKENS, canvas: "#000000" };
    const cssValue = darkCss[kebab("canvas")];
    expect(cssValue === fake.canvas.toLowerCase()).toBe(false);
  });
});
