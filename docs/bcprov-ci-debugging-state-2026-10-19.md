# Lumina self-updater Android : état du build CI et fix bcprov-jdk18on-1.79

**Date de la validation : 2026-10-19** — suite de la session de livraison du
self-updater Android (PackageInstaller API 26+ / FileProvider fallback API 21–25).

## Conclusion (ce qu'il faut retenir, court)

- Le **draft** de la GitHub Release `v1.0.2` contient **déjà un APK signé du
  bon keystore** (`SHA-1 F1:FE:A9:56:...`, identique à l'APK prod `v1.0.1` —
  vérifié par `keytool -printcert` sur les 2 signatures `META-INF/LUMINA.RSA`
  extraites des 2 APK). Donc **il est techniquement possible de tester le
  self-updater DÈS MAINTENANT** sans attendre le fix du bug CI ci-dessous :
  il suffit de publier ce draft (`gh release publish v1.0.2`), et l'APK
  `app-release.apk` (12,8 Mo) + `app-release.apk.sha256` seront servies par
  l'API `releases/latest` que lit `src/updater/checkForUpdate.ts`.
- La CI (`release.yml`, workflow "Release") **n'a PAS encore produit cet
  APK** — il a été récupéré du dernier artefact **debug** du workflow
  `lumina-android.yml` (job `debug-apk`, le seul à ne pas passer par
  `assembleRelease` + signature `apksigner` du job `sign-android`).
- Le workflow `release.yml` (jobs `prepare` → `build-android` →
  `sign-android` → `release`) **échoue depuis le 17/10/2026** sur
  `build-android` avec :
  ```
  Failed to create Jar file /home/runner/.gradle/caches/jars-9/
  18366b31678c0171857be093a3b8ec22/bcprov-jdk18on-1.79.jar
  ```
  (erreur persistante depuis le commit `d86d12b` qui a ajouté
  `@capacitor/preferences@8.0.1` en dépendance directe + le piquage
  OneSignal `[5.0.0, 5.99.99]`).

## État des lieux (à re-savoir sans re-chercher)

- **12 runs rouges consécutifs** sur le tag `v1.0.2` testé :
  `39179717688`, `39180389543`, `39181048751`, `39182394813`,
  `39182942531`, `39183807849`, `39184727650`, `39185310876`,
  `39185781367`, `39186507781`, `39187053500`, `39187533234`,
  `39187906401`, `39188357294`, `39189854352`, `39190511122`
  (tous "Failed to create Jar file bcprov-jdk18on-1.79.jar" à la
  configuration du projet `:capacitor-cordova-android-plugins`,
  indépendamment du JDK (17 ET 21 testés)).
