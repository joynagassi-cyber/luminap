// @vitest-environment node
/**
 * Garde anti-récurrence R52 — « introuvable » / « vide » avant lecture.
 *
 * La famille R52 a produit **neuf** rechutes (R52.b à R52.i) : à chaque fois un
 * écran dérivait un verdict (« introuvable », « aucun … ») de données encore
 * non lues, donc affichait un fait faux pendant le chargement.
 *
 * Cette garde verrouille la règle au niveau statique : toute page qui affiche
 * un message « introuvable » doit prouver qu'elle sait distinguer « pas encore
 * lu » de « réellement absent » — soit par `isPowerSyncReadyNow()`, soit par un
 * drapeau de chargement explicite (`loading`, `notFound`, `isLoading`, …).
 *
 * Sans garde, un nouveau cas R52.x passerait inaperçu jusqu'en production.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PAGES_DIR = join(process.cwd(), "src", "pages");

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
  "if (loading)",
  "loading)",
  "Loaded",
  "Skeleton",
];

describe("R52 — garde statique : « introuvable » exige un signal de disponibilité", () => {
  it("aucune page n'annonce « introuvable » sans distinguer « pas encore lu »", () => {
    const offenders: string[] = [];

    for (const file of readdirSync(PAGES_DIR)) {
      if (!file.endsWith(".tsx")) continue;
      if (ALLOWLIST.has(file)) continue;

      const src = readFileSync(join(PAGES_DIR, file), "utf8");
      if (!/introuvable/i.test(src)) continue;

      const hasSignal = READINESS_SIGNALS.some((s) => src.includes(s));
      if (!hasSignal) offenders.push(file);
    }

    expect(
      offenders,
      `Ces pages annoncent « introuvable » sans prouver qu'elles ont lu la donnée :\n` +
        offenders.map((f) => `  - src/pages/${f}`).join("\n"),
    ).toEqual([]);
  });

  it("la garde détecte réellement une page fautive (non-vacuité)", () => {
    // Un contenu synthétique qui reproduit le motif fautif…
    const faulty = `export default function X() {
      if (!thing) return <p>Élément introuvable</p>;
      return null;
    }`;
    // …ne doit produire AUCUN signal de disponibilité : c'est ce que la garde
    // ci-dessus sanctionne. Si cette assertion tombait, la garde serait vide.
    expect(READINESS_SIGNALS.some((s) => faulty.includes(s))).toBe(false);
    expect(/introuvable/i.test(faulty)).toBe(true);
  });
});
