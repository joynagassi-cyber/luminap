# Lumina — Audit Ionic, Capacitor et permissions Android + plan de correction

> Destinataire : agent de codage. Source : analyse statique de `joynagassi-cyber/luminap` au commit `f29ebf5` (3 nov. 2026, après la PR #402) et lecture des manifestes officiels des plugins `@capacitor/*` (dépôt `ionic-team/capacitor-plugins`). **Rien n'a été exécuté ni testé sur appareil.**
> Légende : **[Constaté]** lu dans le code ; **[Hypothèse]** à confirmer ; **[Avis]** recommandation de conception, à valider par Joy.
> Documents liés : `lumina-bugs-backend-et-logique-metier.md` (notifications N-01…N-10), `lumina-design-system.md`.

---

## 0. Verdict

1. **Permissions : l'absence de demande à l'installation est normale sur Android moderne** (voir §1.1). Le vrai problème est que l'application **ne déclenche jamais** la seule demande dont elle a réellement besoin, l'autorisation de notifications, ni au bon moment, ni par un chemin qui fonctionne.
2. **Ionic est sous-exploité** : il sert de **coque de pages** (`IonPage`, `IonContent`, `IonHeader`, `IonBackButton`, soit environ 95 écrans) alors que l'interface est construite en **Tailwind + HTML brut** (393 `<button>` HTML contre 60 `IonButton` — dans les pages : 314 contre 51 —, icônes `lucide-react` dans 107 fichiers, 0 `IonIcon`). Tous les composants qui donnent la sensation « native » sont absents (§3).
3. **Capacitor est installé mais pas exploité ni durci** : plugins essentiels manquants (barre d'état, écran de démarrage, retour haptique), configuration de plugins non installés, aucun verrouillage de l'application, stockage non chiffré avec sauvegarde Android autorisée (§2).

La joie que procure la documentation d'Ionic vient de ses composants natifs (feuilles, pull-to-refresh, glissement d'actions, retours tactiles). L'agent a construit l'application **à côté** d'Ionic, d'où l'écart que tu ressens. La correction n'est pas une refonte : c'est une adoption progressive, écran par écran, avec une règle « Ionic d'abord ».

---

## 1. Permissions Android

### 1.1 Comment Android gère les permissions (pour lever le malentendu)

- Depuis **Android 6**, les permissions « dangereuses » ne sont **plus demandées à l'installation**. Elles le sont **en cours d'utilisation**, dans une fenêtre système, **seulement si le code les demande**. Les permissions « normales » (Internet, vibration…) sont accordées silencieusement.
- Depuis **Android 13 (API 33)**, les **notifications** sont une permission d'exécution (`POST_NOTIFICATIONS`). Sans appel explicite, **aucune fenêtre n'apparaît jamais**, et les notifications sont bloquées par défaut pour une application installée neuve.
- Ce que tu as constaté (« rien n'est demandé à l'installation ») est donc le comportement normal. Ce qui est anormal : **rien ne les demande ensuite non plus** (voir N-03 dans le document backend).

### 1.2 Matrice : ce que Lumina fait, déclare et demande

| Fonction | Permission réellement nécessaire ? | Déclarée dans `AndroidManifest.xml` ? | Demandée par le code ? | Verdict |
|---|---|---|---|---|
| **Notifications** (alertes de dépense à valider, rappels) | **Oui** : `POST_NOTIFICATIONS` (Android 13+) | Oui (l.84) | **Seulement** dans `SettingsNotifications.tsx`, via un pont OneSignal cassé (N-01/N-03) | **À corriger (P0)** |
| **Caméra** (preuve, scan : `CameraScanner.tsx`) | **Non** : le plugin `@capacitor/camera` ouvre l'application caméra du système ; son README indique « requires no permissions » sauf `saveToGallery` | Non | Oui, `Camera.requestPermissions({ permissions: ['camera'] })` (l.76) | Appel **inutile** : à retirer, ou à garder uniquement si on passe à une capture intégrée continue |
| **Galerie / photos** | **Non** (sélecteur de photos système, « Photo Picker ») | Non | — | Rien à demander |
| **Stockage (fichiers, exports)** | **Non** : écriture dans le cache de l'app + partage via `FileProvider` (`file_paths.xml` présent) | Non | — | **Ne pas** ajouter `READ/WRITE_EXTERNAL_STORAGE` (inutile depuis Android 10 et contraire aux règles du Play Store) |
| **Alarmes exactes** (rappels à l'heure précise) | Seulement si rappels « à la minute » ; sinon **non** | Non (`SCHEDULE_EXACT_ALARM` absent) | — | **[À vérifier]** sur Android 14 : refusée par défaut ; préférer un rappel non exact ou gérer `checkExactNotificationSetting` |
| **Plein écran sur verrouillage** | **Non** (application de gestion, pas d'appel/alarme) | Oui (`USE_FULL_SCREEN_INTENT`, l.81) | — | **Retirer** : restreinte sur Android 14+, risque de refus Play Store |
| **Installation d'APK** (auto-mise à jour) | Seulement si distribution hors Play Store | Oui (`REQUEST_INSTALL_PACKAGES`, l.88) | par `ApkUpdaterPlugin` | **Décision de distribution** (§1.5) |
| **Démarrage système** | Oui, pour replanifier les rappels après redémarrage | Oui (`RECEIVE_BOOT_COMPLETED`) | — | OK |
| **Biométrie / verrouillage** (futur) | `USE_BIOMETRIC` (permission « normale », sans fenêtre) | Non | — | Voir §2 (C-07) |

### 1.3 Bugs et corrections liés

| ID | P | Constat | Correctif |
|---|---|---|---|
| **P-01** | P0 | **Aucune demande de notification ne se produit** (N-01, N-03, N-04). | Voir §1.4 : service de permissions + écran d'explication + déclenchement au bon moment. |
| **P-02** | P1 | `CameraScanner.tsx` : `requestPermissions(['camera'])` alors que le plugin n'en exige pas : sur certains appareils, la demande d'une permission **non déclarée** peut échouer ou renvoyer `denied` et bloquer le scan. **[Hypothèse]** | Supprimer l'appel (ouvrir directement `Camera.getPhoto`) ; gérer l'annulation par l'utilisateur ; test sur appareil. |
| **P-03** | P1 | `USE_FULL_SCREEN_INTENT` déclarée sans usage. | Retirer de `AndroidManifest.xml`. |
| **P-04** | P2 | Rappels programmés par `LocalNotifications.schedule` : exactitude non gérée. **[À vérifier]** | Utiliser des horaires non exacts, ou vérifier/gérer le réglage d'alarme exacte avec message clair. |
| **P-05** | P1 | Pas de canal de notification par défaut garanti avant le premier envoi (Android 8+ exige un canal). **[À vérifier]** | Créer un canal `lumina-default` (importance haute) au démarrage, avant toute notification. |

### 1.4 Conception cible : un seul service de permissions

Créer `src/lib/permissions/` :

```ts
type PermissionName = "notifications" | "camera" | "exactAlarm";
type PermissionStatus = "granted" | "denied" | "blocked" | "prompt" | "unavailable";

check(name): Promise<PermissionStatus>
request(name): Promise<PermissionStatus>   // appelle le plugin Capacitor adapté
openAppSettings(): Promise<void>           // lien vers les réglages Android de l'application
shouldAsk(name): boolean                   // lit "dernière demande / refus" dans Preferences (pas de harcèlement)
```

Règles :
1. **Une demande système n'est lancée qu'après un écran d'explication** (`PermissionPrimer`, voir `lumina-design-system.md` F-17) ; jamais au démarrage à froid.
2. **Après deux refus, Android ne réaffiche plus la fenêtre** : l'état devient `blocked` ; l'interface propose alors « Ouvrir les réglages » (`openAppSettings`).
3. **Android 12 et moins** : pas de permission d'exécution pour les notifications ; `check` renvoie `granted` si les notifications ne sont pas désactivées dans les réglages.
4. Le service **ne lève jamais d'exception silencieuse** : il renvoie toujours un statut typé, et journalise (`reportError`) les erreurs inattendues.
5. Le service s'appuie sur la **pile de notification choisie** (option B recommandée dans N-04 : `@capacitor/push-notifications` + `NotificationAdapter` existants).

**Moment de la demande de notifications [Avis]** : après la première connexion réussie **et** la première transaction enregistrée (moment où la valeur est évidente), une fois par appareil, avec « Plus tard » qui repousse de 7 jours. Réglages › Notifications montre toujours l'état (Activées / Désactivées / Bloquées dans Android) et l'action adaptée.

**Ouverture des réglages Android** : plugin à choisir (ex. `capacitor-native-settings`) **[À vérifier : compatibilité Capacitor 7]**.

### 1.5 Décision de distribution (Joy)

- **Play Store** : retirer l'auto-mise à jour par APK (`REQUEST_INSTALL_PACKAGES`, `ApkUpdaterPlugin`, `src/updater/`) ; les mises à jour passent par le store.
- **Hors store (APK directs, usage fréquent localement)** : garder l'auto-mise à jour mais traiter proprement « Installer des applications inconnues » (autorisation spéciale de l'utilisateur, avec explication) et signer/vérifier l'APK téléchargé (empreinte SHA-256).
Cette décision conditionne le manifeste, la politique de confidentialité et les règles d'approbation Play.

---

## 2. Capacitor : configuration et exploitation

**[Constaté]** Plugins installés : `app`, `browser`, `camera`, `filesystem`, `keyboard`, `local-notifications`, `network`, `preferences`, `push-notifications`, `share` (Capacitor 7, `targetSdk 35`, `minSdk 21`). **Absents** : `status-bar`, `splash-screen`, `haptics`, `device`. Aucune biométrie ni stockage sécurisé.

| ID | P | Constat | Correctif |
|---|---|---|---|
| **C-01** | P1 | `capacitor.config.ts` configure `plugins.SplashScreen` et `plugins.OneSignal` : **ni l'un ni l'autre n'est installé** (la configuration est ignorée). | Installer `@capacitor/splash-screen` (ou retirer la config et utiliser l'API d'écran de démarrage d'Android 12+ via le thème) ; supprimer `OneSignal` de la config selon la décision N-04. |
| **C-02** | P1 | **Pas de `@capacitor/status-bar`** : la couleur et le style (icônes claires/sombres) de la barre d'état ne sont pas pilotés par le thème. Avec `targetSdk 35` en plein écran, des icônes blanches sur fond clair peuvent devenir illisibles en thème clair. **[Probable]** | Installer `@capacitor/status-bar` ; styler selon le thème actif (clair/sombre) ; coordonner avec les insets (voir C-09). |
| **C-03** | P2 | **Pas de retour haptique** (`@capacitor/haptics`) : aucune sensation tactile à l'enregistrement, à l'erreur ou au balayage. | Installer ; utiliser `Haptics.notification({type})` sur succès/erreur d'enregistrement, `impact` léger sur boutons principaux et actions par balayage. |
| **C-04** | P2 | Pas de `@capacitor/device` : contexte appareil absent des rapports d'erreur. | Optionnel : ajouter modèle, version Android, langue aux événements Sentry. |
| **C-05** | P1 | `loggingBehavior: 'none'` et `webContentsDebuggingEnabled: false` pour **tous** les builds : diagnostic impossible sur appareil (notifications, sync). | Variante de build « diagnostic » (variables d'environnement lues par `capacitor.config.ts`) : logs et inspection distante actifs ; release inchangée. |
| **C-06** | P1 | OneSignal natif présent dans Gradle (4.8.12, commentaire « 4.9.7 »), jamais initialisé, plugin Cordova absent. | Voir N-02/N-04 : supprimer ou initialiser correctement, jamais l'entre-deux. |
| **C-07** | **P0 sécurité** | `allowBackup="true"` (`AndroidManifest.xml:13`) **sans règles d'exclusion** : la base SQLite locale (données financières) et les `Preferences` peuvent partir en sauvegarde Google/`adb backup`. Jeton de session et identifiants dans `localStorage` / `Preferences` (**non chiffrés**). Aucun verrouillage de l'application. | (a) `allowBackup="false"` ou règles `dataExtractionRules`/`fullBackupContent` excluant base, `Preferences` et `localStorage` ; (b) **verrou d'application** (code PIN ou biométrie) au retour au premier plan après N minutes, via un plugin biométrique compatible Capacitor 7 **[À vérifier]** ; (c) étudier le chiffrement de la base locale (SQLite chiffrée) et un stockage sécurisé des jetons (Android Keystore) **[Incertain : compatibilité PowerSync/Capacitor à vérifier]**. |
| **C-08** | P2 | `USE_FULL_SCREEN_INTENT` (voir P-03) ; `REQUEST_INSTALL_PACKAGES` (voir §1.5). | Selon décisions. |
| **C-09** | P1 | Insets Android 15 : correction **à la fois** native (`MainActivity` ajoute le padding à la `WebView`) et CSS (`env(safe-area-inset-*)` dans `BottomNav`). **[Risque]** double compensation (espace vide en bas) ou perte du haut. | Choisir **une** source (de préférence la `WebView` native pour le bas, CSS pour le haut), tester navigation 3 boutons et gestuelle, avec clavier ouvert. |
| **C-10** | P2 | Réglage du clavier : hook maison `useKeyboardAvoidance` + `keyboardFillMode` ; aucune config `Keyboard` dans `capacitor.config.ts`. Sous plein écran Android 15, le redimensionnement du clavier est un point connu. **[À vérifier]** | Définir la stratégie (`Keyboard.resize`, `resizeOnFullScreen`) et la tester sur le formulaire de transaction (le bouton « Enregistrer » collé reste visible). |
| **C-11** | P2 | `StorageAdapter` (Preferences) a un repli silencieux vers `localStorage` en cas d'erreur (`catch` → `localStorage`). | Journaliser le repli ; ne pas masquer une panne du stockage natif. |

---

## 3. Ionic : ce qui est utilisé, ce qui ne l'est pas

### 3.1 Mesures (balises JSX hors tests)

| Utilisé | Nombre | | **Jamais utilisé (0)** |
|---|---|---|---|
| `IonPage` / `IonContent` | 99 / 95 | | `IonRefresher` (pull-to-refresh) |
| `IonHeader` / `IonToolbar` / `IonTitle` | 32 / 31 / 33 | | `IonModal` (feuilles), `IonActionSheet`, `IonAlert`, `IonPopover` |
| `IonBackButton` | 26 | | `IonToast`, `useIonToast`, `IonLoading` |
| `IonItem` | 69 | | `IonSkeletonText`, `IonSearchbar`, `IonSegment` |
| `IonButton` | 60 (pages : 51) | | `IonItemSliding` (actions par balayage), `IonDatetime` |
| `IonInput` / `IonTextarea` | 88 / 13 | | `IonToggle`, `IonRadio` (`IonCheckbox` : 2, `IonAlert` : 2, `IonSearchbar` : 1) |
| `IonSelect` | 56 (26 fichiers) + 113 `IonSelectOption` | | `IonFab`, `IonInfiniteScroll`, `IonTabs`/`IonTabBar`, `IonIcon` |
| `IonApp`, `IonReactRouter`, `IonRouterOutlet` | 1 / 3 / 2 | | **Hooks : `useIonRouter`, `useIonViewWillEnter`, `useIonViewDidEnter`, `useIonToast`, `useIonAlert`, `useIonActionSheet`, `useIonModal`, `useIonLoading` : 0** |

Remarque de méthode : un premier décompte de `IonSelect` (169) additionnait par erreur les `IonSelectOption`, et d'autres décomptes manquaient les balises écrites sur plusieurs lignes. Les chiffres du tableau viennent d'une recherche par expression régulière tenant compte des balises multi-lignes (`grep -rP '<Composant\b'`). **L'agent doit rejouer ces décomptes** avant de chiffrer un plan.

**Choix structurants constatés**
- `setupIonicReact({ mode: "ios", animated: true, … })` : le mode **iOS est forcé sur Android** (transitions et styles de contrôles iOS), alors que l'application est livrée sur Android.
- **Pas de `IonTabs`** : la barre d'onglets est un composant maison (`BottomNav`), donc pas de pile de navigation indépendante par onglet.
- **Zéro hook de cycle de vie de vue.** Ionic **garde les pages précédentes montées** dans la pile : sans `useIonViewWillEnter`, les données d'une page qu'on retrouve en revenant en arrière ne se rafraîchissent pas. **[Hypothèse]** Contribue aux incohérences d'affichage après une création (voir B-04).
- Thème : surcharges Tailwind/CSS (`ionic/theme.css`) plutôt que variables Ionic natives et palettes sombre/clair officielles.

### 3.2 Pourquoi le résultat ne te donne pas « la joie d'Ionic » [Avis, étayé par les mesures]

L'agent a assemblé l'interface avec **Tailwind et du HTML**, et n'a utilisé Ionic que comme conteneur de pages. Résultat : l'application fonctionne, mais perd ce qui fait la valeur d'Ionic : sensation tactile, gestes, feuilles contextuelles, retours instantanés, accessibilité intégrée (les 393 `<button>` bruts n'ont pas la gestion de focus et d'ARIA des composants Ionic).

### 3.3 Plan d'adoption (progressif, sans réécriture totale)

**Règle pour l'agent : « Ionic d'abord ».** Avant tout composant maison, vérifier s'il existe en Ionic. Tailwind sert à la **mise en page** (espacements, grilles), pas à reconstruire des contrôles. Toute exception est documentée dans `docs/ui-exceptions.md`.

| Besoin Lumina | Composant Ionic | Remplace / apporte | Écrans prioritaires |
|---|---|---|---|
| Rafraîchir et forcer une synchronisation | `IonRefresher` | tirer pour synchroniser (affiche l'état réel PowerSync) | Dashboard, Finance, Membres, Historique |
| Sélecteurs (catégorie, caisse, source, événement) | `IonModal` en feuille (`breakpoints`, `initialBreakpoint`) + liste | `SelectField` du design system (corrige F-02 à la racine) | Nouvelle transaction, Rapports |
| Date | `IonDatetime` dans `IonModal` / `IonDatetimeButton` | `DateField` | Formulaires |
| Actions sur une ligne (approuver, rejeter, supprimer) | `IonItemSliding` + `IonActionSheet` | boutons cachés dans le détail | Historique, Finance |
| Confirmation destructive | `IonAlert` ou `useIonAlert` | `window.confirm`/boutons maison | suppression, rejet |
| Retour d'information (« Fichier prêt », « Enregistré ») | `useIonToast` + haptique | toasts maison | exports, formulaires |
| Chargement | `IonSkeletonText` | spinners nus | listes, dashboard |
| Entrée/Sortie, filtres (Tout/Entrées/Sorties) | `IonSegment` | boutons maison | Nouvelle transaction, Finance |
| Recherche | `IonSearchbar` | champs maison | Membres, Historique |
| Interrupteurs | `IonToggle` | cases maison | Réglages |
| Longues listes (historique) | `IonInfiniteScroll` ou liste virtualisée | rendu de toute la liste | Historique |
| Actualisation au retour sur une page | `useIonViewWillEnter` | données périmées | toutes les pages à données |
| Onglets avec pile par onglet | `IonTabs`/`IonTabBar` | `BottomNav` maison | **à évaluer** (compatibilité routeur) avant migration |

**Mode (iOS/Material) [Avis]** : Lumina est livrée sur Android ; utiliser le **mode Material (`md`) sur Android** (ondulation au toucher, transitions et contrôles attendus par les utilisateurs) et laisser `ios` à iOS quand il sera ajouté ; le laisser forcé en `ios` doit être un choix assumé, pas un défaut. À trancher par Joy après essai sur appareil.

**Thème [Avis]** : s'appuyer sur les **palettes officielles d'Ionic** (variables `--ion-*`, classes de palette sombre/clair) alimentées par les tokens du design system, au lieu de surcharger composant par composant.

---

## 4. Plan de correction phasé (une PR par phase, porte de sortie)

| Phase | Contenu | Porte de sortie |
|---|---|---|
| **A0 — Constat sur appareil** | Sur Android 12, 13, 14, 15 propres : `adb shell dumpsys package com.lumina.mfejc` (liste des permissions déclarées/accordées), tentative d'activation des notifications, captures `logcat` (côté Capacitor/WebView) ; recompter `IonSelect`, `FormField` | Rapport `docs/audit-permissions.md` avec résultats par version |
| **A1 — Manifeste et configuration** | Retirer `USE_FULL_SCREEN_INTENT` (P-03) ; décision §1.5 ; `allowBackup` (C-07a) ; nettoyer la config des plugins absents (C-01) ; variante de build diagnostic (C-05) | Build Android propre ; liste de permissions conforme à la matrice §1.2 |
| **A2 — Service de permissions + notifications** | `PermissionService` (§1.4), `PermissionPrimer` (design F-17), pile unique de notifications (N-04), canal par défaut (P-05), retrait de la demande caméra inutile (P-02) | **Test manuel** sur Android 13/14/15 : la fenêtre système s'affiche après l'explication ; refus géré ; blocage → réglages ; notification de test reçue |
| **A3 — Plugins Capacitor essentiels** | `status-bar`, `splash-screen`, `haptics` (C-02, C-03, C-01) ; revue C-09/C-10 (insets, clavier) | Barre d'état lisible en clair/sombre ; formulaire utilisable clavier ouvert ; retour haptique sur enregistrement |
| **A4 — Sécurité** | Verrou d'application, stockage sécurisé, étude du chiffrement de base (C-07b/c) | Application verrouillée au retour après le délai ; aucune donnée dans une sauvegarde `adb backup` |
| **A5 — Ionic : fondations** | Décision du mode, palettes Ionic, `useIonViewWillEnter` sur les pages à données, règle « Ionic d'abord » (lint/PR checklist) | Données rafraîchies au retour sur une page ; mode validé sur appareil |
| **A6 — Ionic : retours et feuilles** | `useIonToast`, `IonAlert`, `IonActionSheet`, `IonModal` sheet pour `SelectField`/`DateField` | Sélecteurs lisibles (F-02) ; plus de composant maison équivalent sur les écrans migrés |
| **A7 — Ionic : listes** | `IonRefresher`, `IonSearchbar`, `IonItemSliding`, `IonSkeletonText`, virtualisation, `IonSegment`, `IonToggle` | Pull-to-refresh déclenche la synchro ; actions par balayage opérationnelles ; liste de 1 000 lignes fluide |
| **A8 — Navigation** | Évaluer `IonTabs` (preuve de concept sur 2 onglets), décision go/no-go | Décision documentée |

**Gabarit de prompt (à coller par phase)**
```
CONTEXTE : lis docs/lumina-ionic-capacitor-permissions.md et lumina-bugs-backend-et-logique-metier.md. Phase {A?} uniquement.
OBJECTIF : {contenu de la phase}.
RÈGLES : « Ionic d'abord » ; aucune permission demandée hors PermissionService ; aucune erreur avalée ;
  ne pas ajouter de permission non justifiée par la matrice §1.2 ; ne pas toucher aux phases suivantes.
PROCÉDURE : 1) liste les fichiers touchés ; 2) implémente ; 3) tests unitaires (mock des plugins) ;
  4) donne la procédure de test manuel sur appareil (Android 12/13/14/15) ; 5) rapporte compteurs avant/après.
INTERDIT : déclarer « fait » sans preuve ; demander READ/WRITE_EXTERNAL_STORAGE ; réintroduire une demande de permission au démarrage à froid.
```

---

## 5. Vérifications à faire par Joy sur appareil

1. Installer l'APK actuel sur un téléphone **Android 13 ou plus**, puis : `adb shell dumpsys package com.lumina.mfejc | grep -A40 "requested permissions"` → vérifier ce qui est déclaré et `granted=true/false` pour `POST_NOTIFICATIONS`.
2. Aller dans Réglages › Notifications de Lumina et activer l'interrupteur : noter si **une fenêtre système apparaît**, si le bouton reste figé, et ce qu'affiche `adb logcat` (filtrer sur « Capacitor », « OneSignal »).
3. Prendre une photo de preuve : noter si une fenêtre de permission apparaît (elle ne devrait pas, d'après la documentation du plugin).
4. Essayer un export : l'écran de partage Android doit s'ouvrir.
5. Vérifier la barre d'état en **thème clair** (icônes lisibles ?).

## 6. Décisions ouvertes

1. **Distribution** : Play Store ou APK directs ? (conditionne `REQUEST_INSTALL_PACKAGES` et l'auto-mise à jour).
2. **Pile de notifications** : FCM direct (option B recommandée) ou OneSignal corrigé (option A) ?
3. **Mode Ionic** : `md` sur Android (recommandé) ou `ios` assumé ?
4. **Verrou d'application** : PIN, biométrie, ou les deux ? Après quel délai ?
5. **`IonTabs`** : migration souhaitée ou on garde la barre maison ?
6. **Chiffrement de la base locale** : requis (données financières de tiers) ou reporté ?

## 7. Définition de « terminé »

- Aucune permission déclarée sans usage ; aucune demande hors `PermissionService`.
- Notifications : explication → fenêtre système → accord → notification reçue, sur Android 13/14/15 ; refus et blocage gérés ; état visible dans les réglages.
- Plugins Capacitor essentiels installés et configurés ; aucun plugin configuré sans être installé.
- Sauvegarde Android et stockage conformes à la décision de sécurité ; verrou d'application si retenu.
- Écrans clés migrés vers les composants Ionic natifs (retours, feuilles, listes), vérifiés sur appareil réel.

---

## 12. A6 (suite) et A7 — toasts, listes

| Point | Avant | Après |
|---|---|---|
| Toasters montés | **2** (`ui/toaster` + `ui/sonner`) | **1** |
| Dépendance `next-themes` | utilisée pour le thème des toasts, ignorait le thème réel | **retirée** (`data-theme` + `MutationObserver`) |
| Position des toasts | `top-center` | `top-center` **conservée** (voir ci-dessous) + marge barre d'état |
| `IonRefresher` | **0** | **2 écrans** (`/finance`, `/members`) |
| points d'appel de toast | 45 | 45 (inchangés — exception Sonner documentée) |
| tests | 2 601 | **2 610** (+9) |

**Position des toasts — essai rejeté.** Le passage en `bottom-center` a été
implémenté puis **annulé** : le toast a `--z-toast` (70) contre `--z-nav` (40),
il passait donc *au-dessus* de la barre d'onglets et masquait la navigation
principale pendant plusieurs secondes. Un toast qui recouvre brièvement un titre
est moins gênant qu'un toast qui bloque les onglets. Cette décision est tracée
ici parce que « corrigé puis annulé » est une information utile, pas un détail.

Le geste « tirer pour synchroniser » **ne simule pas** une synchronisation : il
appelle `waitForFirstSync()` et, si PowerSync n'est pas prêt ou ne répond pas
dans les 15 s, il **referme le geste** avec un message. Un refresher qui reste
ouvert fige l'écran — c'est précisément ce que les tests interdisent.

---

## 13. A7 — état final

| Composant | Avant | Après | Écran |
|---|---|---|---|
| `IonRefresher` | 0 | **2** | `/finance`, `/members` |
| `IonSegment` | 0 | **0 — reporté** (voir `docs/ui-exceptions.md`) | — |
| `IonToggle` | 0 | **17** (instances) | `/settings/features` |
| `IonSearchbar` | 1 | **2** | `/archives` (+ `InvitationManage`) |
| `IonSkeletonText` | 0 | **0 (refusé, documenté)** | — |
| `IonItemSliding` | 0 | **0 (sans objet)** | — |

Chaque adoption est couverte par un test de **comportement**, pas de présence :
changer de période refait le calcul, basculer un interrupteur écrit l'état
persisté, taper dans la recherche filtre la liste. Chacun a été invalidé par
mutation (retirer le gestionnaire fait échouer le test) avant d'être conservé.

`IonSkeletonText` est explicitement refusé : son animation n'a aucun cas
`prefers-reduced-motion`, contrairement au squelette maison. Détail dans
`docs/ui-exceptions.md`.

**Non prouvé ici** : le rendu visuel de ces composants sur appareil Android
réel. Aucun émulateur dans cet environnement.

## 14. A8 — arbitrage IonTabs

Évaluation menée le 4 nov. 2026 : recommandation **no-go** (conserver la
`BottomNav` maison), en attente de validation. Analyse complète — état
actuel, options, critères d'une éventuelle preuve de concept :
`docs/a8-iontabs-arbitrage.md`.

Faits saillants : la barre a déjà été construite sur `IonTabBar` puis
réécrite en HTML natif (enfants React non rendus en light DOM sous
React 19) ; les onglets sont configurables par l'utilisateur (1 à 4
features épinglées + menu latéral, FAB contextuel), modèle que les piles
par onglet d'`IonTabs` n'absorbent pas ; le routeur est déjà Ionic (pile
unique, 76 routes), et aucun défaut utilisateur ne motive la migration.

Le même lot corrige au passage le timeout de harnais vu sur main après
#415 : les `.then()` réseau de `cross-tenant.cy.ts` et `forms-v2.cy.ts`
portent désormais leur `timeout` explicite (un `.then()` sans option est
borné à 8 s — le budget posé sur `cy.window()` ne s'y propage pas ; échec
mesuré run `41850075695`).
