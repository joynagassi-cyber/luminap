# Étude C-07c — stockage sécurisé des jetons et chiffrement de la base locale

Phase **A4** de l'audit `docs/lumina-ionic-capacitor-permissions.md` (§C-07c :
« *étudier* le chiffrement de la base et le stockage sécurisé des jetons »).
Base vérifiée : `main` @ `b6b5c4d` (2026-11-04). Le verrou d'application
(C-07b) est hors de ce plan (décision §6). Le volet « aucune donnée en
`adb backup` » de la porte A4 est déjà fermé par A1 (`allowBackup="false"` +
règles d'extraction) et reste à confirmer sur appareil (item 4.7 de
`docs/audit-permissions.md`).

**Conclusion en une phrase** : ne pas migrer les jetons maintenant — le faire
en phase dédiée couplée à la montée Capacitor 8, avec le plan §5 ; le
chiffrement de la base n'est pas disponible sur la pile PowerSync web
installée (no-go motivé §4). Le correctif C-11, lui, est livré dans la même
PR que cette étude (§7).

---

## 1. Inventaire — où vivent les secrets aujourd'hui (vérifié dans le code)

| Artefact | Emplacement | Effacement | Commentaire |
|---|---|---|---|
| Session Supabase (`sb-<ref>-auth-token`) | `localStorage` de la WebView — défaut supabase-js, aucun adaptateur `storage` personnalisé (`src/lib/auth.ts`, `createClient` + `persistSession: true`) | Clé active retirée à la déconnexion locale | Profil WebView dans le sandbox de l'app ; hors sauvegardes (A1) |
| Copie de session `lumina-session-backup` | `localStorage` (access + refresh tokens) | Purgée au changement de propriétaire (`deleteAllLocalData`) | **Choix produit délibéré** : alimente « Mes comptes » (reconnexion sans mot de passe) ; la « déconnexion » est locale, **sans révocation serveur** (documenté dans `signOut()`) |
| Jeton PowerSync | Aucun stockage applicatif : dérivé de la session à chaque connexion (`SupabaseConnector.fetchCredentials`) | — | Éphémère, en mémoire |
| `Preferences` (stockage natif) | 4 écritures : miroir des tags OneSignal, horodatage permissions, horodatage de l'updater APK, `StorageAdapter` (aucun consommateur prod) | Scope appareil, pas de purge au changement de compte | **Aucun secret** — données d'appareil, non personnelles |
| Réplique PowerSync (données financières synchronisées) | WA-SQLite (@powersync/web) — OPFS/IndexedDB du profil WebView | **Non purgée** au changement de compte (arbitrage §6) ; `disconnectPowerSync()` existe mais n'a aucun appelant | Lectures scopées organisation partout ; source de vérité = serveur |
| Fichiers d'export générés (PDF/CSV) | `Directory.Cache` (`src/lib/download.ts`) | Purgeables par l'OS à tout moment | Transitaires : remis à l'utilisateur via l'écran de partage |
| Clés `lumina-*` (config locale, thème, onboarding…) | `localStorage` | Purge complète au changement de propriétaire | Non secrètes (l'inventaire compte pour la purge, §6) |

Gardes posées par la PR A4 (`android-permissions-matrix.test.ts`) : le repli
du `StorageAdapter` doit rester journalisé (C-11), et seuls `auth.ts`,
`SupabaseConnector.ts` et `powersync/index.ts` peuvent manipuler
`refresh_token` — toute nouvelle copie de jeton fait échouer le test et force
la mise à jour de cette étude.

## 2. Modèle de menaces — vecteurs fermés et résiduels

**Fermés** : extraction par `adb backup`/sauvegarde cloud (A1) ; inspection
de la WebView en production (`webContentsDebuggingEnabled` durci, A1) ;
lecture par une autre application (sandbox Android : profil WebView et
`Preferences` sont privés à l'app).

**Atténuations existantes** : rotation des refresh tokens côté Supabase Auth
avec détection de réutilisation (la famille de jetons est révoquée si un
ancien refresh token ressurgit) ; flux PKCE ; chemin d'invalidation de
session géré (`handleSessionInvalidated`).

**Résiduels** :
1. **XSS dans la WebView** (notre code ou une dépendance compromise) :
   `localStorage` y est intégralement lisible → session **et** sa copie de
   secours. C'est l'argument n°1 en faveur du coffre natif (§3) : un plugin
   secure-storage ne rend les jetons accessibles que via son API native,
   hors de portée d'un script injecté qui ne connaîtrait pas l'API… nuance :
   un XSS pleinement exploité peut appeler le pont Capacitor aussi ; le
   coffre réduit la surface (pas d'exfiltration par simple lecture du DOM
   storage, pas de persistance cross-contexte), il ne l'annule pas.
2. **Appareil rooté/jailbreaké ou extraction physique** (bootloader
   déverrouillé) : le sandbox tombe ; jetons et réplique sont lisibles. Le
   coffre natif (Keystore avec clés non exportables) relève fortement la
   barre pour les jetons ; pour la base chiffrée, tout dépend d'où vit la
   clé (§4).
3. **Appareil partagé laissé déverrouillé** : accès applicatif direct —
   relève du verrou d'app (C-07b, reporté §6), pas du stockage.

## 3. Option A — jetons en coffre natif (Keystore/Keychain)

Principe : fournir à supabase-js un adaptateur `storage` asynchrone adossé à
un plugin « secure storage » (Android : EncryptedSharedPreferences + Android
Keystore ; iOS : Keychain). Candidats usuels : `capacitor-secure-storage-plugin`,
`@aparajita/capacitor-secure-storage`.

**État de l'écosystème (registre npm, 2026-11-04)** : les dernières majeures
des deux candidats ciblent **Capacitor 8** (ex. `capacitor-secure-storage-plugin`
0.13.0 exige `@capacitor/core >= 8`). Lumina est en Capacitor 7 : adopter
maintenant = figer une ligne Capacitor 7 qui ne recevra plus de correctifs,
pour un composant de sécurité.

**Bloqueurs propres à Lumina (vérifiés)** :
- **Lectures synchrones de la session** dans `auth.ts` (chemins de secours
  hors-ligne, y compris la copie `lumina-session-backup`) : un coffre natif
  est asynchrone → il faut une hydratation unique pré-boot servie ensuite
  depuis la mémoire. C'est le module le plus fragile de l'app (boot,
  hors-ligne, multi-comptes).
- **La copie de secours doit migrer aussi** : mettre la seule clé principale
  au coffre en laissant `lumina-session-backup` en clair = gain quasi nul.
- **Migration de la base installée** : déplacer les jetons existants puis
  purger `localStorage`, sans déconnecter les appareils en production
  (distribution APK directe, pas de déploiement progressif Play).
- **Ordre de boot PowerSync** : le connecteur lit la session très tôt ; le
  coffre doit être hydraté avant la première connexion.
- **Validation uniquement sur appareil** : boot hors-ligne, refresh après
  mort du processus, changement de compte, mise à jour par-dessus une
  version « localStorage ». Aucun de ces scénarios n'est testable en CI.

**Recommandation : GO, mais en phase dédiée couplée à la montée Capacitor 8**
(ou immédiatement après), selon le plan §5. Pas en A4, pas à l'aveugle.

## 4. Option B — chiffrement de la réplique locale

Pile installée : `@powersync/web` (WA-SQLite dans la WebView, OPFS/IndexedDB).
Le SDK JavaScript n'expose **aucune option de chiffrement supportée** :
PowerSync embarque bien un build SQLite3 Multiple Ciphers dans son SDK Web,
mais « not designed for standalone use outside PowerSync at the moment »
(blog PowerSync, mai 2026). Le chiffrement clé-en-main (`EncryptionOptions`,
sqlite3mc) existe dans le **SDK Dart/Flutter v2** — une autre pile que celle
de Lumina.

Alternatives écartées : build WA-SQLite chiffré maison (fork du moteur de
stockage du moteur de sync — maintenance et risque d'intégrité
disproportionnés) ; migration vers un SQLite natif via plugin (réécriture de
la couche de synchronisation). Et même chiffrée, la base exigerait une clé
présente sur l'appareil (coffre natif au mieux) : le gain réel se concentre
sur le scénario « extraction du fichier seul », déjà couvert par le sandbox
+ `allowBackup=false`.

**Recommandation : NO-GO sur la pile actuelle.** Déclencheurs de
réévaluation : `EncryptionOptions` dans le SDK JS PowerSync, ou changement
de moteur de sync. Le risque « appareil aux mains d'un tiers » est
aujourd'hui mieux traité par le verrou d'app (C-07b, reporté) que par un
chiffrement de base.

## 5. Plan de migration des jetons (à exécuter le jour du GO)

1. Monter Capacitor 8 et prendre la ligne à jour du plugin secure-storage
   (ou, si la montée tarde, figer explicitement une ligne Capacitor 7 en
   connaissance de cause).
2. Adaptateur `storage` supabase-js → coffre natif. **Inclure
   `lumina-session-backup`** dans le même coffre (ou trancher à cette
   occasion l'évolution de « Mes comptes »).
3. Migration unique au boot : coffre vide + clé `localStorage` présente →
   copie dans le coffre, vérification, purge de `localStorage`. Aucune
   déconnexion silencieuse en cas d'échec (repli journalisé, pas avalé).
4. Convertir les lectures synchrones d'`auth.ts` en hydratation pré-boot
   unique (mémoire), avant l'init PowerSync.
5. Critères d'acceptation (appareil, avant merge) : boot hors-ligne OK ;
   refresh après kill du processus ; changement de compte OK ; mise à jour
   depuis la version « localStorage » sans déconnexion ; `adb backup`
   toujours vide ; aucune donnée de l'ancien compte après changement de
   propriétaire (item 4.13).

## 6. Effacement et changement de compte — état vérifié

`ensureLocalDataOwnedBy` (changement de propriétaire) → `deleteAllLocalData`
purge : toutes les clés `lumina-*` (dont la copie de session), le store
local-first en mémoire, le cache de données, et l'organisation en mémoire
(`resetOrganizationId`). La session active `sb-*` relève de la déconnexion
(`signOut`), pas de la purge.

**Arbitrage assumé — la réplique PowerSync n'est pas purgée** : ses écritures
hors-ligne en attente d'upload seraient perdues si un changement de compte
la vidait (la file CRUD vit dans la même base). Les lectures étant scopées
organisation et la source de vérité côté serveur (RLS), les données d'une
autre organisation restent inaccessibles via l'app ; elles demeurent
présentes au repos dans le sandbox. À revalider si le contexte « appareils
partagés entre églises » devient la norme — une purge **après** confirmation
que la file d'upload est vide serait alors la voie sûre. `Preferences` n'est
pas purgé non plus : contenu d'appareil non personnel (§1), par design.

## 7. C-11 — repli silencieux du StorageAdapter (corrigé dans cette PR)

Avant : en cas d'échec du `Preferences` natif, chaque méthode retombait sur
`localStorage` en silence (`catch` vide) — avec un risque réel de **fourche**
(écriture dans un magasin, lecture ultérieure dans l'autre) et une panne du
stockage natif indétectable.

Après : le repli est conservé (disponibilité d'abord) mais journalisé via
`reportError` (`source: "storage-adapter-fallback"`), borné à un signal par
session pour ne pas inonder le puits d'erreurs. Fait notable : l'adaptateur
n'a **aucun consommateur en production** à ce jour — correctif préventif,
sans risque fonctionnel, qui le rend adoptable sans piège. Test associé :
panne native simulée (`mockRejectedValue`) → valeur lue depuis
`localStorage` **et** signal émis une seule fois.

## 8. Décisions à acter par le mainteneur (validation de cette PR)

- [ ] Acter le report « jetons en coffre natif » à la phase Capacitor 8
      (recommandé) — ou décider de l'avancer sur une ligne Capacitor 7 figée.
- [ ] Acter le no-go « chiffrement de la base » sur `@powersync/web`
      (recommandé), avec les déclencheurs de réévaluation du §4.
- [ ] Confirmer l'arbitrage « réplique conservée au changement de compte »
      (§6) — validable sur appareil via l'item 4.13.

## Sources

- Registre npm (2026-11-04) : `capacitor-secure-storage-plugin@0.13.0`
  (`peerDependencies: @capacitor/core >=8.0.0`) —
  https://www.npmjs.com/package/capacitor-secure-storage-plugin
- PowerSync, « The Current State Of SQLite Persistence On The Web » (mai
  2026), section Encryption — https://powersync.com/blog/sqlite-persistence-on-the-web
- PowerSync Dart/Flutter SDK v2.0 — `EncryptionOptions` (sqlite3mc) —
  https://releases.powersync.com/announcements/powersync-dart-flutter-sdk-v2-0
- Code : `src/lib/auth.ts` (session, copie de secours, `signOut`),
  `src/lib/dataLayer.ts` (`deleteAllLocalData`, `ensureLocalDataOwnedBy`),
  `src/lib/powersync/` (`fetchCredentials`, `disconnectPowerSync`),
  `src/adapters/native/StorageAdapter.ts` (C-11), `src/lib/download.ts`.
