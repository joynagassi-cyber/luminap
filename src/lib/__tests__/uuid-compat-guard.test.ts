// @vitest-environment node
/**
 * Garde — UUID compatibles WebView anciennes.
 *
 * PROBLÈME VISÉ (classe R447/R448/R175)
 * ------------------------------------
 * `crypto.randomUUID()` n'existe qu'à partir de Chromium/WebView **92**. Avec
 * `minSdk` 24 (Android 7.0), un appareil dont la WebView n'est pas à jour voit
 * l'appel lever un `TypeError` — sur le chemin CRITIQUE de création
 * d'enregistrement. Le helper `@/lib/uuid` (`randomUUID`) fournit un repli
 * (`getRandomValues`, puis `Math.random`) et doit être la SEULE porte d'accès.
 *
 * Non-vacuité : réintroduire `crypto.randomUUID()` dans un écran/lib fait
 * échouer la garde.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const SRC = join(root, "src");
const HELPER = "src/lib/uuid.ts";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") return [];
      return walk(full);
    }
    return [full];
  });
}

describe("UUID — accès unique via @/lib/uuid", () => {
  it("`crypto.randomUUID` n'apparaît que dans le helper", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC).filter((f) => /\.tsx?$/.test(f))) {
      const rel = file.replace(`${root}/`, "");
      if (rel === HELPER) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/crypto\.randomUUID/.test(line)) {
            offenders.push(`${rel}:${i + 1} → ${line.trim()}`);
          }
        });
    }
    expect(
      offenders,
      "Utiliser `randomUUID()` de `@/lib/uuid` (repli WebView ancienne) :",
    ).toEqual([]);
  });
});
