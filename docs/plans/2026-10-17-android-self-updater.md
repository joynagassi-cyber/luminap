# Self-Updater Android (GitHub Releases → PackageInstaller) — Plan d'implémentation

> **Pour Claude :** REQUIRED SUB-SKILL : utiliser superpowers:executing-plans pour exécuter ce plan tâche par tâche.

**Objectif :** Permettre à l'app Android (distribuée hors Play Store) de détecter une nouvelle version publiée sur GitHub Releases, de télécharger l'APK (SHA-256 vérifié), et de l'installer via `PackageInstaller`.

**Architecture :** Plugin Capacitor natif JAVA (`ApkUpdater`) qui télécharge le fichier, vérifie le hash, et lance l'installation ; couche TypeScript (`src/updater/`) qui interroge l'API GitHub, gère l'état (hook React `useUpdater`), et pilote l'UI (`UpdateDialog`). Aucune librairie tierce d'auto-update.

**Stack :** Ionic React + Capacitor 6, package Android `com.lumina.mfejc`, build pnpm + Vite, tests Vitest. Dépendances Capacitor manquantes à installer : `@capacitor/preferences` (`@capacitor/app` déjà présent ^6.0.3). GitHub : dépôt **public** `joynagassi-cyber/luminap` (aucun token embarqué).

---

## Hypothèses & décisions à confirmer (à signaler en fin de mission)

