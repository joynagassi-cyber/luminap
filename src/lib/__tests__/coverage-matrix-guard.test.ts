/**
 * Garde anti-dérive (Phase 12) — toute référence de test citée dans
 * `docs/agent/COVERAGE_MATRIX.md` DOIT pointer vers un fichier réel.
 *
 * Pourquoi une garde d'inventaire plutôt qu'une exécution Cypress en CI :
 *   - la suite Cypress n'est pas exploitable en CI (R98/E2) et le binaire n'est
 *     pas installable dans l'environnement de l'agent ;
 *   - la dérive redoutée n'est pas « le test échoue » mais « la matrice cite un
 *     test qui n'existe pas (ou plus) » — c'est-à-dire une couverture déclarée
 *     mais **fictive**. C'est entièrement visible dans le dépôt ;
 *   - déterministe, hors-ligne, instantané (lecture de fichiers).
 *
 * La matrice est un document vivant : la garde n'exige pas que *toutes* les
 * entrées soient vertes, seulement que chaque référence `V: <nom>` / `C: <nom>`
 * désigne un fichier existant. Les `SQL: <migration>` sont vérifiées contre
 * `supabase/migrations/`.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(__dirname, "../../..");
const matrixPath = resolve(repoRoot, "docs/agent/COVERAGE_MATRIX.md");
const vitestDir = resolve(repoRoot, "src");
const cypressDir = resolve(repoRoot, "cypress/e2e");
const migrationsDir = resolve(repoRoot, "supabase/migrations");

function listFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...listFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      out.push(entry.name);
    }
  }
  return out;
}

/** `route-resolver.test.ts` ou `route-resolver` → résolu si un fichier matche. */
function resolvesToFile(ref: string, files: string[], ext: string | string[]): boolean {
  const exts = Array.isArray(ext) ? ext : [ext];
  const clean = ref.replace(/`/g, "").trim();
  if (clean.includes("/") && existsSync(resolve(repoRoot, clean))) return true;
  if (files.includes(clean)) return true;
  return exts.some((e) => files.includes(clean.endsWith(e) ? clean : `${clean}${e}`));
}

const matrix = readFileSync(matrixPath, "utf8");

// Ne considère que le contenu des cellules (colonnes de tableaux markdown).
const vitestFiles = listFiles(vitestDir, ".test.ts").concat(
  listFiles(vitestDir, ".test.tsx"),
);
const cypressFiles = readdirSync(cypressDir).filter((f) => f.endsWith(".cy.ts"));
const migrationFiles = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

describe("COVERAGE_MATRIX ↔ fichiers de test réels (Phase 12)", () => {
  it("la matrice existe et cite au moins un test", () => {
    expect(existsSync(matrixPath)).toBe(true);
    expect(matrix).toMatch(/V:\s/);
    expect(matrix).toMatch(/C:\s/);
  });

  it("chaque référence `V: <nom>` pointe vers un fichier vitest existant", () => {
    const refs = [...matrix.matchAll(/V:\s*`?([a-zA-Z0-9_.:-]+)`?/g)].map(
      (m) => m[1],
    );
    expect(refs.length).toBeGreaterThan(10);
    const missing = [...new Set(refs)].filter(
      (ref) => !resolvesToFile(ref, vitestFiles, [".test.ts", ".test.tsx"]),
    );
    expect(missing, `Références vitest introuvables : ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("chaque référence `C: <nom>` pointe vers un spec Cypress existant", () => {
    const refs = [...matrix.matchAll(/C:\s*`?([a-zA-Z0-9_.:-]+)`?/g)].map(
      (m) => m[1],
    );
    expect(refs.length).toBeGreaterThan(5);
    const missing = [...new Set(refs)].filter(
      (ref) => !resolvesToFile(ref, cypressFiles, ".cy.ts"),
    );
    expect(
      missing,
      `Références Cypress introuvables : ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("chaque référence `SQL: <migration>` pointe vers une migration existante", () => {
    const refs = [...matrix.matchAll(/SQL:\s*`?([a-zA-Z0-9_.:-]+)`?/g)].map(
      (m) => m[1],
    );
    const missing = [...new Set(refs)].filter(
      (ref) => !migrationFiles.some((f) => f.startsWith(ref)),
    );
    expect(
      missing,
      `Migrations introuvables : ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("non-vacuité : une référence fictive est bien détectée comme manquante", () => {
    // Preuve que la garde n'est pas vide : `__inexistant__` ne résout vers rien.
    expect(resolvesToFile("__inexistant__", vitestFiles, ".test.ts")).toBe(false);
    expect(resolvesToFile("__inexistant__", cypressFiles, ".cy.ts")).toBe(false);
  });
});
