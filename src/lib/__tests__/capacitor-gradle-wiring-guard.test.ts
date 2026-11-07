// @vitest-environment node
/**
 * Garde — câblage Gradle des plugins Capacitor.
 *
 * PROBLÈME VISÉ
 * -------------
 * `android/capacitor.settings.gradle` et `android/app/capacitor.build.gradle`
 * sont **versionnés** mais **générés** par `npx cap sync android`. Ajouter un
 * plugin à `package.json` SANS relancer `cap sync` laisse le gradle muet : le
 * plugin JS est importé mais son module natif n'est pas compilé dans l'APK →
 * « capacités natives non gérées » (classe R447/R448/R175). Constaté en vrai :
 * `@aparajita/capacitor-secure-storage` (déjà en `dependencies`) n'était PAS
 * câblé dans le gradle versionné (corrigé par PR #460).
 *
 * Non-vacuité : retirer une ligne `include`/`implementation` d'un plugin
 * déclaré en dépendance fait échouer la garde correspondante.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

/** Nom du projet Gradle généré par `cap sync` pour un paquet npm. */
function gradleProjectName(pkg: string): string {
  if (pkg === "@capacitor/core") return "capacitor-android";
  return pkg.replace(/^@/, "").replace(/\//g, "-");
}

const pkg = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
};
const capacitorDeps = Object.keys(pkg.dependencies ?? {}).filter((name) =>
  /capacitor/i.test(name),
);

const settingsGradle = read("android/capacitor.settings.gradle");
const buildGradle = read("android/app/capacitor.build.gradle");

describe("câblage Gradle des plugins Capacitor (package.json ↔ cap sync)", () => {
  it("au moins un plugin Capacitor est déclaré (sanity)", () => {
    expect(capacitorDeps.length).toBeGreaterThan(0);
  });

  it("chaque dépendance Capacitor est incluse dans capacitor.settings.gradle", () => {
    const manquants = capacitorDeps
      .map((dep) => ({ dep, proj: gradleProjectName(dep) }))
      .filter(({ proj }) => !settingsGradle.includes(`include ':${proj}'`))
      .map(({ dep, proj }) => `${dep} → :${proj}`);
    expect(
      manquants,
      "Dépendance(s) Capacitor non câblée(s) dans capacitor.settings.gradle. " +
        "Relancer `npx cap sync android` (fichiers versionnés, générés) :",
    ).toEqual([]);
  });

  it("chaque dépendance Capacitor est déclarée dans capacitor.build.gradle", () => {
    const manquants = capacitorDeps
      .map((dep) => ({ dep, proj: gradleProjectName(dep) }))
      .filter(({ proj }) => !buildGradle.includes(`project(':${proj}')`))
      .map(({ dep, proj }) => `${dep} → :${proj}`);
    expect(
      manquants,
      "Dépendance(s) Capacitor absente(s) des `implementation` de " +
        "capacitor.build.gradle. Relancer `npx cap sync android` :",
    ).toEqual([]);
  });

  it("aucune inclusion gradle orpheline (plugin retiré mais gradle obsolète)", () => {
    const connus = new Set(capacitorDeps.map(gradleProjectName));
    connus.add("capacitor-android"); // plateforme, toujours présente
    const includes = [...settingsGradle.matchAll(/include ':([^']+)'/g)].map(
      (m) => m[1],
    );
    const orphelins = includes.filter(
      (name) => name.startsWith("capacitor") && !connus.has(name),
    );
    expect(
      orphelins,
      "Inclusion(s) gradle sans dépendance npm correspondante (gradle obsolète, " +
        "relancer `npx cap sync android`) :",
    ).toEqual([]);
  });
});
