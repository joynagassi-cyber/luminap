/**
 * Garde — driver de base LOCALE de PowerSync (cause racine du hors-ligne cassé).
 *
 * CONTEXTE
 * --------
 * `@powersync/web` seul s'appuie sur WA-SQLite (WASM) au-dessus d'IndexedDB /
 * OPFS DANS LA WEBVIEW ANDROID : un stockage que l'OS peut effacer à tout
 * moment. Conséquence observée sur l'APK : base locale non durable → app vide
 * au boot suivant, aucune donnée hors ligne. Le correctif consiste à importer
 * `PowerSyncDatabase` depuis `@powersync/capacitor`, qui détecte la plateforme
 * et bascule sur SQLite NATIF (`@capacitor-community/sqlite`) sur Android/iOS
 * tout en retombant sur le SDK Web sur navigateur. Les primitives de schéma
 * (`Schema`, `Table`, `column`) restent, elles, importées de `@powersync/web`.
 *
 * POURQUOI CETTE GARDE
 * --------------------
 * Le retour à `@powersync/web` pour `PowerSyncDatabase` est une régression
 * SILENCIEUSE : tout compile, les tests unitaires (jsdom) passent, mais l'APK
 * redevient non durable. Rien d'autre dans la suite ne verrouille ce choix.
 *
 * Non-vacuité : réécrire l'import en `from "@powersync/web"` fait échouer le
 * test (vérifié par mutation — voir le receipt du commit).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../..");
const INDEX = resolve(ROOT, "src/lib/powersync/index.ts");
const PKG = resolve(ROOT, "package.json");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("driver de base locale PowerSync (hors-ligne durable)", () => {
  it("importe `PowerSyncDatabase` depuis `@powersync/capacitor` (SQLite natif sur mobile)", () => {
    const src = read(INDEX);
    const m = src.match(
      /import\s*\{[^}]*\bPowerSyncDatabase\b[^}]*\}\s*from\s*["']([^"']+)["']/,
    );
    expect(m, "import de PowerSyncDatabase introuvable dans index.ts").not.toBe(
      null,
    );
    expect(
      m![1],
      "PowerSyncDatabase DOIT venir de @powersync/capacitor (SQLite natif) — " +
        "@powersync/web seul n'est PAS durable dans la WebView Android",
    ).toBe("@powersync/capacitor");
  });

  it("n'importe JAMAIS `PowerSyncDatabase` depuis `@powersync/web`", () => {
    const src = read(INDEX);
    // Les primitives de schéma peuvent (doivent) venir de @powersync/web ;
    // seule la CLASSE PowerSyncDatabase ne doit pas en venir.
    const bad = /import\s*\{[^}]*\bPowerSyncDatabase\b[^}]*\}\s*from\s*["']@powersync\/web["']/;
    expect(bad.test(src)).toBe(false);
  });

  it("déclare les dépendances natives requises et aligne Capacitor sur la 8.x", () => {
    const pkg = JSON.parse(read(PKG)) as {
      dependencies: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = pkg.dependencies;
    // `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` vivent en
    // devDependencies (convention Capacitor) — on fusionne pour l'analyse.
    const all = { ...deps, ...(pkg.devDependencies ?? {}) };

    // SDK Capacitor + driver SQLite natif + peer @powersync/web.
    expect(deps["@powersync/capacitor"], "peer du SDK Capacitor").toBeTruthy();
    expect(
      deps["@capacitor-community/sqlite"],
      "driver SQLite natif requis par @powersync/capacitor",
    ).toBeTruthy();
    expect(deps["@powersync/web"], "peer @powersync/web").toBeTruthy();

    const major = (range: string): number =>
      parseInt(String(range).replace(/^[^\d]*/, ""), 10);

    // @capacitor/core >= 8 est un peer EXIGÉ par @powersync/capacitor.
    expect(major(all["@capacitor/core"])).toBeGreaterThanOrEqual(8);

    // Tous les paquets `@capacitor/*` doivent partager la MÊME majeure :
    // un plugin 7.x à côté d'un core 8.x casse l'enregistrement natif.
    const offenders = Object.entries(all)
      .filter(([name]) => name.startsWith("@capacitor/"))
      .filter(([, range]) => major(range) < 8)
      .map(([name, range]) => `${name}@${range}`);
    expect(
      offenders,
      "paquets @capacitor/* restés en < 8.x (doivent suivre le core 8.x)",
    ).toEqual([]);

    // `capacitor-native-settings` n'est pas sous scope @capacitor/ mais est un
    // plugin natif : même exigence de majeure.
    if (all["capacitor-native-settings"]) {
      expect(major(all["capacitor-native-settings"])).toBeGreaterThanOrEqual(8);
    }
  });

  it("câble le module natif `powersync-capacitor` dans le projet Android généré", () => {
    // Fichier GÉNÉRÉ par `cap sync` — sa présence prouve que le plugin natif
    // est bien embarqué dans le build Gradle (sinon libpowersync.so absent au
    // runtime → crash « Could not register PowerSync core extension »).
    const gradle = read(resolve(ROOT, "android/app/capacitor.build.gradle"));
    expect(
      gradle.includes(":powersync-capacitor"),
      "android/app/capacitor.build.gradle doit inclure :powersync-capacitor",
    ).toBe(true);
  });
});
