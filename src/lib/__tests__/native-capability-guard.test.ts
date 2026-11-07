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
 * Elle repère, fichier par fichier, toute **référence à un module plugin
 * Capacitor** — import statique (`import { X } from "…"`), import à effet de
 * bord (`import "…"`) **ou import dynamique** (`await import("…")`) — puis exige
 * que le fichier contienne un jeton de garde (`isNativePlatform`/`getPlatform`)
 * — OU qu'il soit explicitement listé dans `ANDROID_ONLY_ALLOWED` avec
 * justification (flux qui ne s'exécute que sur Android). Un nouvel accès natif
 * non gardé fait échouer la garde.
 *
 * L'import dynamique est couvert : la version précédente ne scannait que les
 * imports statiques, donc un `await import("@capacitor/…")` non gardé passait
 * inaperçu (angle mort mesuré).
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

/**
 * Plugins natifs Capacitor, **dérivés de `package.json`** (toute dépendance dont
 * le nom contient « capacitor »), pour couvrir aussi ceux hors du scope
 * `@capacitor/*` (`capacitor-native-settings`, `@aparajita/capacitor-secure-storage`…).
 * Exclus : le cœur (`@capacitor/core`), l'outillage (`@capacitor/cli`), la
 * plateforme (`@capacitor/android`) et `@powersync/capacitor` (SDK de données,
 * pas une capacité native).
 */
const NON_CAPABILITY_PKGS = new Set([
  "@capacitor/core",
  "@capacitor/cli",
  "@capacitor/android",
  "@powersync/capacitor",
]);

function nativePluginModules(): Set<string> {
  const pkg = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return new Set(
    Object.keys(deps).filter(
      (name) => /capacitor/i.test(name) && !NON_CAPABILITY_PKGS.has(name),
    ),
  );
}

const NATIVE_PLUGINS = nativePluginModules();

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

/** Modules plugin natif Capacitor référencés (import statique, à effet de bord ou dynamique). */
function capacitorPluginRefs(code: string): string[] {
  const refs = new Set<string>();
  // import statique nommé / par défaut / namespace (pas `import type`).
  for (const m of code.matchAll(
    /import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/g,
  )) {
    refs.add(m[1]);
  }
  // import à effet de bord : `import "x"`.
  for (const m of code.matchAll(/import\s+["']([^"']+)["']/g)) {
    refs.add(m[1]);
  }
  // import dynamique : `await import("x")`.
  for (const m of code.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
    refs.add(m[1]);
  }
  return [...refs].filter((m) => NATIVE_PLUGINS.has(m));
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Fichiers référençant un plugin natif sans garde locale. */
function unguardedNativeCalls(): string[] {
  const offenders: string[] = [];
  for (const file of walk(join(root, "src"))) {
    const rel = toRel(file);
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    if (rel.includes("__tests__") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    if (PLATFORM_LAYERS.some((layer) => rel.startsWith(layer))) continue;
    if (ANDROID_ONLY_ALLOWED.has(rel)) continue;
    const code = stripComments(readFileSync(file, "utf8"));
    if (capacitorPluginRefs(code).length === 0) continue;
    if (!GUARD.test(code)) offenders.push(rel);
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

  it("la garde est non-vide : au moins un fichier référence un plugin natif", () => {
    const count = walk(join(root, "src"))
      .map(toRel)
      .filter((rel) => /\.(ts|tsx)$/.test(rel) && !rel.includes("__tests__"))
      .filter((rel) => capacitorPluginRefs(readFileSync(join(root, rel), "utf8")).length > 0)
      .length;
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it("couvre les plugins hors scope @capacitor/* (dérivés de package.json)", () => {
    expect(NATIVE_PLUGINS.has("capacitor-native-settings")).toBe(true);
    expect(NATIVE_PLUGINS.has("@aparajita/capacitor-secure-storage")).toBe(true);
    // Le cœur et l'outillage ne sont pas des capacités.
    expect(NATIVE_PLUGINS.has("@capacitor/core")).toBe(false);
    expect(NATIVE_PLUGINS.has("@capacitor/cli")).toBe(false);
  });
});
