/**
 * Garde d'inventaire §5.1 — « états UX sur CHAQUE écran ».
 *
 * Le contrat §5.1 exige que chaque écran monté par le routeur expose un état
 * UX observable (vide / chargement / erreur / prêt) via `data-screen-state`,
 * afin qu'aucun écran ne soit muet (ni écran noir, ni écran figé sans retour).
 *
 * Ce test est l'analogue de la garde d'inventaire RLS (Phase 8) : il fige la
 * règle et échoue dès qu'un écran monté cesse de l'exposer. Il est *statique*
 * (lecture des sources) : pas besoin de rendre l'écran, donc aucune dépendance
 * Ionic/Supabase.
 *
 * Deux invariants :
 *   1. Tout composant monté par `<Route>` expose un mécanisme d'état
 *      (`data-screen-state`, `<ScreenState>`, `<EmptyState>` ou `SettingsShell`).
 *   2. Toute valeur écrite dans `data-screen-state` appartient au catalogue
 *      fini déclaré dans `RouteStates.tsx` (anti-dérive : une faute de frappe
 *      comme `data-screen-state="loadingg"` ne doit pas passer).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const routesDir = resolve(__dirname, "../../ionic/routes");

/** Catalogue fini, lu depuis la source de vérité `RouteStates.tsx`. */
function catalogStates(): string[] {
  const src = readFileSync(resolve(__dirname, "../../components/RouteStates.tsx"), "utf8");
  const block = src.match(/export type ScreenStateValue\s*=([\s\S]*?);/);
  if (!block) throw new Error("type ScreenStateValue introuvable dans RouteStates.tsx");
  return [...block[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]).sort();
}

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
      const name = m[1];
      const mod = imports.get(name);
      if (!mod) throw new Error(`${f} : import lazy introuvable pour ${name}`);
      out.set(name, mod);
    }
  }
  return out;
}

function pageSource(moduleSpecifier: string): string {
  // "@/pages/Foo" → src/pages/Foo.tsx
  const rel = moduleSpecifier.replace(/^@\//, "");
  return readFileSync(resolve(__dirname, "../..", rel + ".tsx"), "utf8");
}

const STATE_MECHANISM =
  /data-screen-state=|<\s*ScreenState\b|<\s*EmptyState\b|SettingsShell/;

describe("§5.1 — chaque écran monté expose un état UX observable", () => {
  const pages = mountedPages();

  it("l'inventaire couvre tous les écrans montés (≥ 50)", () => {
    expect(pages.size).toBeGreaterThan(50);
  });

  it("CHAQUE écran monté expose un mécanisme d'état (data-screen-state / ScreenState / EmptyState / SettingsShell)", () => {
    const mute = [...pages.entries()]
      .filter(([, mod]) => !STATE_MECHANISM.test(pageSource(mod)))
      .map(([name]) => name);
    expect(
      mute,
      `écrans sans état UX §5.1 : ${mute.join(", ")}`,
    ).toEqual([]);
  });

  it("toute valeur `data-screen-state` appartient au catalogue de RouteStates.tsx", () => {
    const allowed = new Set(catalogStates());
    const offenders: string[] = [];
    for (const [name, mod] of pages) {
      for (const m of pageSource(mod).matchAll(/data-screen-state="([^"]*)"/g)) {
        if (!allowed.has(m[1])) offenders.push(`${name}: "${m[1]}"`);
      }
    }
    expect(
      offenders,
      `valeurs d'état hors catalogue : ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("le catalogue couvre au moins les états clés (vide/chargement/erreur/prêt)", () => {
    const states = catalogStates();
    for (const key of ["empty", "loading", "error", "ready"]) {
      expect(states).toContain(key);
    }
  });

  it("les composants partagés d'état exposent leur marqueur", () => {
    const emptyState = readFileSync(
      resolve(__dirname, "../../components/EmptyState.tsx"),
      "utf8",
    );
    expect(emptyState).toMatch(/data-screen-state="empty"/);
    const settingsShell = readFileSync(
      resolve(__dirname, "../../components/SettingsShell.tsx"),
      "utf8",
    );
    expect(settingsShell).toMatch(/data-screen-state="ready"/);
  });
});
