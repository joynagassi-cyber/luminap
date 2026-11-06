# Lumina — Gouvernance & décision de stack (plateforme)

> Statut : **proposition à ratifier** (par le propriétaire du produit).
> Date : 2026-11-04. Auteur : agent (OpenHands), à la demande de Joy.
> Légende : **[Fait]** = mesuré dans le dépôt (commande/chemin cité) ;
> **[Hypothèse]** = cohérent avec les faits mais non prouvé ici ;
> **[Incertain]** = à vérifier.
> Aucune source, donnée, ni test n'est inventé. Là où je n'ai pas pu vérifier,
> c'est écrit.

---

## 0. Verdict

L'application a été conçue, gouvernée et documentée comme une **application
web** (SPA + backend, un seul code pour tous les navigateurs), alors que le
produit est un **client Android natif offline-first** avec, à terme, iOS et
desktop. L'écart entre ces deux modèles est la **cause systémique** des bugs
rencontrés — pas les versions des bibliothèques.

**Décision recommandée : on reste sur Capacitor + Ionic + React + PowerSync
(pas de réécriture), MAIS on change de gouvernance.** Le déficit est un déficit
de *pratique et de processus*, pas de *technologie*. Preuves ci-dessous.

---

## 1. Faits mesurés (preuves)

### 1.1 Les versions ne sont pas le problème **[Fait]**

Comparaison installé vs dernière version publiée (npm `registry.npmjs.org`,
2026-11-04) :

| Paquet | Installé | Dernière | Écart |
|---|---|---|---|
| `@capacitor/core` / `android` | 8.6.0 | 8.6.0 | — |
| `@powersync/web` / `react` / `capacitor` | 2.6.0 / 2.2.0 / 0.10.0 | idem | — |
| `@capacitor-community/sqlite` | 8.1.1 | 8.1.1 | — |
| `@ionic/react` | 9.0.2 | 9.0.10 | patch |
| `react` | 19.2.8 | 19.3.1 | patch |
| `vite` | 8.2.2 | 8.3.6 | patch |
| `@supabase/supabase-js` | 2.114.0 | 2.119.0 | patch |
| `typescript` | 5.9.3 | 7.0.2 | **majeur** (TS 7 = Go, à planifier) |

Les dépendances sont **quasi toutes à jour**. Le diagnostic « mauvaises
versions » est réfuté par la mesure.

### 1.2 La stack choisie est la bonne, et l'offline natif est déjà là **[Fait]**

- `src/lib/powersync/index.ts` importe `PowerSyncDatabase` depuis
  **`@powersync/capacitor`** (SQLite **natif** via `@capacitor-community/sqlite`
  sur Android, repli WASM sur navigateur). C'est l'implémentation correcte du
  stockage durable.
- `android/variables.gradle` : `minSdk 24`, `compileSdk/targetSdk 36`
  (Capacitor 8) — cohérent et à jour.
- Le problème « hors ligne » (R175) n'était **pas** le stockage mais une
  **lecture réseau sans repli local** au démarrage (voir RISQUES.md R175).

### 1.3 Le vrai déficit : l'application n'exploite pas la plateforme **[Fait]**

Comptages (`grep` sur `src/`) :

| Indicateur | Valeur | Lecture |
|---|---|---|
| Fichiers avec `IonPage` | 67 | Ionic sert de **coque** |
| `<IonButton` | 89 | |
| `<button>` HTML | **414** | UI construite en **HTML + Tailwind** |
| `<IonIcon` | **0** | Icônes `lucide-react` dans **128 fichiers** |
| `<IonTabs` | **0** | tab bar custom (cf. `BottomNav`) |
| `navigator.onLine` (hors tests) | **14** | API **navigateur**, pas `@capacitor/network` |

Autrement dit : Ionic est installé mais **sous-exploité** ; les primitives qui
donnent le « comportement natif » (feuilles, pull-to-refresh, swipe, retour
haptique, transitions de page) sont absentes.

### 1.4 Un adaptateur réseau natif existe mais est **mort** **[Fait]**

- `src/adapters/native/NetworkAdapter.ts` encapsule `@capacitor/network` avec
  repli `navigator.onLine` — c'est la bonne pratique.
- Mais il n'est **importé nulle part** hors de son barrel `native/index.ts`
  (aucun consommateur applicatif). En production, le code lit donc
  `navigator.onLine` **en direct** (14 sites), dont `src/lib/auth.ts:158` et
  `src/lib/dataLayer.ts:3601`.