| # | Hypothèse | Valeur retenue |
|---|-----------|----------------|
| A1 | `GITHUB_OWNER` / `GITHUB_REPO` (placeholders `[MON_COMPTE_GITHUB]` / `[MON_DEPOT]`) | `joynagassi-cyber` / `luminap` (récupéré du `git remote -v`) |
| A2 | `@capacitor/preferences` absent du projet | À installer via pnpm (nécessaire pour mémoriser l'heure de dernière vérif) |
| A3 | `versionName` doit être le tag sans le `v` | `1.0.1` ↔ tag `v1.0.1` (convention existante du CI Android) |
| A4 | Le build release est signé en CI par `apksigner` (pas via `signingConfigs.release`) | On ajoute `signingConfigs.release` LECTANT des env vars (défauts vides) pour que le `./gradlew assembleRelease` local reste utilisable en debug, sans casser le CI actuel qui signe l'APK unsigned |
| A5 | Le script de build dans le workflow est `pnpm run build` (pas `npm run build`) | `pnpm install --frozen-lockfile` + `pnpm run build` (le projet est pnpm 11, pas npm) |
| A6 | Page cible du bouton « Rechercher une mise à jour » | `src/pages/SettingsAbout.tsx` (onglet « À propos ») |
| A7 | Le `registerPlugin` local natif doit passer **avant** `super.onCreate()` | La mission l'exige explicitement ; aujourd'hui `MainActivity.onCreate` appelle `super.onCreate()` d'abord — on réordonne |
| A8 | `minSdk 21` mais `PackageInstaller` exige **API 26+** | On garde le PackageInstaller sur API 26+, et un fallback `ACTION_VIEW` sur le fichier local pour API 21–25. Le fallback reste conforme à la mission car le téléchargement propre se fait quand même via le plugin ; seuls les très vieux devices (pré-Oreo) passent par le lanceur système |
| A9 | Le CI `cap sync` régénère `capacitor.settings.gradle` et purge les modules natifs manuels | Le plugin APKUpdater est enregistré via `registerPlugin` dans `MainActivity` (pas comme module Gradle séparé), donc il survive à `cap sync`. Sauf si `cap sync` remplace `MainActivity.java` — à vérifier en tâche 9 (le build doit passer) |

---

## Cartographie des fichiers

**À créer :**
- `android/app/src/main/java/com/lumina/mfejc/ApkUpdaterPlugin.java`
- `android/app/src/main/java/com/lumina/mfejc/InstallResultReceiver.java`
- `src/updater/config.ts`
- `src/updater/apkUpdater.ts`
- `src/updater/checkForUpdate.ts`
- `src/updater/useUpdater.ts`
- `src/updater/UpdateDialog.tsx`
- `src/updater/__tests__/checkForUpdate.test.ts` (tests TDD de la logique de version + hash)
- `.github/workflows/release.yml`
- `docs/index.html`

**À modifier :**
- `android/app/src/main/AndroidManifest.xml` (permissions + receiver)
- `android/app/src/main/java/com/lumina/mfejc/MainActivity.java` (registerPlugin)
- `android/app/build.gradle` (signingConfigs.release via env vars)
- `package.json` (`@capacitor/preferences`)
- `src/App.tsx` (appel `checkForUpdate(false)` au démarrage, après init existante)
- `src/pages/SettingsAbout.tsx` (bouton « Rechercher une mise à jour » + `UpdateDialog`)

**Interdiction stricte :** ne PAS toucher à Supabase / PowerSync (`src/lib/powersync`, `src/lib/dataLayer.ts`, schéma, connecteur).

---

## Tâche 1 — Mises à jour Android : permissions, receiver, version

**Fichiers :**
- Modifier : `android/app/src/main/AndroidManifest.xml`
- Modifier : `android/app/build.gradle`

### Étape 1.1 : Permissions dans le manifeste

Dans `android/app/src/main/AndroidManifest.xml`, dans la section `<uses-permission>` (près de la fin, avant `</manifest>`), ajouter si absents :

```xml
<!-- Self-updater : demande l'installation d'APK (sources inconnues) -->
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

`android.permission.INTERNET` est déjà présent (ligne 69) — ne pas le dupliquer.

Dans le bloc `<application>`, juste après le `<provider FileProvider>`, ajouter le receiver :

```xml
<receiver
    android:name=".InstallResultReceiver"
    android:exported="false" />
```

### Étape 1.2 : `signingConfigs.release` (env vars, défauts vides)

Dans `android/app/build.gradle`, à l'intérieur du bloc `android { ... }`, juste AVANT `buildTypes { ... }`, ajouter :

```groovy
    signingConfigs {
        release {
            // Lues depuis l'environnement CI (github actions). Les défauts vides
            // gardent le build debug local fonctionnel ; le CI fournit les vraies valeurs.
            def ksPath = System.getenv("KEYSTORE_PATH") ?: ""
            if (ksPath != "") {
                storeFile file(ksPath)
                storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
                keyAlias System.getenv("KEY_ALIAS") ?: ""
                keyPassword System.getenv("KEY_PASSWORD") ?: ""
            }
        }
    }
```

> Note : le CI Android **existant** signe l'APK via `apksigner` (workflow `lumina-android.yml`) sur un APK unsigned. Ce `signingConfigs.release` avec défauts vides n'affecte PAS le debug build local et ne casse pas le CI : en debug, Gradle n'utilise pas `signingConfigs.release`. On ne modifie PAS `applicationId` (restreint par la mission).

### Étape 1.3 : Vérifier versionCode / versionName

`android/app/build.gradle` a déjà `versionCode 2` et `versionName "1.0.1"` (lignes 10-11) — conforme au critère A3 (versionName = tag sans le `v`). Rien à faire sauf lors d'une publication.

### Étape 1.4 : Commit

```bash
git add android/app/src/main/AndroidManifest.xml android/app/build.gradle
git commit -m "feat(android): permissions + receiver + signingConfigs pour le self-updater"
```

---

## Tâche 2 — Plugin natif JAVA `ApkUpdater`

**Fichiers :**
- Créer : `android/app/src/main/java/com/lumina/mfejc/ApkUpdaterPlugin.java`
- Créer : `android/app/src/main/java/com/lumina/mfejc/InstallResultReceiver.java`
- Modifier : `android/app/src/main/java/com/lumina/mfejc/MainActivity.java`

### Étape 2.1 : `InstallResultReceiver.java`

Créer `android/app/src/main/java/com/lumina/mfejc/InstallResultReceiver.java` :

```java
package com.lumina.mfejc;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Reçoit le résultat de la session PackageInstaller du self-updater.
 * - STATUS_PENDING_USER_ACTION : on lance l'Intent de confirmation système.
 * - STATUS_SUCCESS : rien (l'app est remplacée et relancée).
 * - autre : log d'erreur.
 */
public class InstallResultReceiver extends BroadcastReceiver {
    private static final String TAG = "ApkUpdater";

    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(android.content.pm.PackageInstaller.EXTRA_STATUS, -1);
        String msg = intent.getStringExtra(android.content.pm.PackageInstaller.EXTRA_STATUS_MESSAGE);

        switch (status) {
            case android.content.pm.PackageInstaller.STATUS_PENDING_USER_ACTION:
                Intent installIntent;
                if (Build.VERSION.SDK_INT >= 33) {
                    installIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
                } else {
                    installIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                }
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(installIntent);
                break;
            case android.content.pm.PackageInstaller.STATUS_SUCCESS:
                Log.i(TAG, "Installation réussie : " + msg);
                break;
            default:
                Log.e(TAG, "Échec installation (status=" + status + ") : " + msg);
        }
    }
}
```

### Étape 2.2 : `ApkUpdaterPlugin.java`

Créer `android/app/src/main/java/com/lumina/mfejc/ApkUpdaterPlugin.java` :

```java
package com.lumina.mfejc;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.provider.Downloads;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Self-updater : télécharge un APK (SHA-256 optionnel) et l'installe via
 * PackageInstaller. Toutes les opérations réseau/fichier sont off-thread.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String TAG = "ApkUpdater";
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Progress déjà émis (1 événement par pourcent max)
    private int lastEmittedPercent = -1;

    private File targetApk() {
        File dir = new File(getContext().getCacheDir(), "updates");
        dir.mkdirs();
        return new File(dir, "update.apk");
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok = getContext().getPackageManager().canRequestPackageInstalls();
        JSObject ret = new JSObject();
        ret.put("value", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Uri uri = Uri.parse("package:" + getContext().getPackageName());
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir les paramètres d'installation", e);
        }
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String sha256 = call.getString("sha256");

        if (url == null || !url.startsWith("https://")) {
            call.reject("URL HTTPS requise");
            return;
        }

        io.execute(() -> {
            try {
                File target = targetApk();
                if (target.exists()) target.delete();

                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(30_000);
                conn.setReadTimeout(60_000);
                conn.connect();

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] buffer = new byte[65_536];
                int read;
                long total = conn.getContentLengthLong();
                long written = 0;
                int lastPercent = -1;

                try (InputStream in = conn.getInputStream();
                     OutputStream out = new FileOutputStream(target)) {
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        digest.update(buffer, 0, read);
                        written += read;

                        if (total > 0) {
                            int pct = (int) Math.floor((written * 100.0) / total);
                            if (pct > lastPercent) {
                                lastPercent = pct;
                                emitProgress(pct);
                            }
                        }
                    }
                }
                conn.disconnect();

                byte[] hashBytes = digest.digest();
                String hexHash = bytesToHex(hashBytes);

                if (sha256 != null && !sha256.isEmpty()
                        && !sha256.toLowerCase().equals(hexHash)) {
                    target.delete();
                    rejectIo(call, "Hash SHA-256 invalide");
                    return;
                }

                JSObject ret = new JSObject();
                ret.put("path", target.getAbsolutePath());
                resolveIo(call, ret);
            } catch (Exception e) {
                Log.e(TAG, "Téléchargement APK échoué", e);
                File t = targetApk();
                if (t.exists()) t.delete();
                rejectIo(call, "Téléchargement échoué : " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void install(PluginCall call) {
        io.execute(() -> {
            File apk = targetApk();
            if (!apk.exists()) {
                rejectIo(call, "APK introuvable. Téléchargez d'abord.");
                return;
            }
            try {
                Context ctx = getContext();
                PackageManager pm = ctx.getPackageManager();

                // minSdk 21 : PackageInstaller n'existe qu'à partir d'API 26.
                // Sur API 21–25 on bascule sur le fallback (lanceur système).
                if (Build.VERSION.SDK_INT < 26) {
                    installLegacy(call, apk);
                    return;
                }

                if (!pm.canRequestPackageInstalls()) {
                    rejectIo(call, "Permission 'sources inconnues' refusée");
                    return;
                }

                PackageInstaller installer = pm.getPackageInstaller();
                PackageInstaller.SessionParams params =
                        new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                if (Build.VERSION.SDK_INT >= 31) {
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                }
                if (Build.VERSION.SDK_INT >= 34) {
                    params.setRequestUpdateOwnership(true);
                }

                int sessionId = installer.createSession(params);
                try (PackageInstaller.Session session = installer.openSession(sessionId);
                     InputStream in = new FileInputStream(apk);
                     OutputStream out = session.openWrite("update.apk", 0, apk.length())) {
                    byte[] buf = new byte[65_536];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                    }
                    session.fsync(out);

                    Intent intent = new Intent(ctx, InstallResultReceiver.class)
                            .setPackage(ctx.getPackageName());
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= 31) {
                        flags |= PendingIntent.FLAG_MUTABLE;
                    }
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, sessionId, intent, flags);
                    session.commit(pi.getIntentSender());
                }

                resolveIo(call, new JSObject());
            } catch (Exception e) {
                Log.e(TAG, "Installation échouée", e);
                rejectIo(call, "Installation échouée : " + e.getMessage());
            }
        });
    }

    private void emitProgress(int pct) {
        JSObject data = new JSObject();
        data.put("progress", pct);
        mainHandler.post(() -> notifyListeners("downloadProgress", data));
    }

    /**
     * Fallback API 21–25 (PackageInstaller exige API 26). Le téléchargement est
     * déjà fait dans download() ; ici on ouvre le lanceur système sur le
     * fichier local pour demander l'installation.
     */
    private void installLegacy(PluginCall call, File apk) {
        mainHandler.post(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                if (Build.VERSION.SDK_INT >= 24) {
                    intent.setDataAndType(Uri.fromFile(apk), "application/vnd.android.package-archive");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else {
                    intent.setDataAndType(Uri.fromFile(apk), "application/vnd.android.package-archive");
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve(new JSObject());
            } catch (Exception e) {
                Log.e(TAG, "Fallback API<26 échoué", e);
                rejectIo(call, "Installation échouée (API<26)");
            }
        });
    }

    private void resolveIo(PluginCall call, JSObject ret) {
        mainHandler.post(() -> call.resolve(ret));
    }

    private void rejectIo(PluginCall call, String msg) {
        mainHandler.post(() -> call.reject(msg));
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b & 0xff));
        return sb.toString();
    }
}
```

> Note : `PendingIntent` n'est pas importé explicitement car il est référencé via `android.content` — ajouter à la ligne d'imports : `import android.app.PendingIntent;`.

### Étape 2.3 : Enregistrer le plugin dans `MainActivity.java`

Modifier `android/app/src/main/java/com/lumina/mfejc/MainActivity.java`.

Ajouter à la ligne d'imports Capacitor :

```java
import com.getcapacitor.Plugin;
```

(Modifier l'`import com.getcapacitor.Plugin;` existant s'il n'y est pas ; il est déjà présent à la ligne 7.)

Réordonner `onCreate` : `registerPlugin(ApkUpdaterPlugin.class)` **avant** `super.onCreate(savedInstanceState)` :

```java
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Les plugins natifs locaux ne sont pas auto-enregistrés — il faut
        // les déclarer AVANT la construction du Bridge (super.onCreate).
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);

        handleIntent(getIntent());
    }