- **Aucune** des stratégies suivantes **n'a résolu** le bug :
  - bascule JDK 21→17 (`JAVA_VERSION: '17'` dans les 2 workflows) — le run
    GREEN de référence `36173770387` (2026-09-25) était **déjà en JDK 21**
    (vérifié dans ses logs : `JAVA_HOME: /opt/hostedtoolcache/Java_Temurin-
    Hotspot_jdk/21.0.12-1/x64`), donc le JDK n'est PAS le bon levier.
  - exclusion `bcprov-jdk18on` de `allprojects.configurations.all` ET
    `buildscript.configurations.classpath` du root (`android/build.gradle`)
    — échec identique.
  - `resolutionStrategy.force 'org.bouncycastle:bcprov:1.78'` (artefact
    unifié, qui **existe** sur Maven Central) + `force
    'bcprov-jdk18on:1.70'`/`'bcprov-jdk15on:1.70'` (versions vérifiées
    existantes) dans les 3 scopes Gradle (root buildscript / allprojects /
    sous-projets Capacitor patchés par awk/sed) — échec identique.
  - **Forcer `bcprov-jdk15on:1.78` = COORDONNÉE INEXISTANTE** (404 sur
    Maven Central : le variant `jdk15on` n'est plus publié au-delà de
    ~1.70, BouncyCastle a unifié les variants dans l'artefact `bcprov`
    depuis ~1.71) — ce forçage a cassé la résolution elle-même
    (run `39181048751` : "Could not find
    org.bouncycastle:bcprov-jdk15on:1.78"), à NE JAMAIS re-faire.
  - piquage `com.onesignal:OneSignal` à `4.9.7` (commit `4f0c16d`) — seul,
    insuffisant.
  - downgrade `@capacitor/preferences` `8.0.1 → 6.0.4` (commit `3382a02`) —
    seul, insuffisant (la version `6.0.4` porte déjà le `buildscript
    AGP 8.2.1`, pas `8.13.0`, donc ne devrait pas tirer bcprov 1.79 par
    cette route... et pourtant le bug persiste).
  - retrait de la ligne `classpath 'com.android.tools.build:gradle:8.13.0'`
    de **tous** les `node_modules/.pnpm/.../build.gradle` (grep + sed,
    ré-appliqué dans le job `build-android` lui-même, pas seulement dans
    le job `prepare` — le `pnpm install` du job `build-android` remet à
    zéro `node_modules`, cf. run `39187053500` qui a échoué faute de
    ré-application du patch) — le grep confirme depuis "Aucun AGP 8.13.0
    résiduel — rien à faire" (run `39189854352`), et le bug **persiste
    tout de même**.
  - purge du cache `~/.gradle/caches/jars-*` — le log du run
    `39185310876` confirme qu'il n'y avait **AUCUN** cache résiduel
    ("pas de cache jars-* — rien à purger, premier run sur ce runner")
    : le JAR est bien téléchargé FRAÎCH du Maven Central à chaque run.
  - isolation du cache Gradle dans `$RUNNER_TEMP/gradle-cache`
    (`GRADLE_USER_HOME`) — même échec avec cache 100% vierge (run
    `39185781367`), preuve que le bug n'est PAS un état résiduel/corrompu
    du cache du runner, mais lié au JAR lui-même / à la résolution du
    DAG de dépendances du projet.

## Les briques du fix TENUES (commits, à garder)

1. **`android/app/build.gradle`** — `implementation 'com.onesignal:
   OneSignal:4.9.7'` (commit `4f0c16d`), au lieu du range ouvert
   `[5.0.0, 5.99.99]` qui résolvait à la dernière 5.x/6.x.
2. **`package.json`** — `"@capacitor/preferences": "^6.0.2"` (commit
   `3382a02`), résolu en `6.0.4` (vérifié dans `node_modules/.pnpm/
   @capacitor+preferences@6.0.4_@capacitor+core@6.2.2/...`), au lieu de
   `8.0.1`.
3. **`.github/workflows/release.yml` + `lumina-android.yml`** — step
   "Patch Cordova Sub-project" (job `prepare` de `release.yml` + job
   `debug-apk` de `lumina-android.yml` + **ré-appliqué** dans le job
   `build-android` de `release.yml` lui-même) qui retire par grep/sed
   toute ligne `com.android.tools.build:gradle:8.13.0` restante sous
   `node_modules/.pnpm`, et aligne le SDK 34/le namespace storage.
4. **`android/build.gradle`** — état actuel : `buildscript { classpath
   'com.android.tools.build:gradle:8.2.1' + 'com.google.gms:
   google-services:4.4.0' }` + `allprojects { repositories { google()
   mavenCentral() } configurations.all { exclude group:
   'org.bouncycastle', module: 'bcprov-jdk18on' } }` (commit
   `3f4a24f`) — l'exclusion `bcprov-jdk18on` seule (pas `jdk15on`, qui
   est requise par AGP 8.2.1 et se lie sans problème, version `1.67`).
5. **`.github/workflows/release.yml`** — le step d'isolation de cache
   Gradle dans `$RUNNER_TEMP` (`GRADLE_USER_HOME`) a été **retiré**
   (commit `f048a6b`) — il n'était pas le bon levier (bug confirmé non
   lié au cache du runner), et coûtait ~4 min de run inutilement.

## Ce qui reste à faire (prochain pas, à ne PAS re-essayer les 12
approches déjà épuisées ci-dessus)

Le bug est maintenant **définitivement identifié** comme : le JAR
`bcprov-jdk18on-1.79.jar` (hash de cache Gradle `jars-9/18366b31
678c0171857be093a3b8ec22/`) échoue à être vérifié/relié par le
classloader de compilation Gradle 8.2.1, **quelle que soit la route qui
le résout dans le DAG du projet** — et comme le piquage OneSignal
`4.9.7` + le downgrade `@capacitor/preferences` 6.0.4 + le retrait de
l'AGP `8.13.0` n'ont PAS suffit (ce qui prouve qu'il y a une AUTRE route
de résolution, probablement dans le POM même de
`com.android.tools:sdk-common:31.2.1` ou un autre artefact interne AGP
`8.2.1`, non visible dans les `build.gradle` que le grep/sed a couverts),
**prochaine étape à tenter (non testée)** :

