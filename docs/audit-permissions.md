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

## 4. Checklist appareil — à remplir par Joy (ferme A0, valide A2, A3, l'arbitrage A4, A5 et A6)

Sur Android 13+ de préférence (idéalement aussi 12/14/15), APK **après** la PR A6
(les items 4.1→4.7 valident A0/A1/A2 ; 4.8→4.12 valident A3 ; 4.13 valide l'arbitrage
A4 ; 4.14→4.16 valident A5 ; 4.17→4.19 valident A6) :

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
- [ ] **4.8** (A3) Démarrage à froid : un seul enchaînement perceptible (écran système
      → page `/splash`), aucun écran blanc prolongé ni double logo. Résultat : …
- [ ] **4.9** (A3) Barre d'état (suite du 4.5) : thème SOMBRE lisible aussi, fond
      assorti à l'en-tête, bascule correcte quand le mode système change. Résultat : …
- [ ] **4.10** (A3) Bas de l'écran : barre d'onglets ni recouverte par ◀ ● ■ ni
      surélevée d'un vide — navigation 3 boutons ET gestuelle. Résultat : …
- [ ] **4.11** (A3) Formulaire de transaction, clavier ouvert : le bouton
      d'enregistrement reste visible/utilisable ; idem écran de connexion (contenu
      pas poussé hors écran). Résultat : …
- [ ] **4.12** (A3) Retour haptique : vibration discrète à l'enregistrement d'une
      transaction (et pattern d'erreur si échec), et au décodage d'un QR par le
      scanner. Résultat : …
- [ ] **4.13** (A4) Changement de compte sur le même appareil : noter une saisie
      hors-ligne avec le compte A, se déconnecter, se reconnecter avec un compte B
      → aucune donnée de A (église, transactions) ne doit apparaître ; revenir au
      compte A → sa saisie en attente est toujours là (arbitrage de l'étude C-07c
      §6 : la réplique n'est pas purgée au changement de compte). Résultat : …
- [ ] **4.14** (A5) Mode Material sur Android : parcourir Dashboard, Historique,
      Nouvelle transaction, Membres, Réglages → contrôles au rendu Android attendu
      (boutons, champs, sélecteurs, interrupteurs), ondulation au toucher,
      transitions fluides, rien de cassé ni de tronqué. Résultat : …
- [ ] **4.15** (A5) Fraîcheur au retour : depuis Historique, créer une transaction,
      revenir en arrière → la liste affiche la nouvelle transaction sans relancer
      l'application ni recharger la page. Résultat : …
- [ ] **4.16** (A5) Palette : rester appuyé sur un bouton primaire (accent) → la
      teinte d'appui suit l'accent du thème, sans flash bleu ; refaire après un
      changement de thème (un clair, un sombre). Résultat : …
- [ ] **4.17** (A6) Toasts natifs : enregistrer une transaction (toast vert de
      succès en bas d'écran) puis provoquer une erreur (import CSV invalide →
      toast rouge « Lecture impossible ») : messages lisibles, disparition
      automatique, pas d'empilement parasite. Résultat : …
- [ ] **4.18** (A6) Confirmation destructive : Archives → « Supprimer
      définitivement » un élément → alerte au style Android, bouton de
      confirmation en rouge ; « Annuler » ou tap à l'extérieur ne suppriment
      rien ; confirmer supprime effectivement. Résultat : …
- [ ] **4.19** (A6) Date d'événement : Nouvel événement → ouvrir le sélecteur de
      date (feuille calendrier en français, semaine commençant le lundi),
      choisir un jour, « Valider » → la date affichée puis enregistrée est
      exactement celle choisie (aucun décalage d'un jour). Résultat : …

## 5. Porte de sortie A1 (cette PR)

- Build Android propre (validé par la CI : Build Application + Build Debug APK —
  pas de SDK dans l'environnement de l'agent).
- Liste de permissions verrouillée par `src/lib/__tests__/android-permissions-matrix.test.ts`.
- Auto-mise à jour : `checkForUpdate` ne propose rien sans empreinte
  (`checkForUpdate-sha256.test.ts`) et le natif rejette sans elle.