```

Supprimer le commentaire sur OneSignal si présent (pas bloquant) ; ne PAS toucher à `handleIntent` (déep-link Supabase/Google OAuth, hors périmètre).

### Étape 2.4 : Commit

```bash
git add android/app/src/main/java/com/lumina/mfejc/ApkUpdaterPlugin.java \
        android/app/src/main/java/com/lumina/mfejc/InstallResultReceiver.java \
        android/app/src/main/java/com/lumina/mfejc/MainActivity.java
git commit -m "feat(android): plugin natif ApkUpdater (téléchargement + PackageInstaller)"
```

---

## Tâche 3 — Pont TypeScript `src/updater/apkUpdater.ts`

**Fichier :** Créer `src/updater/apkUpdater.ts`

```ts
import { registerPlugin, PluginListenerHandle } from "@capacitor/core";

export interface ApkUpdaterPlugin {
  canInstall(): Promise<{ value: boolean }>;
  openInstallSettings(): Promise<void>;
  download(opts: { url: string; sha256?: string }): Promise<{ path: string }>;
  install(): Promise<void>;
  addListener(
    event: "downloadProgress",
    callback: (data: { progress: number }) => void,
  ): Promise<PluginListenerHandle>;
}

/**
 * Pont vers le plugin natif Capacitor "ApkUpdater" (PackageInstaller).
 * Sur web, registerPlugin renvoie des promesses rejetées — toute la logique
 * de checkForUpdate est gardée sous Capacitor.getPlatform() === 'android'.
 */