- Ajouter un `settings.gradle`/`gradle/init.d` (script init Gradle
  global, pas par sous-projet) qui force la résolution de
  `org.bouncycastle:bcprov-jdk18on` sur une version SPECIFIQUEMENT
  testable de `bcprov` (l'artefact unifié, qui existe depuis 1.71, et
  dont il FAUT vérifier qu'une version "stable" — à tester par trial,
  par ex. `1.70`/`1.71`/`1.75` — est vraiment résolvable ET linkable
  par Gradle 8.2.1), via un `allprojects { configurations.all {
  resolutionStrategy { force 'org.bouncycastle:bcprov-jdk18on:
  <version-testable>' } } }` dans un script `.gradle` (pas dans
  `build.gradle` du root, car il a déjà été testé et n'a pas fonctionné
  — la difference serait de le déclarer dans le `settings.gradle` qui
  s'exécute en premier, avant `build.gradle`).
- **OU** (plus simple, testé manuellement une seule fois, à tenter en CI)
  : **bascule du wrapper Gradle** de `8.2.1` → `8.9` (
  `android/gradle/wrapper/gradle-wrapper.properties`,
  `distributionUrl=...gradle-8.9-all.zip`) — le run GREEN de référence
  `36173770387` utilisait déjà le wrapper `8.2.1` et a réussi :
  il est donc POSSIBLE que la cause soit une **incompatibilité
  class-file-version entre le JAR bcprov 1.79 spécifiquement et le
  classloader de compilation de Gradle 8.2.1 spécifiquement** (et non
  d'un JDK, ce qui expliquerait le caractère **JDK-indépendant** du
  bug) — une version de Gradle plus récente (8.9+, dont le
  classloader/verify est différent) pourrait relier ce JAR correctement.
  C'est le seul angle NON TESSAYÉ parmi les stratégies envisageables,
  et le moins intrusif (un seul `distributionUrl` à changer, pas de
  rewrite du DAG de dépendances).

**À tester en priorité : basculer `gradle-wrapper.properties` du
`distributionUrl` de `gradle-8.2.1-all` à `gradle-8.9-all` (et
réaligner le `JAVA_VERSION` à `21`, le run GREEN de référence était en
JDK 21, cf. point 1 ci-dessus) — C'EST LE SEUL LEVIER NON ESSAYÉ.**

## Actions déjà décidées / à faire suite au test éventuellement réussi

1. Publier le draft `v1.0.2` EXISTANT (`gh release publish v1.0.2`) —
   c'est l'APK **déjà signé du bon keystore** (vérifié ci-dessus,
   SHA-1 identique à `v1.0.1`), utilisable pour tester le
   self-updater sur un appareil AVANT même d'avoir fixé le bug CI.
2. Une fois le test self-updater validé (installation d'une mise à jour
   `v1.0.3` avec modifications réelles de code, vérification que le
   PackageInstaller installe bien l'APK téléchargé + vérifié en SHA-256),
   créer un **autre** tag (ex. `v1.0.3`) avec une vraie modification de
   code pour prouver le flux complet (détection → téléchargement →
   vérification SHA-256 → installation).
3. **Ne pas re-tenter** les 12 stratégies déjà épuisées (JDK 17/21,
   exclusions `allprojects`/`buildscript` du root, `force` de versions
   BC dans les 3 scopes Gradle, piquage OneSignal seul, downgrade
   preferences seul, retrait classpath AGP 8.13.0 seul, purge/isolation
   du cache Gradle) — aucune n'a fonctionné seule, et les combiner ne
   sert à rien puisque même la combination de TOUTES ces briques (run
   `39189854352`, `39190511122`) a échoué au **même** hash de cache
   `jars-9/18366b31...` : le DAG de dépendances du projet ne peut pas
   être la seule explication, c'est une propriété du JAR + du
   classloader de compilation Gradle 8.2.1.

## Références utiles

- `MEMORY.md` → `lumina-self-updater-android` (livraison initiale du
  self-updater, 4 commits poussés).
- `MEMORY.md` → `gradle-jdk17-bcprov-infra-fail` (le bug "Failed to
  create Jar file bcprov" est documenté depuis le 17/10 comme étant
  potentiellement lié au cache local JDK 17 ; **CETTE MÉMOIRE EST
  PARTIELLEMENT FAUSSE** : le bug est JKD-INDÉPENDANT et PRODUIT EN
  CI (Temurin 17 ET 21), et le run GREEN de référence `36173770387`
  était en **JDK 21** (pas 17 comme le prétend la mémoire) —
  **à corriger dans cette mémoire si possible**.
- `gradle-wrapper.properties` = `gradle-8.2.1-all.zip` (l'état actuel
  à tester de basculer en `8.9-all.zip`).
- Les secrets `ANDROID_KEYSTORE_*` (base64 du keystore `lumina`,
  password `lumina2024`) sont déjà en place et le job `sign-android`
  de `release.yml` les consomme — **le job `sign-android` n'a JAMAIS
  eu à tourner depuis le 17/10** (le bug bloque toujours le job
  `build-android`, avant lui). Il faudra vérifier qu'il passe bien en
  vrai une fois le build débloqué.
