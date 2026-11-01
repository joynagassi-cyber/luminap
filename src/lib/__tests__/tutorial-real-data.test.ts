/**
 * Garde « données réelles du tutoriel » (Addendum 2, volet A).
 *
 * Le tutoriel in-app et le guide PDF ne doivent JAMAIS exposer de données de
 * test/démonstration. La référence de contenu est `docs/tutoriel/donnees-reelles.yaml`
 * (église « MF », sigle « MF », type « Église »).
 *
 * Ce test vérifie :
 *  1. le fichier de référence existe, est un YAML valide, et porte l'identité
 *     exacte exigée (nom / sigle / type) ;
 *  2. aucun motif interdit (E2E, demo, default-org, jean@example.com, E2E Org,
 *     MFE-JC) n'apparaît dans le fichier de référence ;
 *  3. aucun motif interdit n'apparaît dans le contenu pédagogique du tutoriel
 *     (`tutorialContent.ts`), les pages `Tutorial.tsx` / `Help.tsx`, ni dans le
 *     texte du guide PDF (`screens_manifest.py`, champs visibles : title,
 *     purpose, steps, annotations, feature) ;
 *  4. le générateur PDF (`build.py`) n'imprime PAS le chemin technique des
 *     écrans (qui contient des identifiants de jeu de données).
 *
 * Non-vacuité : réintroduire « Église MFE-JC » dans Tutorial.tsx, ou remettre
 * `c.drawString(..., r["path"])` dans build.py, fait échouer le test.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

// Motifs bannis dans tout document utilisateur (PDF, tutoriel, référence).
// « \bE2E\b » cible le jeton E2E sans toucher des mots comme « E2Etest ».
const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: "E2E", re: /\bE2E\b/i },
  { name: "demo", re: /\bdemo\b/i },
  { name: "démo", re: /d[ée]mo/i },
  { name: "default-org", re: /default-org/i },
  { name: "jean@example.com", re: /jean@example\.com/i },
  { name: "E2E Org", re: /E2E\s*Org/i },
  { name: "MFE-JC", re: /MFE-JC/i },
];

function findForbidden(text: string): string[] {
  return FORBIDDEN.filter((f) => f.re.test(text)).map((f) => f.name);
}

describe("données réelles du tutoriel — référence", () => {
  const REL = "docs/tutoriel/donnees-reelles.yaml";

  it("le fichier de référence existe", () => {
    expect(existsSync(resolve(ROOT, REL)), `${REL} introuvable`).toBe(true);
  });

  it("porte l'identité exacte de l'organisation (nom / sigle / type)", () => {
    const doc = parseYaml(read(REL)) as {
      organisation: { nom: string; sigle: string; type: string };
    };
    expect(doc.organisation.nom).toBe("Église MF");
    expect(doc.organisation.sigle).toBe("MF");
    expect(doc.organisation.type).toBe("Église");
  });

  it("ne contient aucun motif interdit (valeurs, hors commentaires)", () => {
    // On n'examine que les VALEURS (le fichier documente les motifs interdits
    // dans ses commentaires, qui ne sont pas des données).
    const hits = findForbidden(JSON.stringify(parseYaml(read(REL))));
    expect(hits, `motifs interdits : ${hits.join(", ")}`).toEqual([]);
  });
});

describe("données réelles du tutoriel — contenu in-app", () => {
  const FILES = [
    "src/lib/tutorialContent.ts",
    "src/pages/Tutorial.tsx",
    "src/pages/Help.tsx",
  ];

  it("aucun motif interdit dans le contenu du tutoriel / centre d'aide", () => {
    for (const rel of FILES) {
      const hits = findForbidden(read(rel));
      expect(hits, `${rel} → ${hits.join(", ")}`).toEqual([]);
    }
  });
});

describe("données réelles du tutoriel — texte du guide PDF", () => {
  it("aucun motif interdit dans les champs visibles du manifeste", () => {
    const src = read("scripts/visual-docs/screens_manifest.py");
    // Champs réellement imprimés dans le PDF (build.py) : titre, fonctionnalité,
    // objectif, étapes et libellés d'annotation. Le `path` technique n'est pas
    // imprimé (voir test suivant) et n'est donc pas examiné ici.
    const visible: string[] = [];
    for (const m of src.matchAll(
      /(title|feature|purpose)\s*=\s*"((?:[^"\\]|\\.)*)"/g,
    )) {
      visible.push(m[2]);
    }
    for (const m of src.matchAll(/steps\s*=\s*\[([^\]]*)\]/g)) {
      visible.push(m[1]);
    }
    for (const m of src.matchAll(/label\s*=\s*"((?:[^"\\]|\\.)*)"/g)) {
      visible.push(m[1]);
    }
    const hits = findForbidden(visible.join("\n"));
    expect(hits, `motifs interdits dans le PDF : ${hits.join(", ")}`).toEqual([]);
  });

  it("build.py n'imprime pas le chemin technique des écrans", () => {
    const build = read("scripts/visual-docs/build.py");
    expect(
      /drawString\([^)]*r\["path"\]/.test(build),
      "le chemin technique (r[\"path\"]) est réimprimé dans le PDF",
    ).toBe(false);
  });
});
