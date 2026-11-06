// @vitest-environment node
/**
 * Garde — capacités natives toujours gardées (classe de bug R447/R448/R175).
 *
 * PROBLÈME VISÉ
 * -------------
 * Lumina est un client Android natif, mais une part du code a été écrite comme
 * une app WEB. Appeler un plugin Capacitor (`StatusBar`, `Haptics`, `Keyboard`,
 * `Camera`, `LocalNotifications`, `Preferences`, `SplashScreen`, `App`…) sans
 * garde `Capacitor.isNativePlatform()` produit sur le web (et dans les tests
 * unitaires) une promesse rejetée « not implemented », ou pire, un blocage si
 * l'échec n'est pas capturé. C'est la classe « capacité native non gérée ».
 *
 * CE QUE CETTE GARDE FAIT
 * -----------------------
 * Elle repère, fichier par fichier, les **appels de méthode sur un plugin
 * Capacitor importé** (ex. `StatusBar.setStyle(...)`, `Camera.getPhoto(...)`),
 * puis exige que le fichier contienne un jeton de garde
 * (`isNativePlatform`/`getPlatform`) — OU qu'il soit explicitement listé dans
 * `ANDROID_ONLY_ALLOWED` avec justification (flux qui ne s'exécute que sur
 * Android). Un nouvel appel natif non gardé fait échouer la garde.
 *
 * `@capacitor/core` est EXCLU : `Capacitor.isNativePlatform()` / `getPlatform()`
 * sont eux-mêmes les sondes de garde, pas des capacités.
 *
 * Cf. docs/PLATFORM-GOVERNANCE.md §4.3.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const toRel = (abs: string) => relative(root, abs).split(sep).join("/");

/** Couche plateforme : encapsule les appels natifs, exclue du scan. */
const PLATFORM_LAYERS = ["src/adapters/native/", "src/platform/", "src/lib/download.ts"];

/** Modules plugin Capacitor (hors `@capacitor/core`) → capacités natives. */
const CAPACITOR_PLUGIN_RE = /^@capacitor\/(?!core$)[\w-]+$/;

const GUARD = /isNativePlatform|getPlatform/;

/**
 * Fichiers dont l'appel natif n'a PAS besoin de jeton de garde local : le flux
 * qui les exécute est déjà conditionné à Android en amont.
 * - `src/updater/*` : mise à jour APK, pilotée par `checkForUpdate`
 *   (`getPlatform() === "android"`).
 * - `src/pages/SettingsNotifications.tsx` : écran de réglages atteignable
 *   seulement une fois l'app native initialisée.
 * Toute NOUVELLE entrée doit être justifiée ici.
 */
const ANDROID_ONLY_ALLOWED = new Set<string>([
  "src/updater/updaterStore.ts",
  "src/pages/SettingsNotifications.tsx",
]);

/** Noms locaux importés depuis un plugin Capacitor (gère les alias `X as Y`). */
function nativeBindings(code: string): string[] {
  const names: string[] = [];
  const importRe = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;
  for (const m of code.matchAll(importRe)) {
    if (!CAPACITOR_PLUGIN_RE.test(m[2])) continue;
    for (const part of m[1].split(",")) {
      const alias = part.includes(" as ") ? part.split(" as ")[1] : part;
      const name = alias.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Fichiers appelant une méthode de plugin natif sans garde locale. */
function unguardedNativeCalls(): string[] {
  const offenders: string[] = [];
  for (const file of walk(join(root, "src"))) {
    const rel = toRel(file);
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    if (rel.includes("__tests__") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    if (PLATFORM_LAYERS.some((layer) => rel.startsWith(layer))) continue;
    if (ANDROID_ONLY_ALLOWED.has(rel)) continue;
    const code = stripComments(readFileSync(file, "utf8"));
    const bindings = nativeBindings(code);
    if (bindings.length === 0) continue;
    const callsNative = bindings.some((name) =>
      new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\s*\\.\\s*\\w+\\s*\\(`).test(code),
    );
    if (callsNative && !GUARD.test(code)) offenders.push(rel);
  }
  return offenders;
}

describe("Capacités natives — garde (classe R447/R448/R175)", () => {
  it("aucun appel de plugin Capacitor sans garde `isNativePlatform`/`getPlatform`", () => {
    const offenders = unguardedNativeCalls();
    expect(
      offenders,
      "Appel(s) de plugin natif sans garde. Ajouter un contrôle " +
        "`Capacitor.isNativePlatform()` (ou `.catch(() => {})` avec justification " +
        "dans ANDROID_ONLY_ALLOWED si le flux est Android-only). " +
        "Cf. docs/PLATFORM-GOVERNANCE.md §4.3.",
    ).toEqual([]);
  });

  it("la garde est non-vide : au moins un fichier appelle un plugin natif", () => {
    const count = walk(join(root, "src"))
      .map(toRel)
      .filter((rel) => /\.(ts|tsx)$/.test(rel) && !rel.includes("__tests__"))
      .filter((rel) => nativeBindings(readFileSync(join(root, rel), "utf8")).length > 0)
      .length;
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
