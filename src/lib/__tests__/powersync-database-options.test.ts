/**
 * Garde comportementale — options de la base PowerSync.
 *
 * Verrouille la combinaison VALIDE des options selon l'environnement, en
 * particulier la régression `@powersync/web` 2.6.0 :
 *
 *   useWebWorker = false  ET  enableMultiTabs = true
 *
 * est INVALIDE. Avec le worker désactivé, l'adaptateur WASQLite ouvre sa
 * connexion en processus (`source = null`) ; la sync multi-onglets appelle
 * alors `db.shareConnection()`, qui lève « only available for connections
 * based by workers » → promesse rejetée qui fait échouer le boot (11 specs
 * Cypress rouges). Sous Cypress, `buildDatabaseOptions(true)` doit donc
 * désactiver AUSSI `enableMultiTabs`.
 *
 * Le test instancie le VRAI `PowerSyncDatabase` (sans le démarrer) pour
 * vérifier les options RÉSOLUES par le SDK, et non le seul objet d'entrée :
 * c'est la valeur résolue qui pilote la sélection de l'implémentation de sync.
 *
 * Non-vacuité : retirer `enableMultiTabs: false` de `buildDatabaseOptions`
 * fait échouer l'assertion « résolues » (vérifié par mutation).
 */
import { describe, it, expect } from "vitest";
import { PowerSyncDatabase } from "@powersync/capacitor";
import { Schema } from "@powersync/web";
import { buildDatabaseOptions } from "@/lib/powersync";

/** Instancie le SDK sans ouvrir la base (constructeur seulement). */
function resolved(database: Record<string, unknown>) {
  const db = new PowerSyncDatabase({
    schema: new Schema({}),
    // `database` n'est pas encore ouvert : on lit juste les options résolues.
    database: database as never,
  }) as unknown as { resolvedOpenOptions: Record<string, unknown> };
  return db.resolvedOpenOptions;
}

describe("options de la base PowerSync", () => {
  it("sous Cypress : worker ET multi-onglets désactivés (combinaison valide)", () => {
    const opts = buildDatabaseOptions(true);
    expect(opts.useWebWorker).toBe(false);
    expect((opts as { enableMultiTabs?: boolean }).enableMultiTabs).toBe(false);

    // Le SDK doit RÉELLEMENT résoudre la combinaison valide.
    const r = resolved(opts as unknown as Record<string, unknown>);
    expect(r.useWebWorker).toBe(false);
    expect(r.enableMultiTabs).toBe(false);
  });

  it("hors Cypress : worker et multi-onglets laissés aux défauts du SDK", () => {
    const opts = buildDatabaseOptions(false);
    expect(opts.useWebWorker).toBe(true);
    // On ne force pas le multi-onglets : le SDK garde son défaut.
    expect("enableMultiTabs" in opts).toBe(false);

    const r = resolved(opts as unknown as Record<string, unknown>);
    expect(r.useWebWorker).toBe(true);

    // La valeur résolue DOIT être le défaut du SDK (jamais forcée à false par
    // nous, ce qui désactiverait le multi-onglets en production).
    const baseline = new PowerSyncDatabase({
      schema: new Schema({}),
      database: { dbFilename: "baseline.db" } as never,
    }) as unknown as { resolvedOpenOptions: Record<string, unknown> };
    expect(r.enableMultiTabs).toBe(baseline.resolvedOpenOptions.enableMultiTabs);
  });

  it("la combinaison invalide (worker off + multi-onglets on) est écartée sous Cypress", () => {
    const r = resolved(
      buildDatabaseOptions(true) as unknown as Record<string, unknown>,
    );
    const invalid = r.useWebWorker === false && r.enableMultiTabs === true;
    expect(
      invalid,
      "worker désactivé + multi-onglets activé ⇒ shareConnection() lève " +
        "« only available for connections based by workers »",
    ).toBe(false);
  });
});
