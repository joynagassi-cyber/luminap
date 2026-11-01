// @vitest-environment node
/**
 * Garde anti-interpolation — les messages d'erreur remontés à GitHub DOIVENT
 * être STABLES.
 *
 * Origine (audit 2026-11-01) : la signature de déduplication de
 * `errorReporter.ts` est calculée sur `type + message + 1ʳᵉ trame`. Un message
 * contenant une valeur VARIABLE (durée, identifiant, montant…) produit donc une
 * signature DIFFÉRENTE à chaque occurrence → la déduplication (client ET
 * serveur) ne joue JAMAIS → une Issue par occurrence.
 *
 * Mesuré : `new Error(\`Tâche longue détectée (${ms} ms)\`)` a créé ~89 Issues
 * identiques sur le dépôt PUBLIC, déclenchant autant de tentatives de correction
 * autonome OpenHands pour du bruit.
 *
 * RÈGLE : le message d'un `reportError` / `captureClientError` doit être un
 * LITTÉRAL (ou une constante). Les valeurs variables vont dans `context`.
 *
 * Ce test lit les sources (pas d'exécution) : il échoue si un appel passe un
 * template literal (`` `…${…}` ``) comme message.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Appels dont le PREMIER argument est le message : `reportError(msg, opts)`. */
const MESSAGE_CALLS = ["reportError", "captureClientError"] as const;

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

/**
 * Détecte un template literal (ou une concaténation de chaîne) en TÊTE du
 * premier argument d'un appel — c'est-à-dire le message lui-même.
 */
function findViolations(source: string, file: string): Violation[] {
  const violations: Violation[] = [];
  const lines = source.split("\n");

  for (const fn of MESSAGE_CALLS) {
    const re = new RegExp(`\\b${fn}\\s*\\(`, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      // Texte après la parenthèse ouvrante de l'appel.
      const after = source.slice(match.index + match[0].length);
      // Cas 1 : message = template literal `` `…` ``.
      // Cas 2 : message = `new Error(` + template literal.
      const leading = after.match(/^\s*(?:new\s+Error\s*\(\s*)?(`)/);
      if (!leading) continue;
      const line = source.slice(0, match.index).split("\n").length;
      violations.push({
        file,
        line,
        snippet: (lines[line - 1] ?? "").trim().slice(0, 120),
      });
    }
  }
  return violations;
}

describe("garde anti-interpolation — messages d'erreur stables", () => {
  const files = walk(SRC);

  it("la source est bien scannée (garde non vacuité)", () => {
    // Sans ce minimum, un changement de layout (ex. src/ renommé) rendrait le
    // test vert alors qu'il ne scanne plus rien.
    expect(files.length).toBeGreaterThan(100);
    const withCalls = files.filter((f) => {
      const s = readFileSync(f, "utf8");
      return MESSAGE_CALLS.some((fn) => s.includes(`${fn}(`));
    });
    expect(
      withCalls.length,
      "aucun appel reportError/captureClientError trouvé — le scan est cassé",
    ).toBeGreaterThan(10);
  });

  it("aucun message d'erreur remonté n'est un template literal interpolé", () => {
    const violations: Violation[] = [];
    for (const file of files) {
      violations.push(...findViolations(readFileSync(file, "utf8"), file));
    }
    const report = violations
      .map((v) => `  ${relative(process.cwd(), v.file)}:${v.line} → ${v.snippet}`)
      .join("\n");
    expect(
      violations,
      "Un message remonté à GitHub contient une valeur variable → signature " +
        "de dédup instable → une Issue par occurrence. Utiliser un message " +
        "CONSTANT et déplacer la valeur dans `context` :\n" +
        report,
    ).toEqual([]);
  });

  it("le détecteur reconnaît le motif interdit (auto-test)", () => {
    // Non-vacuité du détecteur lui-même : le motif mesuré DOIT être signalé.
    const bad = 'reportError(new Error(`Tâche longue (${ms} ms)`), { type: "performance" });';
    expect(findViolations(bad, "fixture.ts")).toHaveLength(1);
    const bad2 = "captureClientError(`échec ${id}`);";
    expect(findViolations(bad2, "fixture.ts")).toHaveLength(1);
    // Formes légitimes : littéral simple, constante, identifiant.
    expect(findViolations('reportError(new Error("littéral stable"));', "f.ts")).toHaveLength(0);
    expect(findViolations("reportError(err, { type: \"crash\" });", "f.ts")).toHaveLength(0);
    expect(findViolations("captureClientError(err, { route });", "f.ts")).toHaveLength(0);
  });
});
