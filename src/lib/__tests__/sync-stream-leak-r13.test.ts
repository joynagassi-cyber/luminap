// @vitest-environment node
/**
 * Garde anti-régression — R13 (fuites d'abonnements PowerSync « leaked »).
 *
 * DÉFAUT : `db.syncStream(name).subscribe()` renvoie un `SyncStreamSubscription`
 * que PowerSync enregistre dans un `FinalizationRegistry`. Si le handle est
 * collecté par le GC SANS `unsubscribe()`, PowerSync logue « A subscription to
 * <stream> with params … leaked! » — bruit permanent sur une session longue.
 *
 * Ces streams sont GLOBAUX (ouverts au boot, jamais fermés) : la doc SDK impose
 * de conserver leur référence dans un champ de module (un `unsubscribe()` n'est
 * pas approprié). La garde vérifie que `subscribeOrgStreams` ne jette PAS le
 * handle (pas d'appel « nu » à `.subscribe()`).
 *
 * Non-vacuité : revenir à `await _db.syncStream(name).subscribe();` (handle
 * jeté) fait échouer la 2e assertion.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(
  resolve(process.cwd(), "src/lib/powersync/index.ts"),
  "utf8",
);

/** Corps de la fonction `subscribeOrgStreams`. */
function subscribeOrgStreamsBody(): string {
  const start = SRC.indexOf("async function subscribeOrgStreams");
  expect(start, "subscribeOrgStreams introuvable").toBeGreaterThan(-1);
  const end = SRC.indexOf("\n}", start);
  return SRC.slice(start, end);
}

describe("R13 — abonnements aux sync streams (pas de handle jeté)", () => {
  it("conserve les handles d'abonnement dans un champ de module", () => {
    expect(SRC).toMatch(/const _orgStreamSubscriptions[^=]*=\s*\[\]/);
    expect(subscribeOrgStreamsBody()).toMatch(/_orgStreamSubscriptions\.push\(/);
  });

  it("n'appelle jamais `.syncStream(...).subscribe()` sans capter le handle", () => {
    // Appel « nu » : le résultat de subscribe() n'est ni stocké ni poussé.
    expect(SRC).not.toMatch(/await\s+_db\.syncStream\([^)]*\)\.subscribe\(\)\s*;/);
  });
});