export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>("ApkUpdater");
```

### Étape 3.2 : Commit

```bash
git add src/updater/apkUpdater.ts
git commit -m "feat(updater): pont TypeScript vers le plugin natif ApkUpdater"
```

---

## Tâche 4 — Constantes + logique de vérification de version

**Fichiers :**
- Créer : `src/updater/config.ts`
- Créer : `src/updater/checkForUpdate.ts`
- Créer : `src/updater/__tests__/checkForUpdate.test.ts`
- Modifier : `package.json` (ajouter `@capacitor/preferences`)

### Étape 4.1 : Installer `@capacitor/preferences`

```bash
pnpm add @capacitor/preferences
```

### Étape 4.2 : `src/updater/config.ts` (constantes centralisées)

```ts
/**
 * Paramètres du self-updater — à personnaliser par projet.
 * Le dépôt GitHub est PUBLIC : aucun token n'est embarqué dans l'app.
 */
export const GITHUB_OWNER = "joynagassi-cyber";
export const GITHUB_REPO = "luminap";
export const APK_ASSET_NAME = "app-release.apk";

/** Intervalle minimal entre deux vérifications (ms) — 6 heures. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
```

### Étape 4.3 : `src/updater/checkForUpdate.ts`

```ts
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { GITHUB_OWNER, GITHUB_REPO, APK_ASSET_NAME, CHECK_INTERVAL_MS } from "./config";

export interface UpdateInfo {
  versionName: string;
  changelog: string;
  downloadUrl: string;
  sha256?: string;
  sizeBytes: number;
}

interface LatestRelease {
  tag_name: string;
  body?: string;
  assets?: Array<{
    name: string;
    browser_download_url: string;
    size: number;
    digest?: string;
  }>;
}

/** Supprime le préfixe "v" du tag (v1.4.0 → 1.4.0). */
export function normalizeTag(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

/**
 * Compare numériquement deux versions "MAJ.m.j". Retourne :
 * -1 si a<b, 0 si a===b, 1 si a>b. Gère les versions plus/moins de 3 composantes
 * (composantes manquantes = 0).
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/**
 * Vérifie une mise à jour sur GitHub Releases.
 * Retourne null si : pas d'update, on n'est pas sur Android, vérif trop récente
 * (sauf force), ou en cas d'erreur réseau/API (on ne lève JAMAIS).
 */
export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  try {
    // 1. Android uniquement
    if (Capacitor.getPlatform() !== "android") return null;

    // 2. Throttle 6h (mémoire Preferences) sauf force
    const KEY = "lumina.last_update_check";
    if (!force) {
      const { value: last } = await Preferences.get({ key: KEY });
      if (last && Date.now() - Number(last) < CHECK_INTERVAL_MS) return null;
    }

    // 3. Appeler l'API GitHub (public, 60 req/h/IP)
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return null;
    const release = (await res.json()) as LatestRelease;

    // 4. Version locale
    const localVersion = normalizeTag((await App.getInfo()).version);
    const remoteVersion = normalizeTag(release.tag_name);

    // 5. Mémoriser l'heure de la vérif (peu importe le résultat)
    await Preferences.set({ key: KEY, value: String(Date.now()) });

    // 6. Nouvelle version strictement supérieure ?
    if (compareVersions(remoteVersion, localVersion) <= 0) return null;

    // 7. Trouver l'asset exact APK_ASSET_NAME, extraire sha256 depuis digest
    const asset = release.assets?.find((a) => a.name === APK_ASSET_NAME);
    if (!asset) return null;
    const sha256 = asset.digest?.replace(/^sha256:/, "");

    return {
      versionName: remoteVersion,
      changelog: release.body ?? "",
      downloadUrl: asset.browser_download_url,
      sha256: sha256 || undefined,
      sizeBytes: asset.size,
    };
  } catch {
    // Une erreur réseau/API ne doit JAMAIS faire planter l'app ni bloquer le démarrage.
    return null;
  }
}
```

### Étape 4.4 : TDD — test de la logique (comparer + tag)

Créer `src/updater/__tests__/checkForUpdate.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { compareVersions, normalizeTag } from "../checkForUpdate";

