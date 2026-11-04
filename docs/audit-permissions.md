# Audit permissions Android — constat statique (A0) et décisions

> Compagnon de `docs/lumina-ionic-capacitor-permissions.md` (l'audit).
> Ce document est la **partie statique de la phase A0** : contre-vérification
> des affirmations de l'audit sur le code au commit `0ca588e` (après PR #403),
> le 2026-11-04. **Rien n'a été exécuté sur appareil** (ni SDK ni téléphone
> dans l'environnement de l'agent) — la checklist appareil en §4 reste à
> remplir par Joy ; c'est elle qui fermera la porte A0 et validera A2.

## 1. Vérification des affirmations (sur `0ca588e`)

**Confirmé tel quel**

- `allowBackup="true"` sans règles d'exclusion (C-07a) ; `USE_FULL_SCREEN_INTENT`
  (P-03), `POST_NOTIFICATIONS`, `REQUEST_INSTALL_PACKAGES` déclarées ; aucun
  `SCHEDULE_EXACT_ALARM`.
- `capacitor.config.ts` configure `plugins.SplashScreen` et `plugins.OneSignal`
  alors que **ni l'un ni l'autre n'est dans `package.json`** (C-01) ;
  `loggingBehavior:'none'` et `webContentsDebuggingEnabled:false` pour tous
  les builds (C-05) ; aucune config `Keyboard` (C-10).
- Plugins `status-bar`, `splash-screen`, `haptics`, `device` absents (C-02/03/04).
- OneSignal : SDK natif `com.onesignal:OneSignal:4.8.12` dans Gradle
  (commentaire « 4.9.7 »), **aucune classe `Application`** → jamais
  initialisé ; façade JS `capabilities/notification` → `lib/onesignal.ts` ;
  **aucun `PushNotifications.register()`** dans le code (C-06).
- Seul appel interface à `requestPermission()` : `SettingsNotifications.tsx:128` (P-01).
- `Camera.requestPermissions({permissions:['camera']})` à `CameraScanner.tsx:76` (P-02).
- `StorageAdapter` : 5 replis silencieux `catch → localStorage`, zéro journalisation (C-11).
- `mode:"ios"` forcé (`App.tsx`) ; 0 hook `useIon*` ; insets bas compensés **à la
  fois** nativement (`MainActivity`, padding WebView) et en CSS
  (`env(safe-area-inset-bottom)` dans `BottomNav`) → double compensation possible (C-09).

**Nuancé / corrigé**

- `IonInfiniteScroll` : l'audit dit 0 — en réalité **4 usages** (dont `/finance`).
- P-05 (canal) : déjà partiellement traité — le chemin local crée son canal
  (importance 4) juste avant chaque `schedule` (`scheduleLocalNotification`).
  Reste à le garantir systématiquement en A2.
- P-01 : `onesignal.ts` contient un pont `createCapacitorPlugin()` dont
  l'efficacité réelle n'est pas tranchable statiquement → §4.2 tranchera.
- Splash : le thème natif Android 12 (`Theme.SplashScreen` + `@drawable/splash`)
  existe déjà ; le bloc de config purgé en A1 n'avait aucun effet.
- Écarts de comptage immatériels : `IonItem` 77 (audit 69), `<button>` 392 (393),
  `lucide-react` 108 fichiers (107), `IonToolbar` 32 (31).

## 2. Compteurs Ionic rejoués (balises JSX hors tests)

| Composant | Audit | Mesuré | | Composant | Audit | Mesuré |
|---|---|---|---|---|---|---|
| IonPage | 99 | 99 | | IonRefresher | 0 | 0 |
| IonContent | 95 | 95 | | IonModal | 0 | 0 |
| IonHeader/Toolbar/Title | 32/31/33 | 32/32/33 | | IonActionSheet/Popover | 0 | 0 |
| IonBackButton | 26 | 26 | | IonItemSliding | 0 | 0 |
| IonItem | 69 | 77 | | IonDatetime | 0 | 0 |
| IonButton | 60 | 60 | | IonSegment/Toggle/Radio | 0 | 0 |
| `<button>` HTML | 393 | 392 | | IonSkeletonText | 0 | 0 |
| IonInput/Textarea | 88/13 | 88/13 | | IonSearchbar | 1 | 1 |
| IonSelect (+Option) | 56 (113) | 56 (113) | | IonTabs/TabBar/Fab/Icon | 0 | 0 |
| Hooks `useIon*` | 0 | 0 | | IonInfiniteScroll | 0 | **4** |

