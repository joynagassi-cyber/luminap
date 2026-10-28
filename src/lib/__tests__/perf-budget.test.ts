/**
 * Budget de performance mesuré (contrat Phase 10 : « budgets perf mesurés »).
 *
 * Pourquoi un test et pas seulement un script : un budget qui n'échoue nulle
 * part n'existe pas. Ici on verrouille le **poids JavaScript du premier rendu**
 * (ce que le navigateur télécharge et exécute avant d'afficher quoi que ce
 * soit) et la **taille du chunk d'entrée**, à partir de l'artefact réel
 * `dist/index.html` produit par `vite build`.
 *
 * Justification des budgets (voir `docs/agent/perf-budget.json`) :
 *   - Le premier rendu est ce qui conditionne le temps d'affichage perçu sur un
 *     téléphone d'église (réseau 4G médiocre). On verrouille le nombre de
 *     requêtes (≤ 28) et le poids brut/gzip (≤ 2560 / 650 kB) avec ~12 % de
 *     marge au-dessus de la mesure courante, pour absorber une dérive légère
 *     sans casser sur du bruit, mais échouer sur une vraie régression
 *     (ex. un import statique lourd ajouté au bundle d'entrée).
 *   - Le chunk d'entrée (`index-*.js`) ne doit pas repasser au-dessus de
 *     800 kB brut / 260 kB gzip.
 *
 * Le test est **skippé** proprement si `dist/` n'existe pas (suite unitaire
 * lancée sans build) — il devient actif dès qu'on exécute `vite build`.
 * Régénérer les mesures : `./node_modules/.bin/vite build` puis relancer.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { gzipSync } from "zlib";
import { resolve } from "path";

interface PerfBudget {
  budgets: Record<string, number>;
  measured: Record<string, number>;
}

const distDir = resolve(__dirname, "../../../dist");
const indexHtml = resolve(distDir, "index.html");
const budgetPath = resolve(__dirname, "../../../docs/agent/perf-budget.json");

function loadBudget(): PerfBudget {
  return JSON.parse(readFileSync(budgetPath, "utf8")) as PerfBudget;
}

/** Fichiers JS réellement requis pour le premier rendu (entrée + preloads). */
function firstRenderFiles(): string[] {
  const html = readFileSync(indexHtml, "utf8");
  const refs = [
    ...html.matchAll(/<script[^>]*src="([^"]+\.js)"/g),
    ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"/g),
  ].map((m) => m[1]);
  return [...new Set(refs.map((p) => resolve(distDir, p.replace(/^\//, ""))))];
}

function rawKb(paths: string[]): number {
  return paths.reduce((sum, p) => sum + statSync(p).size, 0) / 1024;
}

function gzipKb(paths: string[]): number {
  return (
    paths.reduce((sum, p) => sum + gzipSync(readFileSync(p)).length, 0) / 1024
  );
}

const built = existsSync(indexHtml);

// R116 — « filet déclaré, jamais déclenché » : `skipIf(!built)` rendait cette
// garde MUETTE en CI (le job `unit` ne construisait pas `dist/`). On échoue
// désormais explicitement si la garde est attendue mais que l'artefact manque.
// La variable `CI` est positionnée par GitHub Actions ; en local, un simple
// `vitest run` sans build reste toléré (skip), pour ne pas gêner le TDD.
const expectBuilt = !!process.env.CI;

it("l'artefact de build est présent quand la garde est attendue (R116)", () => {
  if (!expectBuilt) return; // hors CI : skip toléré
  expect(
    built,
    "dist/index.html absent : la garde de budget de perf serait silencieusement ignorée (R116)",
  ).toBe(true);
});

describe.skipIf(!built)("budget de performance (premier rendu, dist/ présent)", () => {
  const budget = loadBudget();

  it("le budget est documenté et daté", () => {
    expect(Object.keys(budget.budgets).length).toBeGreaterThan(4);
    expect(budget.measured["first_render_raw_kb"]).toBeGreaterThan(0);
  });

  it("le nombre de requêtes au premier rendu reste sous budget", () => {
    const files = firstRenderFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files.length).toBeLessThanOrEqual(budget.budgets.first_render_requests_max);
  });

  it("le poids brut du premier rendu reste sous budget", () => {
    const kb = rawKb(firstRenderFiles());
    expect(kb).toBeLessThanOrEqual(budget.budgets.first_render_raw_kb_max);
  });

  it("le poids gzip du premier rendu reste sous budget", () => {
    const kb = gzipKb(firstRenderFiles());
    expect(kb).toBeLessThanOrEqual(budget.budgets.first_render_gzip_kb_max);
  });

  it("le chunk d'entrée (index-*.js) reste sous budget", () => {
    const entry = firstRenderFiles().filter((p) =>
      /\/index-[\w-]+\.js$/.test(p),
    );
    expect(entry.length).toBeGreaterThan(0);
    expect(rawKb(entry)).toBeLessThanOrEqual(budget.budgets.entry_raw_kb_max);
    expect(gzipKb(entry)).toBeLessThanOrEqual(budget.budgets.entry_gzip_kb_max);
  });

  it("le JS total livré (tous chunks) reste sous budget (gzip)", () => {
    const all = readdirSync(resolve(distDir, "assets"))
      .filter((n) => n.endsWith(".js"))
      .map((n) => resolve(distDir, "assets", n));
    expect(gzipKb(all)).toBeLessThanOrEqual(budget.budgets.total_js_gzip_kb_max);
  });
});