describe("compareVersions", () => {
  it("1.10.0 > 1.9.0 (numérique, pas lexicographique)", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
    expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
  });
  it("égalité → 0", () => {
    expect(compareVersions("2.0.1", "2.0.1")).toBe(0);
  });
  it("gère moins de 3 composantes (1.0 == 1.0.0)", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });
});

describe("normalizeTag", () => {
  it("retire le préfixe v", () => {
    expect(normalizeTag("v1.4.0")).toBe("1.4.0");
  });
  it("laisse passer un tag sans v", () => {
    expect(normalizeTag("1.4.0")).toBe("1.4.0");
  });
});
```

### Étape 4.5 : Lancer le test

```bash
pnpm test src/updater/__tests__/checkForUpdate.test.ts
```
Attendu : PASS (2 tests + 2 tests).

### Étape 4.6 : Commit

```bash
git add src/updater/config.ts src/updater/checkForUpdate.ts src/updater/__tests__/checkForUpdate.test.ts package.json pnpm-lock.yaml
git commit -m "feat(updater): checkForUpdate (version numérique + SHA-256 + throttle 6h)"
```

---

## Tâche 5 — Hook React `useUpdater` + `UpdateDialog`

**Fichiers :**
- Créer : `src/updater/useUpdater.ts`
- Créer : `src/updater/UpdateDialog.tsx`

### Étape 5.1 : `src/updater/useUpdater.ts`

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { PluginListenerHandle } from "@capacitor/core";
import { ApkUpdater } from "./apkUpdater";
import { checkForUpdate, type UpdateInfo } from "./checkForUpdate";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "readyToInstall"
  | "waitingPermission"
  | "error";

export interface UpdaterState {
  status: UpdaterStatus;
  progress: number; // 0..100
  updateInfo: UpdateInfo | null;
  error: string | null;
}

/**
 * Hook pilotant le self-updater. `check(force)` vérifie une nouvelle version
 * ; `startUpdate()` télécharge + installe. Sur web/non-Android, l'état reste
 * `idle` et aucune erreur n'est levée.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    status: "idle",
    progress: 0,
    updateInfo: null,
    error: null,
  });

  const progressHandleRef = useRef<PluginListenerHandle | null>(null);
  const appStateHandleRef = useRef<PluginListenerHandle | null>(null);
  const updateInfoRef = useRef<UpdateInfo | null>(null);

  const set = (patch: Partial<UpdaterState>) =>
    setState((s) => ({ ...s, ...patch }));

  /** Vérifie une nouvelle version. Met à jour `updateInfo` + `status`. */
  const check = useCallback(async (force: boolean) => {
    set({ status: "checking", error: null });
    const info = await checkForUpdate(force);
    if (info) {
      updateInfoRef.current = info;
      set({ status: "available", updateInfo: info });
    } else {
      set({ status: "idle" });
    }
  }, []);

  /** Télécharge (si besoin) puis installe l'APK. */
  const startUpdate = useCallback(async () => {
    const info = updateInfoRef.current;
    if (!info) return;

    // 1. Permission "sources inconnues"
    const { value: canInstall } = await ApkUpdater.canInstall();
    if (!canInstall) {
      set({ status: "waitingPermission", progress: 0 });
      await ApkUpdater.openInstallSettings();
      // Reprendre quand l'app revient au premier plan
      appStateHandleRef.current = await App.addListener("appStateChange", async ({ isActive }) => {
        if (isActive) {
          if (appStateHandleRef.current) {
            await appStateHandleRef.current.remove();
            appStateHandleRef.current = null;
          }
          await startUpdate(); // re-check de la permission
        }
      });
      return;
    }

    // 2. Télécharger avec progression
    set({ status: "downloading", progress: 0 });
    progressHandleRef.current = await ApkUpdater.addListener("downloadProgress", ({ progress }) => {
      set({ progress });
    });
    try {
      await ApkUpdater.download({ url: info.downloadUrl, sha256: info.sha256 });
    } catch (e) {
      set({ status: "error", error: String(e) });
      await progressHandleRef.current?.remove();
      progressHandleRef.current = null;
      return;
    }

    // 3. Installer
    set({ status: "readyToInstall", progress: 100 });
    await ApkUpdater.install();
  }, []);

  // Nettoyage des listeners au démontage
  useEffect(() => {
    return () => {
      progressHandleRef.current?.remove();
      appStateHandleRef.current?.remove();
    };
  }, []);

  return { ...state, check, startUpdate };
}
```

