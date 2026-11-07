// @vitest-environment node
/**
 * Garde deep-link natif — anti-injection JS (classe R447/R448/R175).
 *
 * PROBLÈME VISÉ
 * -------------
 * `MainActivity.handleIntent()` injectait l'URL de callback OAuth dans la
 * WebView via `evaluateJavascript("window.handleOAuthCallback('<code>', …)")` :
 *   1. la fonction JS `window.handleOAuthCallback` n'existe NULLE PART → code
 *      MORT (le deep link n'était de toute façon jamais traité par ce chemin) ;
 *   2. `code`/`state` (issus d'un intent-filter `exported="true"` `lumina://`,
 *      donc contrôlables par une app tierce) étaient interpolés SANS échappement
 *      → injection de JavaScript dans la WebView de l'app.
 *
 * Le deep link est en réalité déjà traité par le plugin App de Capacitor
 * (`appUrlOpen` / `getLaunchUrl`), relayé côté web par `useAppUrlOpen`. La
 * ré-injection native était donc inutile, en plus d'être dangereuse.
 *
 * CE QUE CETTE GARDE FIGE
 * -----------------------
 *  - AUCUN `evaluateJavascript` dans le code natif (`android/app/src/main/java`) ;
 *  - `MainActivity` ne ré-importe pas `android.net.Uri` ni ne réintroduit de
 *    parsing d'intent manuel ;
 *  - le deep link reste géré côté JS (`appUrlOpen` + `getLaunchUrl`).
 *
 * Non-vacuité : réintroduire un `evaluateJavascript(...)` (même échappé) dans
 * `MainActivity` fait échouer la garde.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const JAVA_DIR = join(root, "android/app/src/main/java");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const mainActivityPath = "android/app/src/main/java/com/lumina/mfejc/MainActivity.java";

describe("Deep-link natif — pas d'injection JS depuis le code natif", () => {
  it("aucun fichier natif n'appelle evaluateJavascript / loadUrl", () => {
    const offenders = walk(JAVA_DIR)
      .filter((f) => f.endsWith(".java"))
      .filter((f) => {
        const code = readFileSync(f, "utf8");
        return /evaluateJavascript|\.loadUrl\s*\(/.test(code);
      })
      .map((f) => relative(root, f).split(sep).join("/"));
    expect(
      offenders,
      "Le deep link est géré par le plugin App (appUrlOpen). Ne pas réinjecter " +
        "d'URL dans la WebView depuis le natif (injection JS).",
    ).toEqual([]);
  });

  it("MainActivity ne parse plus l'intent ni n'importe android.net.Uri", () => {
    const java = read(mainActivityPath);
    expect(java).not.toContain("android.net.Uri");
    expect(java).not.toContain("handleIntent");
    // `onNewIntent` reste défini (délégué au super, qui notifie les plugins).
    expect(java).toContain("super.onNewIntent(intent)");
  });

  it("le deep link reste traité côté JS (appUrlOpen + getLaunchUrl)", () => {
    const hook = read("src/hooks/useAppUrlOpen.ts");
    expect(hook).toContain('addListener("appUrlOpen"');
    expect(hook).toContain("getLaunchUrl");
    expect(hook).toContain("Capacitor.isNativePlatform()");
  });

  it("la garde est non-vide : le code natif est bien scanné", () => {
    const count = walk(JAVA_DIR).filter((f) => f.endsWith(".java")).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
