// @vitest-environment node
/**
 * Garde des ADR — « chaque ADR a son guard » (docs/PLATFORM-GOVERNANCE.md §4.2).
 *
 * Un ADR qui édicte une règle opposable DOIT citer le test de scan qui la fait
 * échouer si elle est violée. Sans garde, un ADR n'est qu'un vœu. Cette garde
 * vérifie que :
 *   1. l'index `docs/adr/README.md` liste chaque fichier ADR présent ;
 *   2. chaque ADR déclare une ligne `**Garde** : \`<chemin>\`` ;
 *   3. le fichier de garde cité existe réellement.
 *
 * Non-vacuité : un ADR dont la Garde pointe vers un test inexistant échoue.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const adrDir = join(root, "docs/adr");

const adrFiles = readdirSync(adrDir)
  .filter((f) => /^\d{4}-.*\.md$/.test(f))
  .sort();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("ADR — chaque décision est adossée à une garde exécutable", () => {
  it("au moins un ADR existe", () => {
    expect(adrFiles.length).toBeGreaterThan(0);
  });

  it("l'index README liste chaque ADR présent", () => {
    const index = read("docs/adr/README.md");
    const manquants = adrFiles.filter((f) => !index.includes(f));
    expect(manquants, `ADR absent(s) de docs/adr/README.md : ${manquants}`).toEqual(
      [],
    );
  });

  it("chaque ADR cite une garde existante", () => {
    const problems: string[] = [];
    for (const f of adrFiles) {
      const content = read(`docs/adr/${f}`);
      const m = content.match(/\*\*Garde\*\*\s*:\s*`([^`]+)`/);
      if (!m) {
        problems.push(`${f} : aucune ligne « **Garde** : \`<chemin>\` »`);
        continue;
      }
      const garde = m[1].trim();
      if (!existsSync(join(root, garde))) {
        problems.push(`${f} : garde introuvable → ${garde}`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