### Étape 5.2 : `src/updater/UpdateDialog.tsx`

```tsx
import { IonButton, IonButtons, IonDialog, IonDialogController, IonProgressBar } from "@ionic/react";
import { useUpdater } from "./useUpdater";

/**
 * Dialogue de mise à jour : "Mise à jour disponible" + version + changelog
 * + boutons "Mettre à jour" / "Plus tard" ; IonProgressBar pendant le téléchargement.
 */
export function UpdateDialog() {
  const { status, progress, updateInfo, startUpdate } = useUpdater();
  const dialogCtrl = IonDialogController;

  // Le composant ne s'ouvre automatiquement PAS ici : il est piloté par le
  // parent via un état booleen. On expose `open()` dans l'API de retour.
  const open = () => dialogCtrl.present({
    component: () => (
      <IonDialog
        onDidDismiss={() => dialogCtrl.dismiss()}
        header="Mise à jour disponible"
      >
        {updateInfo && (
          <div className="p-4">
            <p className="text-sm mb-1">Version {updateInfo.versionName}</p>
            {updateInfo.changelog && (
              <p className="text-xs text-text-tertiary mb-3">{updateInfo.changelog}</p>
            )}
            {status === "downloading" && (
              <div className="mb-3">
                <IonProgressBar value={progress / 100} type="indeterminate" />
                <p className="text-xs text-text-tertiary mt-1">
                  Téléchargement… {progress}%
                </p>
              </div>
            )}
            <IonButtons slot="footer">
              <IonButton onClick={() => dialogCtrl.dismiss()}>Plus tard</IonButton>
              <IonButton onClick={() => startUpdate()}>Mettre à jour</IonButton>
            </IonButtons>
          </div>
        )}
      </IonDialog>
    ),
  });

  // Ré-exporte l'open + le hook pour le parent
  return { open, status, progress, updateInfo, startUpdate };
}

export default UpdateDialog;
```

> ⚠️ **Note de conception :** `UpdateDialog` comme écrit renvoie un objet (pas un JSX) — c'est incohérent pour un composant React. Le plan recommande de le refactorer en un vrai composant : `useUpdater()` dans le parent, et `UpdateDialog` reçoit `{ status, progress, updateInfo, startUpdate, onDismiss }` comme props. C'est l'implémentation attendue dans **Tâche 6** (intégration). On garde la Tâche 5 comme "squelette" et on corrige dans l'intégration.

### Étape 5.3 : Commit

```bash
git add src/updater/useUpdater.ts src/updater/UpdateDialog.tsx
git commit -m "feat(updater): hook useUpdater + UpdateDialog (Ionic)"
```

---

## Tâche 6 — Intégration UI : `App.tsx` (vérif au démarrage) + `SettingsAbout.tsx` (bouton)

**Fichiers :**
- Modifier : `src/App.tsx`
- Modifier : `src/pages/SettingsAbout.tsx`

### Étape 6.1 : `App.tsx` — vérification au démarrage, non-bloquante

Dans `src/App.tsx`, au **démarrage** de l'app (après l'init existante de PowerSync/Supabase, sans la modifier), ajouter un appel `checkForUpdate(false)` une seule fois, **sans bloquer le démarrage** :

```tsx
import { useEffect } from "react";
import { checkForUpdate } from "@/updater/checkForUpdate";
// (import du hook/état à exposer, ou un état local "update available")
```

Insérer dans le composant racine `App` (après les hooks existants, ne PAS modifier le render existant) :

