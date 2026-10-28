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
  "listError",
];

/**
 * Hooks de `dataLayer` qui renvoient `isLoading: false` EN DUR (l'état de
 * chargement temporel a été retiré — décision D-R41). Un écran qui garde son
 * verdict vide sur un tel alias possède une branche MORTE : c'est la cause
 * systémique mesurée en R52.l/m/n/o/p. La liste est DÉRIVÉE du source de
 * `dataLayer.ts` (pas recopiée) pour rester juste si un hook change.
 */
function deadLoadingHooks(): Set<string> {
  const src = readFileSync(
    join(process.cwd(), "src", "lib", "dataLayer.ts"),
    "utf8",
  );
  const names = new Set<string>();
  for (const m of src.matchAll(/export function (use\w+)\(/g)) {
    const rest = src.slice(m.index! + m[0].length);
    const stop = rest.search(/\nexport (async )?function |\nexport const /);
    const body = rest.slice(0, stop === -1 ? 3000 : stop);
    if (/isLoading:\s*false/.test(body)) names.add(m[1]);
  }
  return names;
}

/** Signaux FORTS : ils ne peuvent pas provenir d'un `isLoading` mort. */
const STRONG_SIGNALS = [
  "isPowerSyncReadyNow",
  "replicaPending",
  "Loaded",
  "hasLoaded",
  "listError",
  "notFound",
  "ShimmerList",
  "gatingChecked",
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

    // Cas R52.l : un squelette IMPORTÉ mais jamais câblé ne doit PAS compter
    // comme preuve de disponibilité. La garde statique ne peut pas voir qu'une
    // branche est morte — d'où le test COMPORTEMENTAL `r52l-dashboard-loading`.
    // Ce qu'elle peut exiger, c'est qu'un simple import de squelette ne suffise
    // pas : ici, aucun autre signal n'est présent.
    const importedSkeletonOnly = `import { DashboardSkeleton } from "@/components/PageSkeletons";
      export default function Y() {
        return list.length === 0 ? <p>Aucun élément trouvé</p> : null;
      }`;
    expect(VERDICT_PATTERN.test(importedSkeletonOnly)).toBe(true);
    expect(READINESS_SIGNALS.some((s) => importedSkeletonOnly.includes(s))).toBe(false);
  });

  it("aucun verdict vide ne dépend d'un `isLoading` renvoyé en dur (branche morte)", () => {
    const dead = deadLoadingHooks();
    // La garde n'a de sens que si la liste est non vide.
    expect(dead.size).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".tsx")) continue;
        if (ALLOWLIST.has(file)) continue;
        const src = readFileSync(join(dir, file), "utf8");
        if (!VERDICT_PATTERN.test(src)) continue;
        if (STRONG_SIGNALS.some((k) => src.includes(k))) continue;

        const aliases: string[] = [];
        for (const m of src.matchAll(/const\s*\{([^}]*)\}\s*=\s*(use\w+)\(/gs)) {
          if (!dead.has(m[2])) continue;
          // `isLoading: x` (alias explicite) OU `isLoading` seul (destructuration
          // courte) — les deux désignent le même booléen mort.
          const alias = /isLoading\s*:\s*(\w+)/.exec(m[1]);
          if (alias) aliases.push(alias[1]);
          else if (/\bisLoading\b/.test(m[1])) aliases.push("isLoading");
        }
        if (aliases.length) offenders.push(`${relative(process.cwd(), join(dir, file))} (${aliases.join(", ")})`);
      }
    }

    expect(
      offenders,
      "Ces écrans gardent un verdict vide sur un `isLoading` MORT (D-R41) :\n" +
        offenders.map((f) => `  - ${f}`).join("\n"),
    ).toEqual([]);
  });
});