Conséquence concrète : dans une WebView Android, `navigator.onLine` est
**notoirement peu fiable** (peut rester `true` sans connectivité réelle, ou
`false` pendant une reconnexion). C'est une **hypothèse forte [Hypothèse]** de
contribution aux bugs « l'app croit être en ligne / hors ligne à contretemps ».
La détection d'état réseau correcte sur Android passe par `@capacitor/network`.

### 1.5 La CI ne teste pas l'application réelle **[Fait]**

- `ci.yml` : `lint`, `typecheck`, `unit (Vitest)`, `build` (web), `security`,
  `e2e (Cypress sur dev server Chromium)`.
- **Aucun test instrumenté Android** (`android/app/src/androidTest/` ne contient
  que l'`ExampleInstrumentedTest` généré par Capacitor).
- **Maestro** était présent (`.maestro/work/01-home-load.yaml`,
  `scripts/maestro-*.cjs`) mais absent de la CI. **Décision (2026-11-06) : écarté**
  — inutile pour ce projet ; la couverture appareil repose sur la DoD §4.4
  (vérification manuelle en mode avion / tests instrumentés).
- Les specs `cypress/e2e/offline-write-sync.cy.ts` **documentent elles-mêmes**
  qu'elles ne peuvent pas prouver le drain de la file d'upload en headless (le
  worker WASM ne se connecte pas sous Cypress).

⇒ **Aucun gate automatique ne s'exécute sur l'artefact que l'utilisateur
installe (l'APK).** Les bugs terrain sont donc découverts par l'utilisateur.

### 1.6 La documentation a divergé **[Fait]**

- **260 fichiers `.md`** dans `docs/`, dont de nombreux snapshots « terminés »
  redondants (`MIGRATION_STATE.md`, `MIGRATION_STATE_FINAL.md`,
  `MIGRATION_COMPLETE.md`, `MIGRATION_100_COMPLETE.md`, `MIGRATION_FINAL_SUMMARY.md`,
  `MIGRATION_VERIFICATION.md`, `POWERSYNC_FINAL_SETUP.md`, `PLATFORM_COMPLETE.md`…).
- **135 fichiers** dans `docs/agent/receipts/` (un reçu par tâche).
- **Deux documents d'architecture** coexistaient : `docs/ARCHITECTURE.md` (projet)
  et `docs/FINAL_ARCHITECTURE_VERIFICATION.md`.
- **Correction (2026-11-04)** : `AGENTS.md` **n'est pas** en contradiction — il
  précise lui-même que `nitro` / `h3` restent des « déclarations historiques »
  (vérifié : `pg` a bien été retiré ; `nitro`/`h3`/`jiti`/`@supabase/server`
  subsistent mais ne sont plus chargés, `server/` étant absent). Le vrai problème
  est le **volume et la redondance**, pas une affirmation fausse.

⇒ Personne (humain ou agent) ne peut dire **quel document est la vérité** sans
inventaire. C'est exactement le symptôme « mauvaise documentation suivi » décrit.

**Correctif appliqué** (chantier #1) : 11 documents « terminés » déplacés vers
`docs/archive/` (avec `docs/archive/README.md`), ramenant `docs/*.md` de 48 à 37
fichiers de premier niveau. Voir §4.1.

### 1.7 Un audit plateforme existe déjà… et n'a pas été institutionalisé **[Fait]**

`docs/lumina-ionic-capacitor-permissions.md` (3 nov. 2026) contient déjà le
diagnostic « Ionic sous-exploité », « Capacitor pas durci », la matrice de
permissions Android, et un plan « Ionic d'abord ». **Ce constat n'a pas été
transformé en règles opposables** (il vit comme un document parmi 260). Preuve
que le problème est de **gouvernance** : l'analyse était juste, elle n'a pas
changé les pratiques.

---

## 2. Hypothèses & incertitudes

- **[Hypothèse]** Une part des bugs « hors ligne » vient de `navigator.onLine`
  lu en direct dans la WebView (voir 1.4). À confirmer par instrumentation sur
  appareil (`@capacitor/network` vs `navigator.onLine` en mode avion).
- **[Hypothèse]** Des écarts d'UI (clavier, insets, tab bar) viennent du mélange
  HTML/Tailwind + coque Ionic. À confirmer écran par écran.
- **[Incertain]** Comportement exact de PowerSync Cloud sur l'audience JWT
  (`PSYNC_S2105`) mentionné dans le code — non vérifié ici.
- **[Incertain]** Le plugin officiel OneSignal 5.x vs le pont maison
  (`OneSignalBridgePlugin`) — dette documentée, non réévaluée ici.

---

## 3. Décision de stack

**Recommandation : conserver Capacitor 8 + Ionic 9 + React 19 + PowerSync 2 +
Supabase. Ne pas réécrire.**

Justification :
1. L'offline natif **est déjà** correctement câblé (1.2) ; les bugs sont des
   **défauts d'intégration**, pas de choix de framework.
2. Une réécriture (React Native / Flutter / Kotlin) jetterait : 379 fichiers
   source, 306 fichiers de tests, la synchro PowerSync, et **~146 politiques
   RLS** + les fonctions SQL `SECURITY DEFINER` déjà validées côté Supabase. Le
   coût de réécriture est de plusieurs mois ; le gain est incertain.
3. Les primitives « natives » recherchées (feuilles, haptique, transitions,
   pull-to-refresh) sont **déjà disponibles** dans Ionic, installé — il suffit de
   les utiliser.

**Ce qu'on change n'est donc pas la stack, c'est la discipline** (section 4).

*Cas où l'on rouvrirait le débat* : si un besoin produit exige des performances
graphiques natives (ex. caméra temps réel lourde) ou un accès système que
Capacitor ne couvre pas. À ce jour, aucun fait ne le montre.

---

## 4. Modèle de gouvernance proposé

### 4.1 Sources de vérité uniques (SSOT) — et on supprime le reste

| Domaine | Fichier unique | Règle |
|---|---|---|
| Architecture | `docs/ARCHITECTURE.md` | `FINAL_ARCHITECTURE_VERIFICATION.md` archivé (2026-11-04). |
| Décisions | `docs/agent/DECISIONS.md` | Format ADR : Contexte / Décision / Alternatives / Conséquence. |
| Risques | `docs/agent/RISQUES.md` | Un id `Rn`, statut, preuve. |
| Instructions agents | `AGENTS.md` | **Vérifié exact** (2026-11-04) : il documente lui-même la rétention historique de `nitro`/`h3`. Le garder à jour. |
| Cible plateforme | **ce document** | Ratifié, il devient la charte. |
| Reste (`docs/`) | — | **Fait le 2026-11-04** : 11 snapshots « terminés » déplacés vers `docs/archive/` (voir son README). Règle : un nouveau snapshot terminé va directement à l'archive. |

**Règle** : un fait technique n'existe que s'il est dans la SSOT du domaine.
Toute autre mention est un **lien**, pas une copie.

### 4.2 Contrôle de changement (empêche la dérive)

1. **ADR obligatoire** pour tout changement d'architecture, de dépendance
   majeure, ou de frontière de plateforme. Pas d'ADR ⇒ pas de merge.
2. **Les guards de test sont la loi exécutable.** Le projet en a déjà
   (`route-state-wiring`, `design-ratchet`, `android-permissions-matrix`…) :
   chaque ADR produit (ou met à jour) un guard qui **échoue** si la règle est
   violée. C'est ce qui rend une règle opposable au lieu d'un vœu.
3. **Politique de dépendances** : versions épinglées (`pnpm` + lockfile), toute
   montée majeure = ADR + test. Objectif : éviter la classe de bug « bcprov » /
   OneSignal déjà rencontrée.

### 4.3 Couche de capacité plateforme (le correctif structurel)

Un **seul** point d'accès par capacité native, jamais l'API navigateur en direct.

- Créer/valider `src/platform/` (ou généraliser `src/adapters/native/`) exposant
  `network`, `storage`, `notifications`, `filesystem`, `haptics`, `keyboard`,
  `app-state`, `external-links`.
- **Interdire** les API navigateur à comportement natif divergent dans `src/`
  **hors** de la couche plateforme (guard de scan) :
  - réseau : `navigator.onLine`, `navigator.connection`, `online`/`offline` ;
  - ouverture de lien : `window.open`, `target="_blank"` (no-op en WebView) →
    façade `src/platform/openExternal.ts` (`@capacitor/browser` sur natif).
- Brancher l'existant : `NetworkAdapter` (aujourd'hui mort, 1.4) devient **la**
  source d'état réseau ; les sites `navigator.onLine` migrent.

### 4.4 « Definition of Done » — plateforme Android

Une tâche n'est « terminée » que si, **en plus** des tests unitaires :

- [ ] Elle passe sur un **appareil/émulateur Android réel**, testée en **mode
      avion** (le cas d'usage central du produit).
- [ ] Aucune régression de **permissions** (matrice
      `docs/lumina-ionic-capacitor-permissions.md`).
- [ ] Si UI : utilise les composants Ionic **quand ils existent** (« Ionic
      d'abord »), avec justification écrite sinon.
- [ ] Les points natifs critiques sont couverts par un **test instrumenté**
      (`androidTest/`) ou une **vérification manuelle appareil** tracée dans la PR.

### 4.5 Tests sur l'artefact réel

- **Tests instrumentés Android** (`androidTest/`) pour les points natifs
  critiques (stockage chiffré, insets, réseau, self-update).
- **Maestro écarté** (décision utilisateur, 2026-11-06) : jugé inutile pour ce
  projet. Les scénarios `.maestro/` ne sont plus maintenus comme critère.
- Critère : **aucune release sans qu'un test ou une vérification appareil se soit
  exécuté sur l'APK** (mode avion inclus).

---

## 5. Feuille de route (séquencée, du plus rentable au plus lourd)

| # | Chantier | Pourquoi | Effort | Preuve de réussite |
|---|---|---|---|---|
| 1 | ✅ **Geler la doc** : `docs/archive/` créé, 11 snapshots « terminés » archivés, `AGENTS.md` vérifié exact | Stoppe la dérive, réduit le bruit | fait | `docs/*.md` 48→37 ; archive documentée |
| 2 | ✅ **Couche plateforme** : façades `src/platform/networkState` (réseau) **et** `openExternal` (liens) ; `NetworkAdapter` réparé (détection natif) ; sites migrés ; `navigator.onLine`/`window.open`/`target=_blank` bannis hors couche (guard, dette = 0) | Corrige des causes plausibles de bug offline/natif | fait | 0 site hors `src/platform`/`adapters` ; guard vert |
| 3 | ~~**Maestro en CI** sur APK debug~~ **Écarté** (décision utilisateur 2026-11-06) | — | — | — |
| 4 | **Adoption Ionic « d'abord »** écran par écran (feuilles, pull-to-refresh, haptique, transitions) | Ressenti natif | continu | Ratio `<IonButton>/<button>` en hausse ; 0 régression |
| 5 | **DoD Android** appliquée à toute PR (checklist + test avion) | Empêche la récidive | immédiat | Toute PR UI/offline référence un test/vérif appareil |
| 6 | **ADR + guards** systématiques | Rend les règles opposables | continu | Chaque ADR a son guard |
| 7 | Planifier **TypeScript 7** (majeur) | Sécurité de mise à jour | 1 j d'éval | ADR + CI verte |

---

## 6. Critère de succès observable (comment on saura que c'est réglé)

1. **Offline** : sur un APK de production, mode avion activé → l'app reste
   **utilisable** (listes peuplées depuis la réplique, écritures mises en file,
   message « synchronisation en attente » honnête). *Mesure : vérification
   appareil en mode avion (DoD §4.4), tracée dans la PR de release.*
2. **Doc** : `docs/` contient **une** source de vérité par domaine.
3. **Plateforme** : zéro lecture directe d'API navigateur hors couche plateforme
   (guard vert).
4. **Artefact** : une vérification appareil (ou un test instrumenté) s'exécute sur
   l'APK avant chaque release.

**Vérification indépendante** : les points 2 et 3 se vérifient par un test de scan
(vert/rouge), pas par une affirmation ; les points 1 et 4 par une trace de
vérification appareil attachée à la PR.

---

## 7. Ce qu'il me faut pour aller plus loin (accès/données manquants)

- **Un appareil ou émulateur Android** accessible depuis l'environnement pour
  exécuter `adb logcat` et **prouver** le comportement offline réel. Sans cela, je
  ne peux que raisonner statiquement.
- **Confirmation produit** : Android est la priorité, iOS/desktop plus tard —
  à écrire dans la charte (section 3).

---

## 8. État d'avancement

Chantiers **#1 (geler la doc)** et **#2 (couche plateforme : réseau + liens
externes)** : **faits et fusionnés** (PR #445). Ils produisent des **preuves
exécutables** (guards) qui verrouillent la gouvernance au lieu de la laisser sur
papier. Suite : **#4 (Ionic « d'abord »)**, **#5 (DoD Android)**, **#6 (ADR +
guards)**.