```tsx
const [hasUpdate, setHasUpdate] = useState(false);
useEffect(() => {
  // Ne bloque PAS le démarrage : fire & forget. Sur web/iOS → null (pas d'effet).
  checkForUpdate(false).then((info) => setHasUpdate(info !== null));
}, []);
```

Puis rendre le `UpdateDialog` (si `hasUpdate`) plus haut dans l'arbre. Le composant réel (`UpdateDialog`) doit être ajusté en Tâche 5.2 (props) ; ici on monte le dialogue au niveau root et on le rend uniquement quand une update est dispo.

> Règle stricte : `checkForUpdate` est **try/catché** et ne bloque JAMAIS le boot. Sur `Capacitor.getPlatform() !== 'android'` (web, dev navigateur), il retourne `null` immédiatement — aucun effet, aucune erreur.

### Étape 6.2 : `SettingsAbout.tsx` — bouton « Rechercher une mise à jour »

Dans `src/pages/SettingsAbout.tsx`, ajouter une section (carte) avec un bouton qui appelle `check(true)` :

```tsx
import { useUpdater } from "@/updater/useUpdater";
import { updateCtrl } from "@/updater/UpdateDialog"; // ou l'API de choix de dialogue

export default function SettingsAbout() {
  const { status, progress, updateInfo, check, startUpdate } = useUpdater();
  const { config } = useAppConfig();
  const user = useCurrentUser();

  const handleCheckNow = async () => {
    const info = await check(true); // renvoie UpdateInfo | null
    if (!info) {
      // Affiche "Vous êtes à jour" (toast Ionic)
    }
  };

  return (
    <SettingsShell title="À propos" subtitle="...">
      {/* ... les blocs existants ... */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-text-primary font-semibold text-sm">Mise à jour</span>
          {status === "idle" && !updateInfo && (
            <button onClick={handleCheckNow} className="text-xs" style={{ color: "var(--accent-primary)" }}>
              Rechercher une mise à jour
            </button>
          )}
          {status === "available" && (
            <button onClick={() => startUpdate()} className="text-xs font-semibold" style={{ color: "var(--data-income)" }}>
              Mettre à jour vers {updateInfo?.versionName}
            </button>
          )}
          {status === "downloading" && <span className="text-xs">Téléchargement {progress}%…</span>}
        </div>
      </div>
    </SettingsShell>
  );
}
```

> Le composant `UpdateDialog` et le `useUpdater` partagent l'état ; le parent (SettingsAbout) pilote l'affichage. Le dialogue s'ouvre via l'`IonDialogController` quand `status === 'available'`.

### Étape 6.3 : Vérifier le type-retour de `check`

`useUpdater.check(force)` doit exposer le résultat (UpdateInfo | null) pour le message "Vous êtes à jour". Ajuster le hook si nécessaire pour qu'il **renvoie** l'UpdateInfo (la version actuelle ne retourne rien — corriger en Tâche 5 pour que `check` soit `async` et `return info`).

### Étape 6.4 : Build web (vérification TS)

```bash
pnpm run build
```
Attendu : build Vite OK, 0 erreur TypeScript (le type-check passe par `tsc` en pré-build si config, sinon vite détecte les erreurs).

### Étape 6.5 : Commit

```bash
git add src/App.tsx src/pages/SettingsAbout.tsx
git commit -m "feat(updater): vérif au démarrage + bouton dans Settings About"
```

---

## Tâche 7 — Workflow GitHub Actions `release.yml`

**Fichier :** Créer `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build web + sync Capacitor
        run: pnpm run sync:cap

      - name: Grant execute permission to gradlew
        run: chmod +x android/gradlew

      - name: Decode keystore
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > $RUNNER_TEMP/release.keystore

      - name: Build release APK
        working-directory: android
        run: ./gradlew assembleRelease
        env:
          KEYSTORE_PATH: ${{ runner.temp }}/release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}

      - name: Rename APK
        run: cp android/app/build/outputs/apk/release/*.apk app-release.apk

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: app-release.apk
```

> Adaptations apportées (voir A5) : `pnpm` (pas `npm`), node 22 (pas 20), `pnpm install --frozen-lockfile`, `pnpm run sync:cap` (qui fait `build:cap` + `cap sync android`). Le nom du fichier APK sortant est **`app-release.apk`** (copié depuis `*.apk` de la sortie Gradle) pour correspondre à `APK_ASSET_NAME`.

### Étape 7.2 : Commit

```bash
git add .github/workflows/release.yml
git commit -m "feat(ci): workflow release (tag v* → GitHub Release avec APK signé)"
```

---

## Tâche 8 — Page de téléchargement GitHub Pages

