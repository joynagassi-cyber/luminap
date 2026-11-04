// @vitest-environment node
/**
 * A1 — Matrice de permissions Android et durcissement Capacitor.
 *
 * Verrouille la porte de sortie de la phase A1 de l'audit
 * `docs/lumina-ionic-capacitor-permissions.md` (« liste de permissions
 * conforme à la matrice §1.2 ») :
 *
 *  - l'ensemble EXACT des permissions déclarées : toute permission
 *    ajoutée (ou retirée) sans passer par la matrice fait échouer ce
 *    test — y compris `USE_FULL_SCREEN_INTENT` (P-03, retirée),
 *    `READ/WRITE_EXTERNAL_STORAGE` (interdites par l'audit) et
 *    `CAMERA` (le plugin caméra n'en exige pas) ;
 *  - `allowBackup="false"` (C-07a, P0) : base SQLite financière,
 *    jetons de session et localStorage hors sauvegarde Google/adb ;
 *  - aucun bloc de config pour un plugin non installé (C-01) et des
 *    défauts TOUJOURS durcis dans `capacitor.config.ts` — la variante
 *    diagnostic (C-05) ne s'active que sous `LUMINA_DIAGNOSTIC=true`
 *    au `cap sync`, jamais par défaut ;
 *  - la double barrière SHA-256 de l'auto-mise à jour APK (§1.5) :
 *    refus JS dans `checkForUpdate`, rejet natif dans le plugin Java.
 *
 * Non-vacuité : réintroduire une permission, repasser allowBackup à
 * true ou réécrire les défauts en dur (« loggingBehavior: 'debug' »)
 * fait échouer la garde correspondante.
 *
 * A2 (même fichier) — verrouille la porte unique des permissions
 * (§1.4) et le transport push réel : réintroduire un appel
 * `requestPermissions(` dans une page/un composant, résusciter le
 * faux proxy `OneSignalPush` ou désenregistrer le pont/le plugin de
 * réglages fait échouer la garde A2 correspondante.
 *
 * A3 (même fichier) — verrouille les plugins essentiels et le contrat
 * insets/clavier : configurer un plugin désinstallé, retirer le
 * rembourrage natif bas (MainActivity) ou réintroduire un
 * env(safe-area-inset-bottom) en dur dans BottomNav fait échouer la
 * garde A3 correspondante.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const manifest = read("android/app/src/main/AndroidManifest.xml");
const capConfig = read("capacitor.config.ts");

describe("A1 — manifeste Android conforme à la matrice §1.2", () => {
  it("déclare exactement les permissions justifiées, ni plus ni moins", () => {
    const found = new Set(
      [...manifest.matchAll(/<uses-permission\s+android:name="android\.permission\.([A-Z_]+)"/g)].map(
        (m) => m[1],
      ),
    );
    expect([...found].sort()).toEqual(
      [
        "ACCESS_NETWORK_STATE", // état réseau (plugin network)
        "INTERNET", // accès réseau
        "POST_NOTIFICATIONS", // notifications (Android 13+)
        "RECEIVE_BOOT_COMPLETED", // replanifier les rappels après redémarrage
        "REQUEST_INSTALL_PACKAGES", // auto-mise à jour — canal APK direct (§1.5)
        "VIBRATE", // notifications (plugin local-notifications)
      ].sort(),
    );
  });

  it("interdit la sauvegarde Android des données de l'app (C-07a)", () => {
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toContain('android:allowBackup="true"');
  });
});

describe("A1 — capacitor.config.ts : aucune config fantôme, défauts durcis", () => {
  it("ne configure que des plugins installés — ensemble exact (C-01, liste blanche A3)", () => {
    const block = capConfig.match(/plugins:\s*\{([\s\S]*?)\n {2}\},/);
    if (!block) {
      throw new Error("bloc plugins introuvable dans capacitor.config.ts");
    }
    const keys = [...block[1].matchAll(/^\s+([A-Z][A-Za-z]*):\s*\{/gm)].map(
      (m) => m[1],
    );
    expect(keys.sort()).toEqual(["Keyboard", "SplashScreen"]);

    // Chaque clé configurée correspond à un paquet réellement installé :
    // une config pour un plugin absent serait ignorée en silence (C-01).
    const pkg = read("package.json");
    expect(pkg).toContain('"@capacitor/keyboard"');
    expect(pkg).toContain('"@capacitor/splash-screen"');
  });

  it("logs et debug WebView restent coupés hors variante diagnostic (C-05)", () => {
    expect(capConfig).toContain("LUMINA_DIAGNOSTIC");
    expect(capConfig).toContain("loggingBehavior: diagnostic ? 'debug' : 'none'");
    expect(capConfig).toContain("webContentsDebuggingEnabled: diagnostic");
    // Les valeurs en dur ne doivent jamais réapparaître comme défaut.
    expect(capConfig).not.toMatch(/loggingBehavior:\s*'(debug|production)'/);
    expect(capConfig).not.toMatch(/webContentsDebuggingEnabled:\s*true/);
  });
});

describe("A1 — auto-mise à jour APK : SHA-256 obligatoire (§1.5)", () => {
  it("checkForUpdate refuse toute offre sans empreinte vérifiable", () => {
    expect(read("src/updater/checkForUpdate.ts")).toContain(
      "if (!sha256) return null;",
    );
  });

  it("le plugin natif rejette tout téléchargement sans empreinte", () => {
    const java = read(
      "android/app/src/main/java/com/lumina/mfejc/ApkUpdaterPlugin.java",
    );
    expect(java).toContain('call.reject("SHA-256 requis")');
    expect(java).toContain('MessageDigest.getInstance("SHA-256")');
  });
});

describe("A2 — porte unique des permissions et transport push réel", () => {
  it("OneSignal passe par le pont local enregistré, plus par le plugin absent", () => {
    const oneSignalTs = read("src/lib/onesignal.ts");
    expect(oneSignalTs).toContain(
      'registerPlugin<OneSignalBridgePlugin>("OneSignalBridge")',
    );
    // L'ancien transport appelait un plugin Cordova jamais installé.
    expect(oneSignalTs).not.toContain('nativeCallback("OneSignalPush"');
    const bridge = read(
      "android/app/src/main/java/com/lumina/mfejc/OneSignalBridgePlugin.java",
    );
    expect(bridge).toContain('@CapacitorPlugin(name = "OneSignalBridge")');
    expect(
      read("android/app/src/main/java/com/lumina/mfejc/MainActivity.java"),
    ).toContain("registerPlugin(OneSignalBridgePlugin.class)");
  });

  it("PermissionService expose la façade et l'ouverture des réglages", () => {
    const permService = read("src/lib/permissionService.ts");
    expect(permService).toContain("export const permissions");
    expect(permService).toContain("AndroidSettings.ApplicationDetails");
  });

  it("aucune demande de permission dans les couches UI (pages/composants)", () => {
    const offenders: string[] = [];
    for (const dir of ["src/pages", "src/components"]) {
      for (const file of walk(join(root, dir))) {
        if (!/\.tsx?$/.test(file) || file.includes("__tests__")) continue;
        const source = readFileSync(file, "utf8");
        if (/requestPermissions\(|\.requestPermission\(/.test(source)) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("SettingsNotifications passe par PermissionService", () => {
    expect(read("src/pages/SettingsNotifications.tsx")).toContain(
      'from "@/lib/permissionService"',
    );
  });

  it("P-02 : le scanner ne demande plus la permission caméra", () => {
    expect(read("src/components/CameraScanner.tsx")).not.toContain(
      "requestPermissions",
    );
  });

  it("capacitor-native-settings est enregistré côté Android", () => {
    expect(read("android/capacitor.settings.gradle")).toContain(
      "capacitor-native-settings",
    );
  });
});

describe("A3 — plugins essentiels, insets et clavier (C-01/C-02/C-03/C-09/C-10)", () => {
  it("status-bar, splash-screen et haptics sont installés ET enregistrés Android", () => {
    const pkg = read("package.json");
    const settingsGradle = read("android/capacitor.settings.gradle");
    for (const name of ["status-bar", "splash-screen", "haptics"]) {
      expect(pkg).toContain(`"@capacitor/${name}"`);
      expect(settingsGradle).toContain(`:capacitor-${name}`);
    }
  });

  it("la config porte la stratégie clavier et la fin de splash (C-10/C-01)", () => {
    expect(capConfig).toContain("resize: 'native'");
    expect(capConfig).toContain("resizeOnFullScreen: true");
    expect(capConfig).toContain("launchShowDuration: 0");
  });

  it("C-09 : bas = rembourrage natif seul, CSS neutralisable sur Android", () => {
    // Le correctif natif du bug P1-3 (onglets sous la navigation
    // système) est LA source pour le bas — ne pas le retirer.
    const java = read(
      "android/app/src/main/java/com/lumina/mfejc/MainActivity.java",
    );
    expect(java).toContain(
      "view.setPadding(bars.left, 0, bars.right, bars.bottom)",
    );
    // Côté CSS : neutralisation explicite sous la classe plateforme,
    // et BottomNav consomme la variable (jamais env() en dur).
    expect(read("src/App.css")).toContain("html.lumina-native-android");
    const bottomNav = read("src/components/BottomNav.tsx");
    expect(bottomNav).toContain("var(--ion-safe-area-bottom");
    expect(bottomNav).not.toContain("env(safe-area-inset-bottom");
    expect(read("src/main.tsx")).toContain('"lumina-native-android"');
  });

  it("barre d'état, splash et haptique sont branchés (C-02/C-01/C-03)", () => {
    expect(read("src/App.tsx")).toContain("StatusBarBridge");
    const bridge = read("src/components/StatusBarBridge.tsx");
    expect(bridge).toContain("setOverlaysWebView({ overlay: false })");
    expect(bridge).toContain("dataset.theme");
    expect(read("src/pages/Splash.tsx")).toContain("SplashScreen.hide()");
    expect(read("src/lib/haptics.ts")).toContain("@capacitor/haptics");
    const txNew = read("src/pages/TransactionNew.tsx");
    expect(txNew).toContain("haptics.success()");
    expect(txNew).toContain("haptics.error()");
  });
});
