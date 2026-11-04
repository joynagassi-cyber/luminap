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
import { readFileSync, readdirSync, existsSync } from "node:fs";
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

/**
 * A4 — Sécurité du stockage (étape C-11 + inventaire C-07c).
 *
 * L'étude `docs/etude-c07c-stockage-securise.md` documente où vivent les
 * jetons aujourd'hui. Ces gardes sont des fils-pièges : elles n'empêchent
 * pas la migration future vers un coffre natif, elles forcent à mettre
 * l'étude à jour quand la topologie des secrets change.
 */
describe("A4 — stockage : repli journalisé et copies de jetons bornées", () => {
  it("le repli localStorage du StorageAdapter est journalisé (C-11)", () => {
    const adapter = read("src/adapters/native/StorageAdapter.ts");
    expect(adapter).toContain("reportError");
    expect(adapter).toContain("storage-adapter-fallback");
  });

  it("le refresh_token n'est manipulé que par les modules d'auth/sync connus (C-07c)", () => {
    const ALLOWED = new Set([
      "src/lib/auth.ts",
      "src/lib/powersync/SupabaseConnector.ts",
      "src/lib/powersync/index.ts",
    ]);
    const offenders: string[] = [];
    const walk = (rel: string): void => {
      for (const entry of readdirSync(join(process.cwd(), rel), {
        withFileTypes: true,
      })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(child);
        } else if (
          /\.(ts|tsx)$/.test(entry.name) &&
          !entry.name.includes(".test.") &&
          !ALLOWED.has(child) &&
          read(child).includes("refresh_token")
        ) {
          offenders.push(child);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});

/**
 * A5 — Fondations Ionic : mode par plateforme, palette complète, règle
 * « Ionic d'abord » inscrite. La fraîcheur des pages à données est prouvée
 * séparément (`data-hooks-freshness.test.ts` : hooks réactifs PowerSync,
 * pas de copie figée au montage).
 */
describe("A5 — fondations Ionic (mode, palette, règle)", () => {
  it("aucun mode Ionic forcé — le défaut plateforme s'applique (Material sur Android)", () => {
    const app = read("src/App.tsx");
    expect(app).not.toContain('mode: "ios"');
    expect(app).not.toContain('mode: "md"');
  });

  it("la palette définit contrast/shade/tint des couleurs chromatiques (pas de défaut bleu)", () => {
    const css = read("src/ionic/theme.css");
    for (const color of ["primary", "success", "warning", "danger"]) {
      expect(css).toContain(`--ion-color-${color}-contrast`);
      expect(css).toContain(`--ion-color-${color}-shade`);
      expect(css).toContain(`--ion-color-${color}-tint`);
    }
    expect(css).toContain("--ion-color-primary-contrast: var(--on-accent)");
  });

  it("la règle « Ionic d'abord » est inscrite (exceptions + gabarit de PR)", () => {
    expect(read("docs/ui-exceptions.md")).toContain("Ionic d'abord");
    expect(read(".github/pull_request_template.md")).toContain("Ionic d'abord");
  });
});

/**
 * A6 — Retours et feuilles Ionic : un seul moteur de toast (IonToast),
 * confirmations par IonAlert, sélecteurs canoniques (IonSelect) et date
 * par IonDatetime. Gardes = fils-pièges contre le retour d'un équivalent
 * maison ou d'un dialogue navigateur.
 */
describe("A6 — retours et feuilles Ionic (toasts, alertes, date)", () => {
  const scanFor = (needle: string): string[] => {
    const offenders: string[] = [];
    const walk = (rel: string): void => {
      for (const entry of readdirSync(join(process.cwd(), rel), {
        withFileTypes: true,
      })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(child);
        } else if (
          /\.(ts|tsx)$/.test(entry.name) &&
          !entry.name.includes(".test.") &&
          read(child).includes(needle)
        ) {
          offenders.push(child);
        }
      }
    };
    walk("src/pages");
    walk("src/components");
    return offenders;
  };

  it("les toasts passent par IonToast — plus ni sonner ni Radix", () => {
    const facade = read("src/utils/toast.ts");
    expect(facade).toContain("toastController");
    expect(facade).not.toContain("sonner");
    const app = read("src/App.tsx");
    expect(app).not.toContain("components/ui/sonner");
    expect(app).not.toContain("components/ui/toaster");
    expect(existsSync(join(process.cwd(), "src/hooks/use-toast.ts"))).toBe(false);
  });

  it("les confirmations passent par IonAlert — ConfirmModal adossé, zéro window.confirm", () => {
    // Architecture retenue à l'intégration A6 (livrée par #404) : le
    // composant ConfirmModal délègue à IonAlert (rôle « destructive »
    // pour le danger), et la récupération locale de Health aussi. Ne
    // doit subsister AUCUN appel au dialogue navigateur — l'aiguille
    // vise l'appel (« window.confirm( »), pas les mentions en
    // commentaire qui documentent la migration.
    expect(read("src/components/ConfirmModal.tsx")).toContain("IonAlert");
    expect(scanFor("window.confirm(")).toEqual([]);
  });

  it("le DatePicker repose sur IonDatetime et il ne reste aucun sélecteur HTML natif", () => {
    expect(read("src/components/DatePicker.tsx")).toContain("IonDatetime");
    expect(scanFor("<select")).toEqual([]);
  });

  it("les contrôleurs Ionic se chargent à la demande — aucun import statique du baril", () => {
    // Le baril `@ionic/core` en import statique tire tout le graphe des
    // composants Ionic dans les preloads du premier rendu (39 requêtes
    // mesurées contre un budget de 28 — perf-budget.test.ts, échec CI
    // initial de la PR A6). La façade toast passe par le chargeur
    // dynamique mémoïsé ; un retour à l'import statique doit échouer
    // ICI, pas seulement au budget de build.
    for (const facade of ["src/utils/toast.ts"]) {
      const src = read(facade);
      expect(src).toContain("loadIonicCore");
      expect(src).not.toContain('from "@ionic/core"');
    }
    const loader = read("src/utils/load-ionic-core.ts");
    expect(loader).toContain('import("@ionic/core")');
    expect(loader).not.toContain('from "@ionic/core"');
  });
});