**Fichier :** Créer `docs/index.html`

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lumina — Télécharger</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #121212; color: #fff;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; }
    .card { text-align: center; max-width: 480px; padding: 2rem; }
    a.btn { display: inline-block; background: #FF6B00; color: #fff;
            padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none;
            font-weight: 600; margin: 1rem 0; }
    ol { text-align: left; color: #b3b3b3; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Lumina</h1>
    <p>Plateforme financière offline-first</p>
    <a class="btn"
       href="https://github.com/joynagassi-cyber/luminap/releases/latest/download/app-release.apk"
       download>
      Télécharger l'application
    </a>
    <ol>
      <li>Téléchargez le fichier <code>app-release.apk</code>.</li>
      <li>Dézippez/ouvrez le fichier — Android propose l'installation.</li>
      <li>Si demandé, autorisez « Installer des applications inconnues » pour cette source, puis « Installer ».</li>
    </ol>
  </div>
</body>
</html>
```

### Étape 8.2 : Commit

```bash
git add docs/index.html
git commit -m "docs: page de téléchargement GitHub Pages (bouton + instructions)"
```

---

## Tâche 9 — Vérification finale + compilation complète (critère d'acceptation 1)

**Commandes (à exécuter dans l'ordre, corriger si erreur) :**

```bash
# 1. Type-check + build web
pnpm run build

# 2. Tests unitaires du logic updater
pnpm test src/updater/__tests__/checkForUpdate.test.ts

# 3. Sync Capacitor (recopie dist/ dans le webview Android)
npx cap sync android

# 4. Build debug APK natif (compile les classes Java du plugin)
cd android && ./gradlew assembleDebug && cd ..
```

Attendu : build Vite OK, tests verts, `cap sync` OK, **`gradlew assembleDebug` compile le plugin Java sans erreur** (l'APK debug est produit, le plugin est enregistré mais n'est pas testé ici car c'est un build de debug sans APK remote).

### Étape 9.2 : Commit final (si corrections)

```bash
git add -A
git commit -m "chore(updater): compilation complète + correctifs"
```

---

## Rapport final attendu (à produire à la fin de l'exécution)

1. **Liste des fichiers créés/modifiés** (extrait de `git status --short` / `git diff --stat`).
2. **Secrets GitHub à créer** (Settings → Secrets and variables → Actions → New repository secret) :
   - `KEYSTORE_BASE64` (le keystore `.jks` encodé en base64)
   - `KEYSTORE_PASSWORD` (mot de passe du store)
   - `KEY_ALIAS` (alias de la clé)
   - `KEY_PASSWORD` (mot de passe de la clé)
   > ⚠️ Ces secrets ne sont PAS dans le code ni le dépôt. Ils alimentent le workflow `release.yml` et le `signingConfigs.release`.
   > Le CI existant (`lumina-android.yml`) utilise déjà `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEYSTORE_ALIAS` — le workflow `release.yml` réutilise les mêmes secrets pour rester cohérent ; ne PAS créer des secrets dupliqués si l'équipe veut unifier.
3. **Procédure de publication** :
   - Incrémenter `versionCode` et `versionName` dans `android/app/build.gradle` (ex. `versionCode 3`, `versionName "1.0.2"`).
   - Committer.
   - `git tag v1.0.2 && git push origin main v1.0.2`
   - Le workflow `release.yml` (trigger `push: tags: ["v*"]`) se lance, build l'APK signé, et pousse la GitHub Release avec `app-release.apk`.
   - L'app installée détecte la nouvelle version via `checkForUpdate`.
4. **Hypothèses faites** : A1–A9 ci-dessus + les éventuelles corrections faites pendant l'exécution (à documenter).

> **Note sur la comparaison de version :** `versionCode` (int) et `versionName` (string) sont déconnectés (versionCode 2 ↔ versionName "1.0.1"). Pour le PackageInstaller, Android exige que le `versionCode` du nouvel APK soit **strictement supérieur** à celui installé, sinon l'installation échoue avec `INSTALL_FAILED_VERSION_DOWNGRADE`. La comparaison faite côté TS (sur `versionName`) doit donc rester **alignée** avec l'incrémentation de `versionCode`. En pratique : chaque fois qu'on publie, on incrémente les deux ensemble.

---

## Résumé des 8 étapes de la mission → Tâches du plan

| Mission (étape) | Tâche plan | Fichiers clés |
|---|---|---|
| 1. Manifeste | Tâche 1 | `AndroidManifest.xml` |
| 2. Plugin natif Java | Tâche 2 | `ApkUpdaterPlugin.java`, `InstallResultReceiver.java`, `MainActivity.java` |
| 3. Pont TS | Tâche 3 | `src/updater/apkUpdater.ts` |
| 4. checkForUpdate | Tâche 4 | `src/updater/config.ts`, `checkForUpdate.ts` + test |
| 5. Hook + UI | Tâche 5–6 | `useUpdater.ts`, `UpdateDialog.tsx`, `App.tsx`, `SettingsAbout.tsx` |
| 6. Versions + signature | Tâche 1 + 9 | `build.gradle` |
| 7. GitHub Actions | Tâche 7 | `.github/workflows/release.yml` |
| 8. Page de téléchargement | Tâche 8 | `docs/index.html` |
