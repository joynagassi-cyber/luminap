/**
 * Garde anti-dérive — le registre du résolveur doit refléter EXACTEMENT les
 * routes réellement montées dans `src/ionic/routes/*.tsx`.
 *
 * Défaut visé (contrat §2.2, P0 « zéro écran noir ») : si quelqu'un ajoute une
 * `<Route path="…">` sans l'inscrire dans `ROUTE_REGISTRY`, le résolveur la
 * traite comme `not-found` (ou, pire, un guard la laisse aboutir à un écran
 * vide). Inversement, une entrée du registre sans route montée fait pointer les
 * deep links vers le vide. Ce test échoue dès la première dérive.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { ROUTE_REGISTRY } from "../routeResolver";

const routesDir = resolve(__dirname, "../../ionic/routes");

function registeredPaths(): string[] {
  const files = readdirSync(routesDir).filter((f) => f.endsWith(".tsx"));
  const paths = new Set<string>();
  for (const f of files) {
    const src = readFileSync(resolve(routesDir, f), "utf8");
    for (const m of src.matchAll(/path="([^"]+)"/g)) {
      paths.add(m[1]);
    }
  }
  return [...paths].sort();
}

describe("ROUTE_REGISTRY ↔ routes montées (anti-dérive)", () => {
  it("chaque route montée est inscrite dans le registre", () => {
    const registered = new Set(registeredPaths());
    const inRegistry = new Set(ROUTE_REGISTRY.map((r) => r.pattern));
    const missing = [...registered].filter((p) => !inRegistry.has(p));
    expect(missing).toEqual([]);
  });

  it("chaque entrée du registre correspond à une route montée", () => {
    const registered = new Set(registeredPaths());
    const drift = ROUTE_REGISTRY.map((r) => r.pattern).filter(
      (p) => !registered.has(p),
    );
    expect(drift).toEqual([]);
  });

  it("exactement une route catch-all `*`", () => {
    const stars = ROUTE_REGISTRY.filter((r) => r.pattern === "*");
    expect(stars).toHaveLength(1);
    expect(registeredPaths().filter((p) => p === "*")).toHaveLength(1);
  });

  // Le crawler E2E « zéro écran noir » embarque une COPIE de ROUTE_REGISTRY.
  // Si une route est ajoutée au registre sans l'être au crawler, l'invariant
  // « aucune route ne laisse un écran noir » cesse silencieusement de couvrir
  // cette route. On verrouille la copie ici (seule vérification possible sans
  // exécuter Cypress).
  it("la liste du crawler `zero-black-screen.cy.ts` couvre exactement le registre", () => {
    const spec = readFileSync(
      resolve(__dirname, "../../../cypress/e2e/zero-black-screen.cy.ts"),
      "utf8",
    );
    const block = spec.match(/const ROUTES: string\[\] = \[([\s\S]*?)\];/);
    expect(block, "bloc ROUTES introuvable dans le crawler").not.toBeNull();
    const crawler = [
      ...block![1].matchAll(/"([^"]+)"/g),
    ].map((m) => m[1]).sort();
    const registry = ROUTE_REGISTRY.filter((r) => r.pattern !== "*")
      .map((r) => r.pattern)
      .sort();
    expect(crawler).toEqual(registry);
  });

  // La matrice deep link (`deeplinks.matrix.json`) embarque elle aussi une
  // copie du registre. Une route absente de la matrice n'est jamais couverte
  // par les tests de deep link (drift mesuré : `/settings/health` manquait).
  it("la matrice deep link couvre exactement le registre", () => {
    const matrix = JSON.parse(
      readFileSync(resolve(__dirname, "../../../docs/agent/deeplinks.matrix.json"), "utf8"),
    ) as { routes: string[]; routes_total: number };
    const registry = ROUTE_REGISTRY.map((r) => r.pattern).sort();
    expect([...matrix.routes].sort()).toEqual(registry);
    expect(matrix.routes_total).toBe(registry.length);
  });
});
