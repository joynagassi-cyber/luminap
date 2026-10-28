/**
 * Garde « responsive » — toute page montée par le routeur doit borner la
 * largeur de son contenu.
 *
 * Défaut visé (contrat §5, Phase 10 « responsive ») : sur tablette / desktop,
 * une page SANS conteneur borné étale son contenu sur toute la largeur (lignes
 * illisibles, tableaux qui débordent), alors que ses pages sœurs restent
 * centrées. C'était le cas de `CulteDetail`, `EventDetail`, `TransactionNew`
 * et `TransactionNewGroup` (corrigé le 2026-10-28).
 *
 * Le spec Cypress `responsive-skeleton.cy.ts` vérifie le rendu réel
 * (mobile/landscape, absence de scroll horizontal) mais **ne peut pas tourner
 * ici** (environnement E2E, R98/E2). Cette garde est l'analogue STATIQUE : elle
 * lit les sources et échoue dès qu'une page montée cesse de borner sa largeur.
 *
 * Contrainte acceptée : `SettingsShell` (shell qui applique `max-w-lg mx-auto`),
 * une classe `max-w-*` ou un `maxWidth` en style inline.
 *
 * Liste blanche explicite : les trois pages à colonne unique centrée, dont le
 * contenu est déjà borné par la mise en page (`justify-center` / `items-center`)
 * et qui n'ont pas de bloc large à contenir :
 *   - `Splash` (écran de démarrage, logo centré) ;
 *   - `NotFound` (404, message centré) ;
 *   - `Onboarding` (assistant pas-à-pas, colonne centrée).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const routesDir = resolve(__dirname, "../../ionic/routes");
const pagesDir = resolve(__dirname, "..");

const CENTERED_ALLOWLIST = new Set(["Splash", "NotFound", "Onboarding"]);

/** Composant → fichier de page, à partir des imports `lazy(() => import(...))`. */
function mountedPages(): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of readdirSync(routesDir).filter((n) => n.endsWith(".tsx"))) {
    if (f === "lazy-route.tsx") continue;
    const src = readFileSync(resolve(routesDir, f), "utf8");
    const imports = new Map<string, string>();
    for (const m of src.matchAll(
      /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\("([^"]+)"\)/g,
    )) {
      imports.set(m[1], m[2]);
    }
    for (const m of src.matchAll(/LazyRoute component=\{(\w+)\}/g)) {
      const mod = imports.get(m[1]);
      if (mod) out.set(m[1], mod);
    }
  }
  return out;
}

/** Le fichier source d'une page, à partir de son spécificateur d'import. */
function pageSource(moduleSpecifier: string): string | undefined {
  const m = moduleSpecifier.match(/@\/pages\/([\w-]+)/);
  if (!m) return undefined;
  try {
    return readFileSync(resolve(pagesDir, `${m[1]}.tsx`), "utf8");
  } catch {
    return undefined;
  }
}

const WIDTH_CONSTRAINT = /SettingsShell|maxWidth|max-w-[^\s"]+[^"]*mx-auto/;

describe("responsive — chaque page montée borne la largeur de son contenu", () => {
  const pages = mountedPages();

  it("le routeur monte des pages (non-vacuité)", () => {
    expect(pages.size).toBeGreaterThan(30);
  });

  it("aucune page montée n'est pleine largeur sans contrainte", () => {
    const violations: string[] = [];
    for (const [name, mod] of pages) {
      if (CENTERED_ALLOWLIST.has(name)) continue;
      const src = pageSource(mod);
      if (src === undefined) continue; // page hors `src/pages` (composant local)
      if (!WIDTH_CONSTRAINT.test(src)) violations.push(`${name} (${mod})`);
    }
    expect(violations).toEqual([]);
  });

  it("la liste blanche ne référence que des pages réellement montées", () => {
    for (const name of CENTERED_ALLOWLIST) {
      expect(pages.has(name)).toBe(true);
    }
  });
});
