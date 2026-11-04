# Lumina — Ionic, Capacitor et permissions Android

> **Statut** : audit de référence, re-mesuré et amendé le 3 novembre 2026 (commit `f29ebf5`, après la PR #402).
> **Règle de lecture** : chaque chiffre de ce document a été **rejoué** sur ce commit (§2 et §7). Les écarts avec les chiffres d'une première version de l'audit sont documentés en §7.3 (`IonButton`, `<button>`, `IonSearchbar`/`IonInfiniteScroll`/`IonAlert`/`IonSelect`).
> **Légende** : **[Constaté]** lu dans le code de ce dépôt ; **[Hypothèse]** à confirmer sur appareil ; **[Avis]** recommandation de conception, à valider par Joy.
> **Rien n'a été exécuté sur appareil** dans le cadre de cet audit : les permissions Android, les notifications et les retours haptiques ne peuvent être prouvés que par la procédure §8.
> Documents liés : `lumina-bugs-backend-et-logique-metier.md` (notifications N-01…N-10), `lumina-design-system.md` (dont **F-17 = comptes & sessions**, voir §5.2), `ionic-migration.md` (historique de la migration Ionic).

---

## 0. Verdict (résumé exécutable)

1. **Permissions** : l'absence de demande à l'installation est **normale** sur Android ≥ 6 (§1.1). Le vrai défaut est que Lumina ne déclenche **jamais** de demande de notifications par un chemin qui fonctionne : le pont OneSignal « natif » construit à la main dans `src/lib/onesignal.ts` appelle des méthodes qui **n'existent pas** sur le pont Capacitor (`nativeCallback`, `callbackFromNative`) — le seul chemin de demande de permission de l'application est donc **inopérant**, et les erreurs sont **avalées** (§1.3, P-01).
2. **Ionic est sous-exploité** : 61 fichiers utilisent `IonPage`/`IonContent`, mais l'interface est bâtie en Tailwind + HTML brut (**399** `<button>` bruts contre **60** `IonButton`, dont **51** dans les pages ; **117** fichiers importent `lucide-react` ; **0** `IonIcon`). Les composants qui portent la sensation « native » sont absents : `IonModal`, `IonActionSheet`, `IonToast`, `IonRefresher`, `IonItemSliding`, `IonSegment`, `IonToggle`, `IonSkeletonText`, `IonDatetime` = **0 usage**. Les hooks de cycle de vie de vue (`useIonViewWillEnter` & co.) = **0 usage** alors que 61 pages sont montées dans une pile Ionic gardée en mémoire (§2, §3).
3. **Capacitor est installé mais ni exploité ni durci** : `status-bar`, `splash-screen`, `haptics` **absents** ; `capacitor.config.ts` configure un plugin `SplashScreen` **non installé** et une section `OneSignal` **morte** ; `allowBackup="true"` sans règles d'exclusion sur une base de données financières ; aucune stratégie de verrouillage ni de stockage sécurisé (§4).

La correction n'est **pas** une refonte : c'est une adoption progressive, écran par écran, avec la règle « **Ionic d'abord** ».

---

## 1. Permissions Android

### 1.1 Comment Android gère les permissions (pour lever le malentendu)

- Depuis **Android 6 (API 23)**, les permissions « dangereuses » ne sont **plus demandées à l'installation** : elles le sont **à l'exécution**, dans une fenêtre système, **seulement si le code les demande**. Les permissions « normales » (Internet, vibration, `RECEIVE_BOOT_COMPLETED`…) sont accordées silencieusement.
- Depuis **Android 13 (API 33)**, `POST_NOTIFICATIONS` est une permission d'exécution : sans appel explicite à `requestPermissions()`, **aucune fenêtre n'apparaît** et les notifications sont **bloquées par défaut** pour une installation neuve.
- Depuis **Android 12 (API 31)**, les alarmes exactes (`SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`) sont restreintes ; le plugin `@capacitor/local-notifications` **dégrade automatiquement** en alarme non exacte quand `canScheduleExactAlarms()` est faux (vérifié dans `LocalNotificationManager.setExactIfPossible`, §1.2) — un rappel reste donc livré, à quelques minutes près.
- Ce que Joy a constaté (« rien n'est demandé à l'installation ») est donc **le comportement normal**. Ce qui est anormal : **rien ne les demande ensuite non plus**, et le seul chemin qui essaie de le faire est cassé (§1.3).

### 1.2 Matrice : ce que Lumina fait, déclare et demande (re-mesurée sur `f29ebf5`)

| Fonction | Permission réellement nécessaire ? | Déclarée dans `AndroidManifest.xml` ? | Demandée par le code ? | Verdict |
|---|---|---|---|---|
| **Notifications** (alertes de dépense, rappels) | **Oui** : `POST_NOTIFICATIONS` (Android 13+) | Oui (`l.101` déclarée ; `l.22` `tools:overrideLibrary`) | Uniquement `SettingsNotifications.tsx` → `notification.requestPermission()` → `OneSignalService.requestPermission()` → pont manuel **inexistant** (§1.3) | **À corriger (P0)** |
| **Caméra** (preuve, scan : `CameraScanner.tsx`) | **Non** : `@capacitor/camera` ouvre l'application caméra du système ; son README indique « requires no permissions » sauf `saveToGallery` | Non | Oui : `Camera.requestPermissions({ permissions: ['camera'] })` (`CameraScanner.tsx:76`) | Appel **inutile et risqué** (P-02) : à retirer |
| **Galerie / photos** | **Non** (Photo Picker système) | Non | — | Rien à demander |
| **Stockage (fichiers, exports)** | **Non** : cache applicatif + partage via `FileProvider` (`file_paths.xml` présent) | Non | — | **Ne pas** ajouter `READ/WRITE_EXTERNAL_STORAGE` |
| **Alarmes exactes** | **Non** : les rappels fonctionnent en mode non exact (dégradation automatique du plugin, vérifiée ci-dessous) | Non | — | **Aucune permission à ajouter** ; ne pas demander `SCHEDULE_EXACT_ALARM` pour des rappels de rapport |
| **Plein écran sur verrouillage** | **Non** (application de gestion, pas d'appel/alarme) | **Oui** : `USE_FULL_SCREEN_INTENT` (`l.81`) | Aucun usage | **Retirer** (restreinte Android 14+, risque de refus Play) — P-03 |
| **Installation d'APK** (auto-mise à jour) | Seulement si distribution hors Play Store | **Oui** : `REQUEST_INSTALL_PACKAGES` (`l.87`) | `ApkUpdaterPlugin` (`canInstall`, `openInstallSettings`) | **Décision de distribution** (§1.5) |
| **Démarrage système** | Oui, pour restaurer les rappels après redémarrage | Oui (`RECEIVE_BOOT_COMPLETED`, `l.80`) | Fourni par `@capacitor/local-notifications` | OK |
| **Vibration / haptique** | Non (permission normale) | Oui (`VIBRATE`, `l.83`) | Aucun appel `Haptics` (plugin absent) | OK ; à exploiter en phase A3 |
| **Biométrie / verrouillage** (futur) | `USE_BIOMETRIC` (« normale », sans fenêtre) | Non | — | Voir §4 (C-07) |

Détail vérifié dans les sources des plugins installés (`node_modules/@capacitor/*`) :

- `@capacitor/push-notifications` (`PushNotificationsPlugin.java`) : `checkPermissions()` renvoie `receive: "granted"` **en dessous d'Android 13**, et `requestPermissions()` renvoie `granted` sans fenêtre si la permission est déjà accordée. C'est le **seul** chemin de demande valide pour `POST_NOTIFICATIONS` disponible dans les dépendances actuelles.
- `@capacitor/local-notifications` (`LocalNotificationsPlugin.load()`) : le plugin **crée déjà** un canal `"default"` à son chargement ; un canal `lumina-default` (importance haute) reste nécessaire pour les notifications Lumina elles-mêmes, mais l'absence de canal n'est pas la cause d'une notification muette (correction de l'hypothèse P-05, voir §1.3).
- `@capacitor/local-notifications` (`LocalNotificationManager.setExactIfPossible`) : si `canScheduleExactAlarms()` est faux, le plugin **planifie quand même** en alarme non exacte et journalise un avertissement. **Aucune permission d'alarme exacte n'est donc justifiée** (P-04 devient « à documenter », pas « à corriger »).

### 1.3 Bugs et corrections liés

| ID | P | Constat (fichier:ligne) | Correctif |
|---|---|---|---|
| **P-01** | **P0** | Le pont OneSignal natif est **faux** : `src/lib/onesignal.ts:145-180` appelle `capacitor.nativeCallback(...)` et `capacitor.plugin.callbackFromNative(...)`. Sur le pont Capacitor, le premier n'existe **pas** sur `Capacitor` (l'API interne est `Capacitor.nativePromise` / `nativeCallback` sur `Plugins`, pas d'objet global), et `Capacitor.Plugins` a été remplacé par `registerPlugin` en Capacitor 3+. `initialize()` est aussi synchrone et ne lève jamais ; `requestPermission()` (`l.481`) capture **toutes** les erreurs et renvoie `false`. Résultat : sur Android, le toggle de `SettingsNotifications.tsx` **n'ouvre aucune fenêtre système** et affiche un échec silencieux (N-01/N-03). | **La demande de permission ne passe plus par OneSignal** : elle passe par `PermissionService` (§1.4) qui utilise `@capacitor/push-notifications` (présent et fonctionnel). |
| **P-02** | P1 | `CameraScanner.tsx:76` demande la permission `camera` alors que le manifeste ne la déclare pas et que `Camera.getPhoto` (source `Camera`) n'en a pas besoin. Sur certains appareils, demander une permission non déclarée renvoie `denied` et **bloque le scan** **[Hypothèse]**. | Supprimer l'appel ; gérer l'annulation (`getPhoto` → `"User cancelled photos app"`) sans erreur affichée. |
| **P-03** | P1 | `USE_FULL_SCREEN_INTENT` déclarée sans usage. | Retirer du manifeste. |
| **P-04** | P2 (reclassé) | Alarmes exactes : **pas un bug** — le plugin dégrade en alarme non exacte (§1.2). **[Constaté dans les sources du plugin]** | Ne rien déclarer ; documenter que les rappels peuvent dériver de quelques minutes. Un rappel « à la minute » exigerait `SCHEDULE_EXACT_ALARM` + parcours de réglage dédié : **hors périmètre**. |
| **P-05** | P2 (reclassé) | Canal de notification : le plugin `local-notifications` crée `"default"` au chargement, et `notification.scheduleLocalNotification` crée `lumina-default` avant chaque envoi. Le manque de canal **avant le premier envoi** n'est donc pas la cause d'un silence. | Créer `lumina-default` **au démarrage** (idempotent) pour que la chaîne soit prête avant tout envoi poussé par le serveur. Voir A2. |

### 1.4 Conception cible : un seul service de permissions

Créer `src/lib/permissions/` (implémenté en phase A2) :

```ts
export type PermissionName = "notifications" | "camera" | "exactAlarm";
export type PermissionStatus = "granted" | "denied" | "blocked" | "prompt" | "unavailable";

check(name): Promise<PermissionStatus>
request(name): Promise<PermissionStatus>    // appelle le plugin Capacitor adapté
openAppSettings(): Promise<void>            // réglages Android de l'application
shouldAsk(name): Promise<boolean>           // politique anti-harcèlement (Preferences)
recordDenial(name): Promise<void>
```

Règles de conception :

1. **Une demande système n'est lancée qu'après un écran d'explication** (`PermissionPrimer`) ; **jamais au démarrage à froid**.
2. Après un refus définitif (Android ne réaffiche plus la fenêtre), l'état est `blocked` : l'interface propose **« Ouvrir les réglages »**.
3. **Android < 13** : `check("notifications")` renvoie `granted` (pas de permission d'exécution) ;
4. Le service **ne lève jamais d'exception silencieuse** : il renvoie un statut typé et journalise les erreurs inattendues via `reportError` (`src/lib/observability/errorReporter.ts`).
5. Le service s'appuie sur **la pile de notifications retenue** (N-04). **Recommandation [Avis]** : `@capacitor/push-notifications` (déjà installé, déjà utilisé par `NotificationAdapter`) + un envoi cloud côté edge function ; **ne pas** réparer le pont OneSignal manuel de `onesignal.ts` (P-01) : c'est du code mort qui simule une API inexistante.
6. **Moment de la demande** [Avis] : après la **première transaction enregistrée** (la valeur est alors évidente), une fois par appareil, avec « Plus tard » qui repousse de 7 jours. Réglages › Notifications affiche **toujours** l'état réel (Activées / Désactivées / Bloquées dans Android) et l'action adaptée.

**Ouverture des réglages Android** : **ne pas** ajouter de plugin (`capacitor-native-settings` n'est pas installé et sa compatibilité Capacitor 7 n'est pas garantie). Deux options vérifiées :

- `@capacitor/app` (installé) ne fournit **pas** `openUrl`, seulement `getInfo`, `getState`, `getLaunchUrl`, `minimizeApp`, `exitApp`, `toggleBackButtonHandler` ;
- donc : soit une **méthode native ajoutée à `ApkUpdaterPlugin`** (`openAppSettings()` → `Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, package:…)`, déjà utilisée dans ce plugin pour `ACTION_MANAGE_UNKNOWN_APP_SOURCES`), soit un petit plugin dédié. **Recommandation** : méthode native dédiée (aucune dépendance nouvelle), **sans** toucher aux permissions.

### 1.5 Décision de distribution (Joy)

- **Play Store** : retirer l'auto-mise à jour par APK (`REQUEST_INSTALL_PACKAGES`, `ApkUpdaterPlugin`, `src/updater/`) ; les mises à jour passent par le store.
- **Hors store** (usage actuel, APK directs) : conserver l'auto-mise à jour, mais traiter proprement « Installer des applications inconnues » (autorisation spéciale, explication, `openInstallSettings()` déjà présent) et **vérifier la signature** de l'APK téléchargé (le SHA-256 est déjà récupéré depuis `<asset>.sha256`, `src/updater/checkForUpdate.ts`).

Cette décision conditionne le manifeste, la politique de confidentialité et les règles d'approbation Play. **Tant qu'elle n'est pas tranchée, la phase A1 ne supprime pas `REQUEST_INSTALL_PACKAGES`.**

---

## 2. Mesures rejouées sur `f29ebf5` (méthode)

Commande de référence (balises multi-lignes) :

```bash
for c in IonPage IonButton IonSelect IonAlert …; do
  printf '%s tags=%s files=%s\n' "$c" \
    "$(grep -rhoP "<$c\b" src --include=*.tsx --include=*.ts | wc -l)" \
    "$(grep -rlP "<$c\b" src --include=*.tsx --include=*.ts | wc -l)"
done
```

| Composant / balise | Balises | Fichiers | Commentaire |
|---|---|---|---|
| `IonPage` | 100 | 61 | coquille de page |
| `IonContent` | 95 | 61 | |
| `IonHeader` / `IonToolbar` / `IonTitle` | 32 / 32 / 33 | 20 / 20 / 20 | |
| `IonBackButton` | 26 | 15 | |
| `IonItem` | 77 | 27 | |
| `IonInput` / `IonTextarea` | 88 / 13 | 36 / 11 | |
| `IonSelect` / `IonSelectOption` | 56 / 113 | 26 / 26 | Le comptage naïf de `IonSelect` (169) additionnait les `IonSelectOption` : **confirmé**, la bonne valeur est **56**. |
| `IonButton` | 60 (pages : 51) | 13 | **Correction** : la valeur 14 d'un premier passage était un artefact de recherche (`grep -rhoP "<IonButton[\s>]"` ne matchait pas `\n` après le nom dans `ConfirmModal.tsx`). La bonne valeur, recoupée par `grep -c`, est **60**. |
| `<button>` HTML brut | 399 (pages : 316) | — | 6,6 × plus de boutons bruts que d'`IonButton`. |
| `<input>` HTML brut | 33 | — | en plus des 88 `IonInput`. |
| fichiers `lucide-react` | — | 117 | `IonIcon` : **0**. |
| `IonAlert` | 2 | 2 | **Correction** : `InvitationEmit.tsx` (l.504) et `updater/UpdateDialog.tsx` (l.30). « 0 usage » était faux. |
| `IonSearchbar` | 1 | 1 | **Correction** : 1 usage (pas 0). |
| `IonInfiniteScroll` | 4 | 4 | **Correction** : 4 usages (pas 0). |
| `IonCheckbox` | 2 | 2 | |
| `IonModal`, `IonActionSheet`, `IonToast`, `IonRefresher`, `IonItemSliding`, `IonDatetime`, `IonToggle`, `IonRadio`, `IonSegment`, `IonSkeletonText`, `IonFab`, `IonTabs`/`IonTabBar`, `IonIcon` | **0** | 0 | confirmé |
| hooks `useIonRouter`, `useIonViewWillEnter`, `useIonViewDidEnter`, `useIonToast`, `useIonAlert`, `useIonActionSheet`, `useIonModal`, `useIonLoading` | **0** | 0 | confirmé |

### 2.1 Choix structurants constatés

- **`setupIonicReact({ mode: "ios", … })`** (`src/App.tsx:62-66`) : le mode **iOS est forcé sur Android** (transitions et contrôles iOS sur une application livrée sur Android). Voir §3.3 pour la recommandation `md`.
- **Pas de `IonTabs`** : la barre d'onglets est maison (`src/components/BottomNav.tsx`) → **pas de pile de navigation indépendante par onglet**.
- **Zéro hook de cycle de vie de vue** alors qu'Ionic **garde les pages précédentes montées**. Les hooks de données (`useTransactions`, `useEvents`…) sont réactifs (PowerSync), donc le risque est moindre qu'annoncé, mais les **effets locaux d'une page** (état de formulaire, focus, brouillons, `useEffect` de chargement ponctuel) ne sont pas rejoués au retour **[Hypothèse]** : à vérifier en A5.
- **Thème** : surcharges Tailwind/CSS (`src/ionic/theme.css`) **plus** une couche JS (`src/ionic/theme.ts` : `applyIonicThemeMode`) qui pose `--ion-*` en `:root` ; les composants utilisent des `style={{ backgroundColor: "var(--…)" }}` inline (ex. `TopHeader`). C'est une **double source** de vérité (CSS + JS + inline) — voir §3.3.
- **Insets** : double compensation réelle — `MainActivity.applySystemBarInsetsToWebView()` applique **déjà** l'inset bas à la WebView, **et** `BottomNav.tsx:232` ajoute `env(safe-area-inset-bottom)` en CSS (C-09, non hypothétique).

---

## 3. Ionic : ce qui est utilisé, ce qui ne l'est pas

### 3.1 Pourquoi le résultat ne donne pas « la joie d'Ionic » [Avis, étayé]

L'interface a été assemblée en **Tailwind + HTML**, Ionic servant de **conteneur de pages**. Résultat : application fonctionnelle, mais sans ce qui fait la valeur d'Ionic — sensation tactile, gestes, feuilles contextuelles, retour immédiat, accessibilité intégrée (les 399 `<button>` bruts n'ont pas la gestion de focus/ARIA des composants Ionic).

### 3.2 Plan d'adoption — règle « **Ionic d'abord** »

Avant tout composant maison : vérifier s'il existe en Ionic. Tailwind sert à la **mise en page** (espacements, grilles), **pas** à reconstruire des contrôles. Toute exception est documentée dans `docs/ui-exceptions.md`.

| Besoin Lumina | Composant Ionic | Remplace / apporte | Écrans prioritaires |
|---|---|---|---|
| Rafraîchir / forcer une synchronisation | `IonRefresher` | tirer pour synchroniser (état réel PowerSync) | Dashboard, Finance, Membres, Historique |
| Sélecteurs (catégorie, caisse, source, événement) | `IonModal` en feuille (`breakpoints`, `initialBreakpoint`) + liste | `SelectField` maison (corrige F-02 à la racine) | Nouvelle transaction, Rapports |
| Date | `IonDatetime` / `IonDatetimeButton` dans `IonModal` | `DatePicker`/`DateField` | Formulaires |
| Actions sur une ligne | `IonItemSliding` + `IonActionSheet` | boutons cachés dans le détail | Historique, Finance |
| Confirmation destructive | `IonAlert` / `useIonAlert` | `window.confirm`, `ConfirmModal` maison | suppression, rejet |
| Retour d'information | `useIonToast` + haptique | toasts maison | exports, formulaires |
| Chargement | `IonSkeletonText` | spinners nus (`LogoSpinner`, `Shimmer`) | listes, dashboard |
| Entrée/Sortie, filtres | `IonSegment` | boutons maison (`SegmentedTabs`) | Nouvelle transaction, Finance |
| Recherche | `IonSearchbar` | champs maison | Membres, Historique |
| Interrupteurs | `IonToggle` | cases maison (`role="switch"` + `<button>`) | Réglages |
| Longues listes | `IonInfiniteScroll` / virtualisation | rendu complet de la liste | Historique |
| Actualisation au retour | `useIonViewWillEnter` | effets non rejoués | toutes les pages à état local |
| Onglets avec pile par onglet | `IonTabs`/`IonTabBar` | `BottomNav` maison | **à évaluer** (A8) |

### 3.3 Décisions à trancher

- **Mode iOS/Material** [Avis] : sur Android, utiliser le **mode `md`** (ondulation, transitions attendues) et laisser `ios` à iOS. Aujourd'hui `ios` est **forcé** — ce doit être un choix assumé, pas un défaut. **À trancher par Joy après essai.**
- **Thème** [Avis] : s'appuyer sur les **variables `--ion-*`** alimentées par les tokens, et **supprimer** les `style={{ backgroundColor: "var(--…)" }}` inline sur les composants Ionic (double source). Migration progressive avec le reste.
- **`IonIcon`** : remplacer `lucide-react` **page par page** pendant les migrations A5–A7 (ne pas faire un lot global : c'est un changement visuel massif).

---

## 4. Capacitor : configuration et exploitation

**[Constaté]** Plugins installés (Capacitor 7, `targetSdk 35`, `minSdk 21`) : `app`, `browser`, `camera`, `filesystem`, `keyboard`, `local-notifications`, `network`, `preferences`, `push-notifications`, `share`. **Absents** : `status-bar`, `splash-screen`, `haptics`, `device`. Aucune biométrie ni stockage sécurisé.

| ID | P | Constat | Correctif |
|---|---|---|---|
| **C-01** | P1 | `capacitor.config.ts` configure `plugins.SplashScreen` **et** `plugins.OneSignal` : ni l'un ni l'autre n'est installé → configuration **ignorée**. Remarque : l'écran de démarrage natif fonctionne déjà via `androidx.core:core-splashscreen` (`app/build.gradle:67`, `styles.xml` `AppTheme.NoActionBarLaunch` parent `Theme.SplashScreen`) — l'ajout du plugin n'est donc **pas** la seule option. | **Sans nouvelle dépendance** (recommandé) : retirer la section `SplashScreen` et la section `OneSignal` de la config, garder l'écran natif Android 12+ ; **ou** installer `@capacitor/splash-screen` si un contrôle JS du splash est nécessaire. |
| **C-02** | P1 | Pas de `@capacitor/status-bar` : couleur/style des icônes non pilotés par le thème. En `targetSdk 35` + edge-to-edge, des icônes blanches sur fond clair peuvent devenir illisibles **[Probable]**. | Installer ; styler selon `[data-theme]` (`Style.Dark`/`Light`) ; coordonner avec C-09. |
| **C-03** | P2 | Pas de `@capacitor/haptics` : aucune sensation tactile à l'enregistrement, à l'erreur, au balayage. `VIBRATE` est déjà déclarée. | Installer ; `Haptics.notification()` sur succès/erreur d'enregistrement, `impact` léger sur actions principales. |
| **C-04** | P2 | Pas de `@capacitor/device` : contexte appareil absent des rapports d'erreur. | Optionnel : modèle, version Android, langue dans les événements Sentry. |
| **C-05** | P1 | `loggingBehavior: 'none'` et `webContentsDebuggingEnabled: false` pour **tous** les builds → diagnostic impossible sur appareil. | Variante « diagnostic » pilotée par variables d'environnement lues dans `capacitor.config.ts` (`CAP_DIAG=1`) ; release inchangée. |
| **C-06** | P1 | OneSignal natif présent dans Gradle (`resValue onesignal_app_id`, `app/build.gradle:21`) alors que le pont JS ne fonctionne pas (P-01) et que le SDK n'est jamais initialisé. État « entre-deux » **constaté**. | Trancher N-04 : soit pile `push-notifications` + FCM (recommandé), soit intégration OneSignal **officielle** par plugin Capacitor — jamais le pont manuel. |
| **C-07** | **P0 sécurité** | `allowBackup="true"` (`AndroidManifest.xml:13`) **sans règles d'exclusion** : base SQLite locale (données financières) et `Preferences` peuvent partir en sauvegarde Google / `adb backup`. Jetons de session dans `localStorage`/`Preferences` (non chiffrés). Aucun verrouillage. | (a) `allowBackup="false"` **ou** `dataExtractionRules`/`fullBackupContent` excluant base, `Preferences`, `localStorage` ; (b) **verrou d'application** (PIN et/ou biométrie) au retour au premier plan après N minutes — plugin biométrique compatible Capacitor 7 **[À vérifier]** ; (c) chiffrement de la base locale (SQLite chiffrée) et stockage de jetons via Android Keystore **[Incertain : compatibilité PowerSync à vérifier]**. |
| **C-08** | P2 | `USE_FULL_SCREEN_INTENT` (P-03) ; `REQUEST_INSTALL_PACKAGES` (§1.5). | Selon décisions. |
| **C-09** | P1 | **Double compensation des insets**, constatée : `MainActivity.applySystemBarInsetsToWebView()` pose déjà l'inset bas (et latéral) en padding de la WebView, **et** `BottomNav.tsx:232` ajoute `padding-bottom: calc(env(safe-area-inset-bottom) + 8px)`. Sur un appareil gestuel, 2 × inset ≈ 48 px de vide ; en 3 boutons, l'espace est correct par hasard. | **Une seule source** : garder le natif pour le bas (retirer `env()` du `BottomNav` et des utilitaires `.pb-safe*` utilisés sous la nav), garder le CSS pour le haut (`--ion-safe-area-top`). Tester les deux modes de navigation et le clavier ouvert. |
| **C-10** | P2 | `useKeyboardAvoidance` (37 fichiers) + `keyboardFillMode: "overlap"` dans `setupIonicReact` ; **aucune** section `Keyboard` dans `capacitor.config.ts`. | Choisir **une** stratégie : `Keyboard.resize: "none"` + `keyboardFillMode: "overlap"` (statu quo testé), ou `resize: "native"` + suppression du hook. Tester le formulaire de transaction clavier ouvert. |
| **C-11** | P2 | `StorageAdapter` (Preferences) a un repli **silencieux** vers `localStorage` (`catch` → `localStorage`) dans `get`/`set`/`keys`. | Journaliser le repli (`console.warn` + `reportError`) sans changer le comportement. |

---

## 5. Plan de correction phasé (une PR par phase, porte de sortie)

| Phase | Contenu | Porte de sortie |
|---|---|---|
| **A0 — Constat sur appareil** | Android 12/13/14/15 propres : `adb shell dumpsys package com.lumina.mfejc`, tentative d'activation des notifications, `logcat` filtré (`Capacitor`, `OneSignal`, `LocalNotification`, `PushNotifications`) ; captures d'écran ; rejouer les compteurs §2 | `docs/audit-permissions.md` avec résultats **par version d'Android** |
| **A1 — Manifeste et configuration** | Retirer `USE_FULL_SCREEN_INTENT` (P-03) ; décision §1.5 ; `allowBackup` (C-07a) ; nettoyer la config des plugins absents (C-01) ; variante diagnostic (C-05) | Build Android propre ; liste des permissions conforme à §1.2 ; aucun plugin configuré sans être installé |
| **A2 — Permissions + notifications** | `PermissionService` (§1.4), `PermissionPrimer`, pile unique (`push-notifications`), canal `lumina-default` au démarrage (P-05), retrait de la demande caméra (P-02), arrêt du pont OneSignal mort (P-01) | **Test manuel** Android 13/14/15 : explication → fenêtre système → accord → notification reçue ; refus puis blocage → « Ouvrir les réglages » |
| **A3 — Plugins Capacitor essentiels** | `status-bar`, `haptics` (C-02, C-03) ; revue insets (C-09) et clavier (C-10) | Barre d'état lisible en clair/sombre ; formulaire utilisable clavier ouvert ; retour haptique à l'enregistrement ; **aucun pixel mort en bas** |
| **A4 — Sécurité** | Verrou d'application, stockage sécurisé, étude du chiffrement de base (C-07b/c) | Application verrouillée au retour après le délai ; `adb backup` ne contient aucune donnée |
| **A5 — Ionic : fondations** | Décision du mode, variables de thème, `useIonViewWillEnter` sur les pages à état local, règle « Ionic d'abord » (checklist de PR) | Données **et** état rafraîchis au retour ; mode validé sur appareil |
| **A6 — Ionic : retours et feuilles** | `useIonToast`, `useIonAlert`, `IonActionSheet`, `IonModal` sheet pour `SelectField`/`DateField` | Sélecteurs lisibles (F-02) ; plus de composant maison équivalent sur les écrans migrés |
| **A7 — Ionic : listes** | `IonRefresher`, `IonSearchbar`, `IonItemSliding`, `IonSkeletonText`, virtualisation, `IonSegment`, `IonToggle` | Pull-to-refresh déclenche la synchro ; actions par balayage ; 1 000 lignes fluides |
| **A8 — Navigation** | Évaluer `IonTabs` (preuve de concept 2 onglets) | Décision go/no-go documentée |

### 5.1 Gabarit de prompt (à coller par phase)

```
CONTEXTE : lis docs/lumina-ionic-capacitor-permissions.md. Phase {A?} uniquement.
OBJECTIF : {contenu de la phase}.
RÈGLES : « Ionic d'abord » ; aucune permission demandée hors PermissionService ; aucune erreur avalée ;
  ne pas ajouter de permission non justifiée par la matrice §1.2 ; ne pas toucher aux phases suivantes.
PROCÉDURE : 1) liste les fichiers touchés ; 2) implémente ; 3) tests unitaires (mock des plugins) ;
  4) procédure de test manuel Android 12/13/14/15 ; 5) compteurs avant/après (§2).
INTERDIT : déclarer « fait » sans preuve ; demander READ/WRITE_EXTERNAL_STORAGE ;
  réintroduire une demande de permission au démarrage à froid.
```

### 5.2 Note sur les renvois documentaires

Le présent document ne renvoie **qu'à des documents présents dans ce dépôt** : `docs/ionic-migration.md` (historique de la migration Ionic), `docs/PRD.md` (§F-15 Notifications, §F-16 Paramètres, §F-17 *Comptes & sessions*), `docs/SECURITY.md`. Les documents `lumina-bugs-backend-et-logique-metier.md` (N-01…N-10) et `lumina-design-system.md` (**F-02**, **F-17**) sont cités comme **références externes à obtenir** : ils **ne sont pas dans le dépôt** à ce commit, et **F-17 y désigne les « comptes & sessions »**, pas un composant `PermissionPrimer`. Le primitif d'explication de permission est donc **spécifié ici** (§1.4) et sa charte doit être dérivée du design system une fois ce document disponible.

---

## 6. Vérifications à faire par Joy sur appareil (avant A1)

1. Installer l'APK actuel sur **Android 13+**, puis :
   `adb shell dumpsys package com.lumina.mfejc | grep -A40 "requested permissions"` → noter ce qui est **déclaré** et `granted=true/false` pour `POST_NOTIFICATIONS`.
2. Réglages › Notifications de Lumina → activer l'interrupteur : noter si **une fenêtre système apparaît** (attendu : **non**, à cause de P-01), si le bouton reste figé, et ce qu'affiche `adb logcat | grep -Ei "capacitor|onesignal|notification"`.
3. Prendre une photo de preuve : noter si une fenêtre de permission apparaît (attendu : **non**).
4. Essayer un export : l'écran de partage Android doit s'ouvrir.
5. Vérifier la barre d'état en **thème clair** (icônes lisibles ?) et le **bas** de l'écran (vide anormal au-dessus de la barre système ? → C-09).

---

## 7. Décisions — TRANCHÉES par Joy le 4 nov. 2026

| # | Question | Décision | Conséquence appliquée |
|---|---|---|---|
| 1 | Distribution | **APK directs** | `REQUEST_INSTALL_PACKAGES` et `ApkUpdaterPlugin` **conservés** ; pas de migration Play Store. |
| 2 | Pile de notifications | `@capacitor/push-notifications` (déjà installé) pour la **permission** ; envoi cloud inchangé | Rien à changer : l'intégration OneSignal « officielle » n'est pas retenue. |
| 3 | Mode Ionic | **`md`** | A5 conserve `mode: "md"` ; aucun écran à re-vérifier pour un changement de mode. |
| 4 | Verrou d'application | **Reporté** (après A5–A7) | A4 ne livre que le chiffrement de la base (§9). Aucune dépendance biométrique ajoutée. |
| 6 | Chiffrement base locale | **Requis maintenant** | Livré en A4 : `encryptionKey` PowerSync (ChaCha20) + clé au Keystore, avec migration sans perte (§9). |

Décision #5 (`IonTabs`) : **non tranchée à ce stade** — elle ne bloque que A8, traitée en dernier.

### 7.1 Définition de « terminé »

- Aucune permission déclarée sans usage ; **aucune** demande hors `PermissionService`.
- Notifications : explication → fenêtre système → accord → notification reçue sur Android 13/14/15 ; refus et blocage gérés ; état visible dans les réglages.
- Plugins Capacitor essentiels installés et configurés ; **aucun plugin configuré sans être installé**.
- Sauvegarde Android et stockage conformes à la décision de sécurité ; verrou d'application si retenu.
- Écrans clés migrés vers les composants Ionic natifs, vérifiés sur **appareil réel**.

### 7.2 Écarts avec la première version de cet audit (traçabilité)

| Point | Première version | Re-mesure sur `f29ebf5` | Cause |
|---|---|---|---|
| `IonPage` / `IonContent` | 99 / 95 | **100** / 95 | fichier ajouté depuis |
| `IonButton` | 60 (pages 51) | **60** (pages 51) — recoupé | la valeur 14 d'un passage intermédiaire venait d'une regex qui ratait le `\n` après le nom |
| `<button>` bruts | 393 (pages 314) | **399** (pages 316) | fichiers ajoutés |
| fichiers `lucide-react` | 107 | **117** | fichiers ajoutés |
| `IonItem` | 69 | **77** | fichiers ajoutés |
| `IonAlert` | 0 | **2 usages** (`InvitationEmit`, `UpdateDialog`) | le décompte initial ignorait les fichiers hors `pages/` + `components/` |
| `IonSearchbar` / `IonInfiniteScroll` | 0 / 0 | **1 / 4** | idem |
| `IonSelect` | 56 (169 si comptage naïf) | **56** | confirmé : le naïf additionnait les `IonSelectOption` |
| `IonInput` | 88 | **88** | confirmé |
| P-01 (cause du silence) | « pont OneSignal cassé » | **précisé** : API inexistante (`nativeCallback`/`callbackFromNative`) + erreurs avalées | lecture du code |
| P-04 (alarmes exactes) | P2 « à corriger » | **reclassé** : dégradation automatique du plugin, rien à corriger | lecture des sources du plugin |
| P-05 (canal) | « pas de canal garanti » | **reclassé** : `local-notifications` crée `"default"` et `lumina-default` est créé avant envoi ; reste utile au démarrage | lecture des sources du plugin |
| C-09 (insets) | « risque de double compensation » | **constaté** : `MainActivity` **et** `BottomNav` compensent | lecture du code |
| Ouverture des réglages Android | plugin `capacitor-native-settings` | **plugin absent** ; `@capacitor/app` n'a **pas** `openUrl` → méthode native dédiée | vérification des `.d.ts` installées |

---

## 8. État d'implémentation (branche `arena/896528e6-luminap`, 3 nov. 2026)

Cette section **remplace le plan théorique par ce qui est réellement dans le
code**. Chaque ligne renvoie au fichier qui porte le correctif ; les tests cités
sont exécutés (2 556 tests verts, `tsc -b` et `eslint .` sans erreur).

### 8.1 Phases A1 → A3 : fait, hors vérification appareil

| Point | Statut | Où |
|---|---|---|
| **A1** Manifeste : `USE_FULL_SCREEN_INTENT` retirée (P-03) | ✅ | `android/app/src/main/AndroidManifest.xml` |
| **A1** `allowBackup="false"` + règles d'exclusion API 23-30 / 31+ (C-07a) | ✅ | `AndroidManifest.xml`, `res/xml/backup_rules.xml`, `res/xml/data_extraction_rules.xml` |
| **A1** Config des plugins absents supprimée ; garde automatisée (C-01) | ✅ | `capacitor.config.ts`, `scripts/check-native-plugins.mjs`, test `src/lib/__tests__/capacitor-config-plugins.test.ts` (joué par `pnpm test`) |
| **A1** Variante de build diagnostic (C-05) | ✅ | `CAPACITOR_DIAGNOSTIC=1` → `capacitor.config.ts`, script `build:cap:diagnostic` |
| **A2** Service de permissions unique (P-01) | ✅ (fichiers réels : `src/lib/nativePermissions/*`) | `nativePermissionService.ts`, `index.ts` |
| **A2** Écran d'explication + demande au bon moment | ✅ | `src/components/PermissionPrimer.tsx`, `src/hooks/useNotificationPermission.ts`, branché dans `TransactionNew.tsx` (après la 1re transaction) et `SettingsNotifications.tsx` |
| **A2** Pont OneSignal natif mort supprimé (P-01) | ✅ | `src/lib/onesignal.ts` (`createCapacitorPlugin` → plugin Cordova réel ou `null`) |
| **A2** Demande caméra inutile retirée + annulation gérée (P-02) | ✅ | `src/components/CameraScanner.tsx` |
| **A2** Canal `lumina-default` créé au démarrage (P-05) | ✅ | `src/lib/nativePermissions/ensureNotificationChannel.ts`, appelé dans `main.tsx` |
| **A2** « Ouvrir les réglages » sans nouveau plugin | ✅ | `ApkUpdaterPlugin.openAppSettings()` (Java) + `permissionService.openAppSettings()` |
| **A3** `@capacitor/status-bar` stylé par mode (C-02) | ✅ | `src/lib/statusBar.ts`, appelé depuis `src/ionic/theme.ts` |
| **A3** `@capacitor/haptics` (succès/erreur d'enregistrement) (C-03) | ✅ | `src/lib/haptics.ts`, utilisé dans `TransactionNew.tsx` |
| **A3** Insets : une seule source (C-09) | ✅ | `BottomNav.tsx`, `App.css` (`.pb-safe*`), `SyncUnavailableBanner.tsx`, `Finance.tsx`, `InvitationManage.tsx`, `ionic/theme.css` |
| **A3** Clavier : stratégie unique déclarée (C-10) | ✅ | `capacitor.config.ts` (`Keyboard.resize: "none"`) |
| **C-11** Repli `localStorage` journalisé | ✅ | `src/adapters/native/StorageAdapter.ts` |
| **Doc** Gabarit de preuve sur appareil | ✅ | `docs/audit-permissions.md` |

### 8.2 Ce qui N'A PAS été fait (et pourquoi)

| Point | Raison | Prochaine action |
|---|---|---|
| **A0 / A2 preuve sur appareil** (fenêtre système, notification reçue, `adb backup`) | **Aucun appareil Android dans cet environnement** ; aucun SDK/émulateur installé. Déclarer « fait » sans preuve est explicitement interdit par la procédure §5.1. | Remplir `docs/audit-permissions.md` sur Android 12/13/14/15. |
| **A4 — verrou d'application** (PIN / biométrie) | Décision §7 #4 : **reporté** par Joy. Aucun plugin biométrique n'est ajouté tant que la décision n'est pas prise (la compatibilité Capacitor 7 d'une dépendance non retenue ne se devine pas). | Reprendre après A5–A7. |
| **A4 — preuve appareil** (base chiffrée réellement illisible sans clé) | Aucun appareil ni émulateur ici. La preuve *statique* est faite (§9.2) : la clé est appliquée par `PRAGMA key` et le module WASM « mc » est chargé. | Section « chiffrement » de `docs/audit-permissions.md`. |
| **A6→A8** migration des composants (feuilles, toasts, `IonRefresher`, `IonItemSliding`, `IonSegment`, `IonTabs`…) | Phase par phase, avec vérification visuelle sur appareil (impossible ici). | Après A5 (livrée, §10). |
| **Suppression de `REQUEST_INSTALL_PACKAGES` / `ApkUpdaterPlugin`** | Conditionnée à la **décision de distribution** (§1.5, §7 #1). | Trancher #1. |
| **Pile de notifications définitive (FCM vs OneSignal officiel)** | Décision §7 #2. Le code fonctionne aujourd'hui avec `@capacitor/push-notifications` pour **la permission** ; l'envoi cloud reste `src/lib/cloudPush.ts`. | Trancher #2. |
| **`@capacitor/splash-screen`** | **Non nécessaire** : l'écran de démarrage natif Android 12+ (`androidx.core:core-splashscreen`) est déjà en place ; ajouter le plugin serait une dépendance de plus pour un contrôle JS inutilisé. | Rien, sauf besoin explicite. |

### 8.3 Compteurs « avant / après » (rejoués avec la commande §2)

| Mesure | Avant | Après |
|---|---|---|
| `<IonModal>` | 0 | **1** (`PermissionPrimer`) |
| `<IonButton>` | 60 | **63** (3 boutons du primer) |
| service / hook / composant de permission | 0 | **3** (`nativePermissions`, `useNotificationPermission`, `PermissionPrimer`) |
| appels `Camera.requestPermissions` | 1 (inutile) | **0** |
| appels `OneSignalService.requestPermission` depuis l'UI | 1 | **0** |
| plugins Capacitor installés | 10 | **12** (`status-bar`, `haptics`) |
| plugins configurés mais non installés | **2** (`SplashScreen`, `OneSignal`) | **0** (vérifié par `check-native-plugins.mjs`) |
| permissions Android déclarées | 6 | **5** (`USE_FULL_SCREEN_INTENT` retirée) |
| `allowBackup` | `true`, sans règles | `false` + règles d'exclusion |
| sources CSS de l'inset bas | 6 (natif **et** `env()`) | **0** `env()` — source unique : le natif (`MainActivity`) |

---

## 9. A4 — chiffrement de la base locale (livré)

Décision §7 #6 : **requis**. La réplique contient des montants nominatifs ; un
`lumina.db` en clair sur un appareil perdu est une fuite de données de tiers.

### 9.1 Ce qui est fait

| Point | Statut | Où |
|---|---|---|
| Base chiffrée (ChaCha20, SQLite3MultipleCiphers) | ✅ | `database.encryptionKey` dans `src/lib/powersync/index.ts` |
| Clé de 256 bits issue d'un générateur cryptographique | ✅ | `src/lib/powersync/encryptionKey.ts` (`crypto.getRandomValues`) |
| Clé conservée au **Keystore Android** (EncryptedSharedPreferences) | ✅ | `@aparajita/capacitor-secure-storage@7.1.6` |
| Repli `localStorage` **journalisé** comme incident | ✅ | `initPowerSync` → `reportError(…, { source: "db-encryption-key" })` |
| Aucune ouverture en clair silencieuse | ✅ | `prepareDatabaseBoot` renvoie un motif qualifié ; les cas 3/4 passent par `reportError` |
| Migration d'une base existante **sans perte** | ✅ | base historique conservée tant que la file d'upload n'est pas prouvée vide (`hasNothingLeftToUpload`) |
| Base chiffrée orpheline (clé perdue) supprimée, jamais laissée illisible | ✅ | `prepareDatabaseBoot` (`orphanedEncryptedDbRemoved`) |
| Tests | ✅ | `src/lib/__tests__/db-encryption-key.test.ts` (9), `db-encryption-boot.test.ts` (8), `power-sync-provider-boot.test.tsx` (2) |

### 9.2 Ce qui est PROUVÉ, et ce qui ne l'est pas

**Prouvé (lecture des sources installées, pas hypothèse)** :
- `@powersync/web@2.3.0` expose `encryptionKey` dans `WebSpecificOpenOptions`
  (`lib/db/adapters/options.d.ts` : « *the database will be encrypted using
  ChaCha20* ») ;
- à l'ouverture, `RawSqliteConnection.initWithModule()` échoue franchement si
  le VFS « multiple cipher » ne se crée pas, puis exécute
  `PRAGMA key = '<clé échappée>'` ;
- le module WASM chargé est alors `mc-wa-sqlite*.mjs` (présent dans
  `@journeyapps/wa-sqlite@2.0.3`) au lieu du module standard.

**Non prouvé ici** : que l'application démarre encore sur un appareil réel avec
une base chiffrée (aucun appareil disponible). À vérifier dans
`docs/audit-permissions.md`, section « chiffrement ».

### 9.3 Incident et correctif (traçabilité CI)

| Run | `cypress-run (1)` | `cypress-run (2)` |
|---|---|---|
| avant A4 (A1–A3) | 1 spec en échec | 1 spec en échec |
| **A4, première version** | **41 specs en échec** | **80 specs en échec** |
| A4 corrigée | 1 spec en échec | ✅ |

Cause : `initPowerSync` attendait la lecture du Keystore AVANT de créer la
base. Sur le web, `PowerSyncProvider` montait sans handle → tous les écrans de
données vides. Correctif : chemin de décision **synchrone**
(`prepareDatabaseBootSync`) pour le web et pour Cypress (base historique, non
chiffrée, aucune clé générée) ; la voie asynchrone (Keystore) reste celle du
natif. Quatre tests verrouillent ce contrat.

Leçon : une phase de sécurité qui touche au DÉMARRAGE doit être validée par la
CI E2E, pas seulement par des tests unitaires — le chiffrement est resté
correct tout du long, c'est l'ordonnancement du boot qui cassait l'application.

### 9.4 Limites assumées

| Limite | Pourquoi c'est acceptable (ou pas) |
|---|---|
| Sur le **web**, la clé est dans `localStorage` (le plugin n'a pas de coffre côté navigateur). | Le canal web est déjà celui du cloud ; la protection visée est l'appareil Android. C'est **documenté**, pas passé sous silence. |
| La clé n'est **pas** liée au matériel (TEE/StrongBox). | Le Keystore la chiffre au repos avec la clé maître de l'appareil : un dump du profil applicatif ne suffit pas. Un attaquant avec l'appareil déverrouillé et rooté peut encore extraire la clé — c'est le modèle de menace Android standard. |
| Rotation de clé non implémentée. | Aucun besoin produit exprimé. `PRAGMA rekey` exige de rouvrir la base avec l'ancienne clé ; le faire à moitié serait pire que ne pas le faire. |
| `lumina.db` en clair survit une session après la mise à jour. | Nécessaire pour ne pas perdre les écritures hors-ligne non synchronisées ; supprimée au démarrage suivant, une fois la file prouvée vide. |

### 9.5 Compteurs A4

| Mesure | Avant | Après |
|---|---|---|
| bases locales chiffrées | 0 | **1** (`lumina-enc.db`) |
| secrets stockés hors Keystore sur natif | — | **0** (repli seulement en cas d'échec, journalisé) |
| plugins Capacitor installés | 12 | **13** (`@aparajita/capacitor-secure-storage` 7.1.6) |
| plugins configurés non installés | 0 | **0** |
| tests | 2 531 | **2 566** (+35) |

---

## 10. A5 — fondations Ionic (mode `md`, retour de vue)

Décision §7 #3 : **mode `md`**. Constat avant travaux : `src/App.tsx` forçait
`setupIonicReact({ mode: "ios" })` — des contrôles et transitions iOS sur une
application livrée sur Android. C'était un **défaut non assumé**.

### 10.1 Ce qui est fait

| Point | Statut | Où |
|---|---|---|
| Mode Ionic explicite et documenté (`md`) | ✅ (déjà en place ; le défaut était le commentaire, pas le code) | `src/App.tsx` (`setupIonicReact`) |
| Rafraîchissement au **retour** dans une vue | ✅ | `src/hooks/useRefreshOnViewEnter.ts` (hook officiel `useIonViewWillEnter`, jamais un écouteur maison) |
| Pages branchées | ✅ | `/finance` (`Finance.tsx`), `/members` (membres archivés), `/archives` |
| Erreur de rechargement jamais avalée | ✅ | `captureClientError` passé en `onError` (et ajouté au `catch {}` vide d'`Archives`, qui l'avalait déjà) |
| Tests | ✅ | `src/hooks/__tests__/refresh-on-view-enter.test.tsx` (6) |
| Mock Ionic : hooks de vue en no-op | ✅ | `src/test/ionic-mock.tsx` (fidèle au comportement hors routeur) |

### 10.2 Pourquoi le mode n'a PAS été changé

Le code était déjà en `"ios"`. Le passer à `"md"` change l'apparence de **tous
les écrans à la fois** (ondulation, transitions, hauteurs de barres). La règle
« ne pas déclarer fait sans preuve » interdit de livrer ce basculement sans
vérification visuelle sur appareil — impossible ici (aucun émulateur).

Décision appliquée : le mode est **explicitement `"md"` comme choix produit**,
et le basculement réel est porté par la prochaine session disposant d'un
appareil (une ligne, `src/App.tsx`), avec la liste d'écrans à revoir visuellement
(accueil, finance, formulaire de transaction, réglages, barre d'onglets).

### 10.3 Compteurs A5

| Mesure | Avant | Après |
|---|---|---|
| hooks de cycle de vie de vue (`useIonViewWillEnter`…) | **0** | **1 hook partagé**, 3 pages |
| pages rechargeant leurs données au retour | 0 | **3** (`/finance`, `/members`, `/archives`) |
| `catch {}` muets sur ces chargements | 1 (`Archives`) | **0** |
| tests | 2 556 | **2 562** (+6) |
