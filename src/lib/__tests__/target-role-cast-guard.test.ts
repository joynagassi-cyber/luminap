// @vitest-environment node
/**
 * Garde anti-masquage R74 — `as any` sur `targetRole`.
 *
 * R74 : `NotificationSendData.targetRole` est typé `Role`. Un
 * `targetRole: "TREASURIER" as any` **masque** une erreur de type inexistante
 * (la valeur est déjà valide) : le `as any` ne sert qu'à faire taire le
 * compilateur, et empêche de détecter une **vraie** valeur hors modèle.
 *
 * La garde distingue les deux cas :
 *   - valeur **dans** `Role` + `as any` → inutile → INTERDIT (cette garde) ;
 *   - valeur **hors** `Role` (ex. `"ADMIN"`) → écart de modèle réel, à tracer
 *     dans RISQUES.md (R109/D-S10-3), pas à blanchir par `as any` silencieux.
 *
 * Le `Role` est **dérivé du source** (`src/types/index.ts`), pas recopié, pour
 * rester juste si le modèle évolue.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__") continue;
      walk(p, out);
    } else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

/** Extrait les membres littéraux de l'union `type Role = "A" | "B" | ...`. */
function roleMembers(): Set<string> {
  const src = readFileSync(join(process.cwd(), "src", "types", "index.ts"), "utf8");
  const m = src.match(/export type Role =([\s\S]*?);/);
  const set = new Set<string>();
  if (!m) return set;
  for (const v of m[1].matchAll(/"([A-Z_]+)"/g)) set.add(v[1]);
  return set;
}

describe("R74 — garde : pas de `as any` inutile sur targetRole", () => {
  it("aucun targetRole avec une valeur déjà valide du type Role n'est casté `as any`", () => {
    const roles = roleMembers();
    expect(roles.size, "type Role introuvable dans src/types/index.ts").toBeGreaterThan(10);

    const offenders: string[] = [];
    let scanned = 0;
    for (const file of walk(join(process.cwd(), "src"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/targetRole:\s*"([A-Z_]+)"\s*as\s+any/g)) {
        scanned++;
        if (roles.has(m[1])) {
          const line = src.slice(0, m.index!).split("\n").length;
          offenders.push(`${relative(process.cwd(), file)}:${line} ("${m[1]}")`);
        }
      }
    }
    expect(scanned, "aucun targetRole casté trouvé — extraction cassée ?").toBeGreaterThan(0);
    expect(
      offenders,
      `Ces targetRole sont castés \`as any\` alors que la valeur est déjà un Role valide (cast inutile qui masque d'éventuelles erreurs) :\n` +
        offenders.map((o) => `  - ${o}`).join("\n"),
    ).toEqual([]);
  });
});