Méthode : `grep -rhoP '<Composant\b' src --include='*.tsx'` hors `__tests__`
et `*.test.tsx`. Le diagnostic §3 de l'audit est donc confirmé : Ionic sert de
coque de pages, l'interface est construite en Tailwind/HTML.

## 3. Décisions (Joy, 2026-11-04)

| Sujet | Décision | Conséquence |
|---|---|---|
| Périmètre session | **Phases A1 + A2**, une PR par phase | A3→A8 ultérieures |
| Distribution | **APK directs** (hors store) | `REQUEST_INSTALL_PACKAGES` conservée ; SHA-256 de l'APK rendu **obligatoire** dès A1 (§1.5 « traiter proprement ») |
| Pile notifications | **OneSignal corrigé** (option A de N-04) | A2 : branchement réel. ⚠️ Vigilance : le plugin officiel embarque le SDK 5.x dont la dépendance `bcprov-jdk18on:1.79` a déjà cassé le build (voir le commentaire dans `build.gradle`, SDK pinté 4.8.12) — voie officielle tentée, build CI arbitre, repli = pont local sur le SDK 4.8.12 éprouvé |
| Mode Ionic | **Par plateforme** (`md` Android) | Acté pour A5, hors périmètre A1/A2 |
| Verrou d'application | **Reporté** | A4 réduite à sauvegarde/stockage le jour venu ; `allowBackup` traité dès A1 |

Sans question car sans ambiguïté : retrait de `USE_FULL_SCREEN_INTENT`
(inutilisée), verrouillage d'`allowBackup` (P0, données financières), jamais
de `READ/WRITE_EXTERNAL_STORAGE`, aucune demande de permission au démarrage à froid.

## 4. Checklist appareil — à remplir par Joy (ferme A0, valide A2)

Sur Android 13+ de préférence (idéalement aussi 12/14/15), APK **après** la PR A2 :

- [ ] **4.1** `adb shell dumpsys package com.lumina.mfejc | grep -A40 "requested permissions"`
      → permissions déclarées = matrice §1.2 ; `POST_NOTIFICATIONS` : `granted=false` avant la demande, `true` après accord. Résultat : …
- [ ] **4.2** Réglages › Notifications : activer → une **fenêtre système** apparaît après
      l'écran d'explication ; refus → l'état affiché reste cohérent ; double refus →
      l'action devient « Ouvrir les réglages ». Résultat : …
- [ ] **4.3** Photo de preuve (scan) : **aucune** fenêtre de permission ne doit apparaître. Résultat : …
- [ ] **4.4** Export : l'écran de partage Android s'ouvre. Résultat : …
- [ ] **4.5** Barre d'état en thème clair : icônes lisibles ? Résultat : …
- [ ] **4.6** Notification de test (rappel local + push) reçue, app fermée puis ouverte. Résultat : …
- [ ] **4.7** `adb backup` / sauvegarde Google : aucune donnée d'application récupérable
      (`allowBackup="false"`). Résultat : …

## 5. Porte de sortie A1 (cette PR)

- Build Android propre (validé par la CI : Build Application + Build Debug APK —
  pas de SDK dans l'environnement de l'agent).
- Liste de permissions verrouillée par `src/lib/__tests__/android-permissions-matrix.test.ts`.
- Auto-mise à jour : `checkForUpdate` ne propose rien sans empreinte
  (`checkForUpdate-sha256.test.ts`) et le natif rejette sans elle.
