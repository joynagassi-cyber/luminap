// @vitest-environment node
/**
 * Garde anti-dérive R17 — migrations du dépôt ↔ instantané mesuré.
 *
 * R17 : le tracker `supabase_migrations.schema_migrations` (70 versions) et les
 * fichiers `supabase/migrations/` (63 horodatés + 63 séquentiels) sont deux
 * historiques **disjoints** (2 versions communes sur 70). Le tracker n'est PAS
 * accessible en CI, donc on ne peut pas comparer directement.
 *
 * Ce qu'on PEUT garder sans base : le nombre et la forme des fichiers du dépôt.
 * La garde échoue dès qu'une migration est ajoutée/retirée, ce qui **force** à
 * re-mesurer la dérive (`docs/agent/migration-drift.json`) et à décider si le
 * nouvel état aggrave R17. Sans elle, une migration ajoutée via l'éditeur SQL
 * (donc jamais tracée) passerait totalement inaperçue.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const SNAPSHOT = join(process.cwd(), "docs", "agent", "migration-drift.json");

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
const timestamped = files.filter((f) => /^\d{14}_/.test(f));
const sequential = files.filter((f) => /^\d{4}_/.test(f));

const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as {
  measured: {
    repo_timestamped_files: number;
    repo_sequential_files: number;
    repo_total_sql_files: number;
    versions_in_common: number;
    common_versions: string[];
    drift_ratio: string;
  };
};

describe("R17 — garde : l'instantané de dérive migrations doit refléter le dépôt", () => {
  it("le nombre de fichiers du dépôt correspond à l'instantané mesuré", () => {
    expect(
      timestamped.length,
      "Fichiers horodatés modifiés → re-mesurer la dérive (R17) et mettre à jour docs/agent/migration-drift.json",
    ).toBe(snapshot.measured.repo_timestamped_files);
    expect(
      sequential.length,
      "Fichiers séquentiels modifiés → re-mesurer la dérive (R17)",
    ).toBe(snapshot.measured.repo_sequential_files);
    expect(files.length).toBe(snapshot.measured.repo_total_sql_files);
  });

  it("les versions communes déclarées existent bien comme fichiers horodatés", () => {
    expect(snapshot.measured.versions_in_common).toBe(
      snapshot.measured.common_versions.length,
    );
    for (const v of snapshot.measured.common_versions) {
      expect(
        timestamped.some((f) => f.startsWith(v + "_")),
        `version commune ${v} absente des fichiers du dépôt — instantané périmé`,
      ).toBe(true);
    }
  });

  it("la dérive reste documentée comme quasi totale (garde de non-régression du constat)", () => {
    // Si ce ratio venait à changer (régularisation de l'historique), la garde
    // doit le signaler : ce n'est pas une régression, mais un état à re-décider.
    expect(snapshot.measured.drift_ratio).toBe("2/70");
  });
});
