// @vitest-environment node
/**
 * Garde anti-récurrence R32/R33 — événements Ionic des champs de saisie.
 *
 * R32 (CORRIGÉ) : `onIonChange` ne se déclenche qu'au **blur**. Un bouton
 * désactivé ne provoque pas de blur → l'état React restait vide → l'utilisateur
 * ne pouvait pas valider (34 fichiers, 87 `IonInput`). Correctif : `onIonInput`
 * pour `IonInput`/`IonTextarea`.
 *
 * R33 (OUVERT, faible) : Ionic n'expose **pas** d'événement `ionInput` pour
 * `IonSelect`/`IonCheckbox`. Y mettre `onIonInput` produirait un gestionnaire
 * **jamais appelé** (la sélection ne mettrait jamais à jour l'état) — le même
 * blocage qu'R32, mais inversé.
 *
 * Cette garde verrouille les deux règles au niveau statique :
 *   1. `IonSelect`/`IonCheckbox` ne doivent JAMAIS porter `onIonInput` ;
 *   2. `IonInput`/`IonTextarea` ne doivent PAS revenir à `onIonChange` (R32).
 *
 * Mesure à l'ajout (2026-10-29) : 58 balises `IonSelect`/`IonCheckbox` et
 * 100 balises `IonInput`/`IonTextarea`, **0** violation sur les deux règles.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/** Extrait la balise ouvrante `tag` à partir de `<` (gère `>` dans `{}`). */
function tagText(src: string, start: number): string | null {
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    const c = src[j];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return src.slice(start, j + 1);
  }
  return null;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__") continue;
      walk(p, out);
    } else if (e.name.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

/** Balises dont l'événement Ionic n'existe pas (`ionInput`) — R33. */
const NO_IONINPUT = /<(IonSelect|IonCheckbox)\b/g;
/** Balises dont `onIonChange` (blur-only) est le défaut R32. */
const NO_IONCHANGE = /<(IonInput|IonTextarea)\b/g;

function collect(re: RegExp, forbidden: string) {
  const hits: string[] = [];
  let scanned = 0;
  for (const file of walk(join(process.cwd(), "src"))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) {
      const tag = tagText(src, m.index!);
      if (!tag) continue;
      scanned++;
      if (tag.includes(forbidden)) {
        const line = src.slice(0, m.index!).split("\n").length;
        hits.push(`${relative(process.cwd(), file)}:${line}`);
      }
    }
  }
  return { hits, scanned };
}

describe("R32/R33 — garde statique : événements Ionic des champs de saisie", () => {
  it("aucun IonSelect/IonCheckbox n'utilise onIonInput (événement jamais émis — R33)", () => {
    const { hits, scanned } = collect(NO_IONINPUT, "onIonInput");
    // Non-vacuité : si l'extraction casse, le test doit ÉCHOUER, pas passer.
    expect(scanned, "aucune balise IonSelect/IonCheckbox trouvée — extraction cassée ?").toBeGreaterThan(20);
    expect(
      hits,
      `Ces IonSelect/IonCheckbox portent onIonInput, qui n'est JAMAIS émis :\n` +
        hits.map((h) => `  - ${h}`).join("\n"),
    ).toEqual([]);
  });

  it("aucun IonInput/IonTextarea n'utilise onIonChange (blur-only — régression R32)", () => {
    const { hits, scanned } = collect(NO_IONCHANGE, "onIonChange");
    expect(scanned, "aucune balise IonInput/IonTextarea trouvée — extraction cassée ?").toBeGreaterThan(50);
    expect(
      hits,
      `Ces IonInput/IonTextarea portent onIonChange (blur-only) — régression R32 :\n` +
        hits.map((h) => `  - ${h}`).join("\n"),
    ).toEqual([]);
  });
});
