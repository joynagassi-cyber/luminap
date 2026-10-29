# P35 — Aligner les versions Capacitor (build Android) — R90

- **Date** : 2026-10-29
- **Branche** : `agent/p35-capacitor-alignment`
- **Priorité** : HAUTE
- **Statut** : **RÉSOLU — build APK debug prouvé localement de bout en bout**

## Cause racine (corrigée)

Le job CI « Android Debug Build » (`android-debug.yml`) échouait à 100 %
(20/20 exécutions). **R90 documentait une cause inexacte** (« CLI 8 génère
`capacitor-cordova-android-plugins` sans `namespace` »). La vérification du
journal de run (`40078162326`, `40805574818`) montre le vrai blocage :

```
A problem occurred configuring project ':capacitor-storage'.
> Namespace not specified. Specify a namespace in the module's build file.
```

Deux défauts **distincts**, tous deux corrigés :

1. **Bloquant réel** — `@capacitor/storage@1.2.5` est **déprécié** (remplacé par
   `@capacitor/preferences`) et son `android/build.gradle` **ne déclare aucun
   `namespace`** (AGP 8 l'exige). Le module `:capacitor-storage` est généré par
   `cap sync` → la configuration Gradle échoue avant même de compiler.
   *Le module `capacitor-cordova-android-plugins`, lui, **avait bien** un
   `namespace` (`capacitor.cordova.android.plugins`) — la cause R90 était donc
   fausse.*
2. **Défaut latent** — désalignement majeur : `@capacitor/cli` en `^8.5.2`
   contre `@capacitor/android`/`core` et **tous** les plugins en `6.x`. Le
   `cap sync` passait malgré tout, mais les workflows de release portaient des
   correctifs de contournement (retrait d'`AGP 8.13.0`, patch `namespace` de
   storage, forçage SDK 34) devenus inutiles et fragiles.

## Versions avant / après

| Paquet | Avant | Après |
|---|---|---|
| `@capacitor/cli` | `^8.5.2` | `^7.6.9` |
| `@capacitor/core` | `^6.2.2` | `^7.6.9` |
| `@capacitor/android` | `^6.2.2` | `^7.6.9` |
| `@capacitor/app` | `^6.0.3` | `^7.1.2` |
| `@capacitor/browser` | `6.0.6` | `^7.0.5` |
| `@capacitor/camera` | `^6.1.0` | `^7.0.5` |
| `@capacitor/keyboard` | `6.0.4` | `^7.0.6` |
| `@capacitor/network` | `^6.0.4` | `^7.0.4` |
| `@capacitor/preferences` | `^6.0.2` | `^7.0.4` |
| `@capacitor/push-notifications` | `^6.0.5` | `^7.0.7` |
| `@capacitor/storage` | `^1.2.5` (**déprécié**) | **supprimé** |
| AGP (`android/build.gradle`) | `8.2.1` | `8.7.2` |
| Gradle wrapper | `8.9` | `8.11.1` |
| `compileSdk` / `targetSdk` | `34` | `35` |
| `minSdk` | `21` | `21` (**conservé**) |

## Pourquoi la majeure 7 (et non 6 ni 8)

- **6.x** : impossible — `@capacitor/cli@6.x` tire `tar@6.2.1`, vulnérable à
  `GHSA-23hp-3jrh-7fpw` (critique). Le job CI « Security Audit »
  (`pnpm audit --audit-level=critical`, `continue-on-error: false`) **échoue**
  (vérifié : `exit 1`). Il faudrait un `override` tar, fragile.
- **8.x** : possible techniquement mais impose **Node ≥ 22** (CLI 8) et une
  double mise à jour majeure (Core/Android 6 → 8), plus large que nécessaire.
- **7.x** : la **plus basse** qui satisfait les trois contraintes à la fois —
  (a) majeure unique pour cli/core/android/plugins, (b) `tar@7.5.22` patché
  (audit vert **sans** override), (c) `minSdk` 21 conservé via
  `rootProject.ext.minSdkVersion` (Capacitor 7 lit la valeur racine si présente,
  défaut 23 sinon).

## Changements

- `src/adapters/native/StorageAdapter.ts` : import `@capacitor/storage` →
  `@capacitor/preferences` (API identique : `get/set/remove/clear/keys`).
  Supprime le seul module sans `namespace` → supprime le blocage.
- `src/adapters/native/__tests__/StorageAdapter.test.ts` : mock reciblé sur
  `@capacitor/preferences` (clé exportée `Preferences`).
- `package.json` + `pnpm-lock.yaml` : alignement 7.x, retrait de storage.
- `android/build.gradle` : AGP `8.7.2`, google-services `4.4.2`.
- `android/variables.gradle` : SDK 35, versions AndroidX alignées Capacitor 7,
  `minSdkVersion = 21` conservé (commenté).
- `android/gradle/wrapper/gradle-wrapper.properties` : Gradle `8.11.1`.
- `.github/workflows/release.yml` + `lumina-android.yml` : les `sed` de
  forçage SDK `34`/`36` retargetés sur `35` (les patches `namespace storage` et
  `AGP 8.13.0` deviennent des no-op inoffensifs : paquet absent, tous les
  plugins 7.x sont en AGP 8.7.2).
- `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle` :
  régénérés par `cap sync` (plus de `:capacitor-storage`, chemins 7.6.9).

## Preuve

Environnement local (Debian 13) : JDK 21 (`temurin` équivalent, paquet
`openjdk-21-jdk-headless`) + Android SDK (platform 35, build-tools 35.0.0)
installés à la main (`sdkmanager`).

```
$ npx cap sync android
✔ Copying web assets from dist to android/app/src/main/assets/public
✔ Updating Android plugins in 12.35ms
[info] Found 7 Capacitor plugins for android: app, browser, camera,
       keyboard, network, preferences, push-notifications
✔ Sync finished in 0.348s

$ cd android && ./gradlew assembleDebug
...
BUILD SUCCESSFUL in 1m 41s
275 actionable tasks: 275 executed

$ ls android/app/build/outputs/apk/debug/
app-debug.apk   (15 076 911 octets)

$ aapt2 dump badging app-debug.apk | head -3
package: name='com.lumina.mfejc' versionCode='10' versionName='1.0.9'
  compileSdkVersion='35'
minSdkVersion:'21'
targetSdkVersion:'35'
```

**Namespace** — vérifié sur tous les modules Gradle : `android/app`
(`com.lumina.mfejc`), `capacitor-cordova-android-plugins`
(`capacitor.cordova.android.plugins`), et les 7 plugins `@capacitor/*`
(`com.capacitorjs.plugins.*`). Plus aucun module sans `namespace`.

**Gates non-régression** :

| Gate | Résultat |
|---|---|
| `npx tsc -b --force --noEmit` | 0 erreur |
| `npx eslint .` | 0 erreur (1752 warnings préexistantes) |
| `npx vite build` | OK |
| `npx vitest run` | **1643/1643** |
| `pnpm audit --audit-level=critical` | `exit 0` |
| `pnpm install --frozen-lockfile` | OK |
| `./gradlew assembleDebug` | **BUILD SUCCESSFUL** + APK |

## Limite honnête

Le build a été prouvé **localement** avec un SDK Android installé à la main.
Il n'a **pas** encore été rejoué par GitHub Actions sur la branche (le job
`android-debug.yml` s'exécutera sur la PR). Aucune conclusion sur les 20 runs
rouges passés n'est tirée d'autre chose que du journal CI + de la reproduction
locale complète.

## Références

- R90 (`docs/agent/RISQUES.md`) — cause racine corrigée par ce receipt.
- P26 / P35 (`docs/agent/PROPOSITIONS.md`).
- GHSA-23hp-3jrh-7fpw (node-tar, critique).
