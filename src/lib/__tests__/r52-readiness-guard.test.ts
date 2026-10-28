// @vitest-environment node
/**
 * Garde anti-récurrence R52 — « introuvable » / « vide » avant lecture.
 *
 * La famille R52 a produit **neuf** rechutes (R52.b à R52.i) : à chaque fois un
 * écran dérivait un verdict (« introuvable », « aucun … ») de données encore
 * non lues, donc affichait un fait faux pendant le chargement.
 *
 * Cette garde verrouille la règle au niveau statique : toute page qui affiche
 * un message « introuvable » / « aucun(e) … » doit prouver qu'elle sait
 * distinguer « pas encore lu » de « réellement absent » — soit par
 * `isPowerSyncReadyNow()`, soit par un drapeau de chargement explicite
 * (`loading`, `notFound`, `isLoading`, `Loaded`, un squelette).
 *
 * Sans garde, un nouveau cas R52.x passerait inaperçu jusqu'en production.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SCAN_DIRS = [
  join(process.cwd(), "src", "pages"),
  // Les composants partagés sont un lieu de rechute réel (R52 : un verdict vide
  // dérivé d'une lecture asynchrone dans un composant se propage partout).
  join(process.cwd(), "src", "components"),
];

/** Pages légitimement exemptées (le message ne dépend d'aucune lecture). */
const ALLOWLIST = new Set([
  "NotFound.tsx", // la route 404 elle-même : le verdict est la raison d'être
  "Tutorial.tsx", // contenu pédagogique : la chaîne est une explication
]);

/** Signaux prouvant que l'écran distingue « pas encore lu » de « absent ». */
const READINESS_SIGNALS = [
  "isPowerSyncReadyNow",
  "notFound",
  "isLoading",
  "loading",
  "Loading",
  "ShimmerList",
  "Loaded",
  "Skeleton",
  "listError",
];

/**
 * Motifs de verdict dérivés d'une lecture (R52 : « pas encore lu » ≠ « absent »).
 * On ne cible que les messages d'état vides réels (« … trouvé(e) », « pour le
 * moment », « pour l'instant », « Pas encore de … ») ou le mot « introuvable » —
 * pour ne pas confondre avec les libellés de formulaire (« Aucun événement »,
 * « Aucune (racine) ») ni les boutons.
 */
const VERDICT_PATTERN =
  /introuvable|Aucun(e)? [^"'<>{}]*?(trouvé|trouvée|trouvés|trouvées|pour le moment|pour l'instant)|Pas encore de /i;

describe("R52 — garde statique : verdict vide/introuvable exige un signal de disponibilité", () => {
  it("aucun fichier n'annonce un verdict vide sans distinguer « pas encore lu »", () => {
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".tsx")) continue;
        if (ALLOWLIST.has(file)) continue;

        const src = readFileSync(join(dir, file), "utf8");
        if (!VERDICT_PATTERN.test(src)) continue;

        const hasSignal = READINESS_SIGNALS.some((s) => src.includes(s));
        if (!hasSignal) offenders.push(relative(process.cwd(), join(dir, file)));
      }
    }

    expect(
      offenders,
      `Ces pages annoncent « introuvable » sans prouver qu'elles ont lu la donnée :\n` +
        offenders.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
  });

  it("la garde détecte réellement une page fautive (non-vacuité)", () => {
    // Un contenu synthétique qui reproduit le motif fautif…
    const faulty = `export default function X() {
      if (!thing) return <p>Élément introuvable</p>;
      if (list.length === 0) return <p>Aucun élément trouvé</p>;
      return null;
    }`;
    // …ne doit produire AUCUN signal de disponibilité : c'est ce que la garde
    // ci-dessus sanctionne. Si cette assertion tombait, la garde serait vide.
    expect(READINESS_SIGNALS.some((s) => faulty.includes(s))).toBe(false);
    expect(VERDICT_PATTERN.test(faulty)).toBe(true);
  });
});
