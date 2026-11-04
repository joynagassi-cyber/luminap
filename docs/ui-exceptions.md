# Règle « Ionic d'abord » et exceptions UI

**Règle** (audit `docs/lumina-ionic-capacitor-permissions.md` §3.3, phase
A5) : avant tout composant maison, vérifier qu'il n'existe pas en Ionic.
Tailwind sert à la **mise en page** (espacements, grilles), pas à
reconstruire des contrôles. Toute exception est enregistrée dans ce
document, avec son motif et sa phase de migration. La checklist de PR
(`.github/pull_request_template.md`) impose le contrôle à chaque revue.

## Conventions Ionic de Lumina

### Mode (A5)

Aucun mode forcé : Ionic applique le mode de la plateforme (`md` Material
sur Android et le web non-iOS, `ios` sur iOS). Ne pas réintroduire de mode
explicite dans `setupIonicReact` sans décision documentée — garde
automatisée dans `src/lib/__tests__/android-permissions-matrix.test.ts`.

### Palette (A5)

Les variables `--ion-color-*` vivent dans `src/ionic/theme.css`, alimentées
par les jetons du design system (`src/App.css`). Chaque couleur chromatique
déclare ses quatre variables (base, `-rgb`, `-contrast(-rgb)`, `-shade`,
`-tint`) — sans les dérivées, les composants retombent sur les défauts
Ionic (bleus) dans leurs états activés. `applyTheme`
(`src/ionic/themes.ts`) force `--ion-color-primary(-rgb)` à runtime selon
le thème choisi ; les dérivées suivent automatiquement via `color-mix`.
Particularité assumée : chez Lumina, `secondary`/`tertiary` désignent des
**neutres** (surfaces), pas des accents.

### Fraîcheur des données au retour sur une page (A5)

Les pages à données consomment les hooks réactifs de `src/lib/dataLayer`
(@powersync/react `useQuery`) : une page gardée montée dans la pile Ionic
reçoit les nouvelles données par l'abonnement. `useIonViewWillEnter` n'est
donc **pas** nécessaire sur ces pages (preuve :
`src/lib/__tests__/data-hooks-freshness.test.ts` ; scénario complet validé
sur appareil, item 4.15). Le hook de cycle de vie reste l'outil indiqué
pour une page qui chargerait ses données de façon impérative ponctuelle.
Exception connue et assumée : `CentralAdmin` charge les détails d'une
organisation à la sélection (console d'administration — donnée
volontairement ponctuelle).

### Retours et confirmations (A6)

- **Toasts** : la façade `@/utils/toast`
  (`showSuccess/showError/showWarning/showInfo`) adossée au `IonToast`
  d'Ionic. Aucune librairie de toast tierce (sonner et Radix retirés).
- **Confirmations** : `ConfirmModal`
  (`src/components/ConfirmModal.tsx`), adossé à `IonAlert` — jamais de
  `window.confirm`. Le danger passe par le rôle `destructive` d'Ionic
  (bouton de confirmation en rouge, style natif de la plateforme).
- **Sélecteurs et dates** : `IonSelect` (popover) est le patron
  canonique — il ne reste aucun sélecteur HTML natif dans l'app. Les
  dates passent par `DatePicker` (IonDatetime en feuille, fr-FR).

### Permissions et erreurs (rappel, phases A2/A4)

Aucune demande de permission hors `PermissionService`, jamais au démarrage
à froid, toujours après l'écran d'explication. Aucune erreur avalée :
statuts typés et `reportError`.

## Exceptions en cours (composants maison avec équivalent Ionic)

| Composant maison | Équivalent Ionic | Motif / migration |
|---|---|---|
| `BottomNav` (barre d'onglets) | `IonTabs` / `IonTabBar` | Évaluation go/no-go prévue en **A8** (compatibilité routeur à prouver) |
| Listes : recherche, actions par ligne, filtres, interrupteurs | `IonSearchbar`, `IonItemSliding`, `IonRefresher`, `IonSegment`, `IonToggle`, `IonSkeletonText` | Migration **A7** |
| Boutons bruts `<button>` existants (~390 dans pages et composants) | `IonButton` | Héritage antérieur à la règle — pas de réécriture en masse ; tout **nouveau** contrôle suit la règle, et les écrans migrés en A6/A7 résorbent leur part |

**Résorbées en A6** : toasts (sonner + Radix → façade IonToast),
confirmations (`ConfirmModal` réécrit sur IonAlert et `window.confirm`
éliminé — livré par la PR #404, intégré par la présente), `DatePicker`
(grille maison → IonDatetime), sélecteurs (le
dernier élément natif d'OrgRoles → IonSelect ; le patron « feuille de
sélection » de l'audit visait un `SelectField` maison qui n'existe pas —
les 44+ `IonSelect` en popover sont le canon, F-02 clos sur preuves).

## Enregistrer une exception

Ajouter une ligne au tableau (composant, équivalent Ionic, motif daté)
dans la PR qui introduit le composant maison. Sans ligne ici, la PR doit
utiliser le composant Ionic.

---

## Mise à jour A6/A7 (4 nov. 2026)

| Sujet | Avant | Après |
|---|---|---|
| Toasts applicatifs | **deux** toasters Sonner montés (dont un via `next-themes`, dépendance Next.js inutilisée ailleurs) | façade `show*` adossée à **`IonToast`** (contrôleur Ionic, aucun hôte DOM) ; sonner et Radix Toast **retirés** |
| Position des toasts | `top-center` (web) puis essai en bas **rejeté** (masquait la barre d'onglets) | `top` — la leçon vaut pour l'IonToast natif : ne jamais recouvrir la navigation |
| Rafraîchissement manuel | aucun | `IonRefresher` (tirer pour synchroniser) sur `/finance` et `/members` |

Cheminement, pour mémoire : #412 avait d'abord consolidé **un seul**
toaster Sonner thématisé (corrigeant le double montage et le thème ignoré),
puis la bascule vers `IonToast` a été arbitrée à l'intégration de #411 —
règle « Ionic d'abord » (thème/mode/safe-areas natifs, zéro moteur web).
Les points d'appel passaient déjà par la façade `show*` : seuls les
importateurs directs de sonner ont été repris.

`IonRefresher` est bien un composant Ionic natif : c'est la règle
« Ionic d'abord » appliquée là où elle apporte quelque chose (geste natif,
inertie, retour visuel).

## A7 — ce qui est adopté, ce qui est refusé (4 nov. 2026)

| Composant | Décision | Raison vérifiable |
|---|---|---|
| `IonRefresher` | **adopté** — `/finance`, `/members` | geste natif, aucune alternative maison n'existait |
| `IonSegment` | **adopté** — `/balance` (Mois/Année) | remplace deux boutons `aria-pressed` faits main |
| `IonToggle` | **adopté** — `/settings/features` | remplace un `<button role="switch">` imitant un interrupteur |
| `IonSearchbar` | **adopté** — `/archives` | la page assemblait une icône + un `IonInput` à la main |
| `IonSkeletonText` | **refusé** | voir ci-dessous |
| `IonItemSliding` | **non adopté** | aucun écran n'a d'action secondaire cachée à révéler |

### Pourquoi `IonSkeletonText` est refusé

Le CSS du composant Ionic (`@ionic/core/.../skeleton-text.css`) contient
**zéro** occurrence de `prefers-reduced-motion` : l'animation `shimmer` y est
inconditionnelle. Notre primitive `Shimmer` (`src/components/Shimmer.tsx`,
`.shimmer` dans `App.css`) désactive explicitement le balayage pour les
utilisateurs ayant demandé une réduction des animations.

Adopter `IonSkeletonText` remplacerait donc un squelette accessible par un
squelette animé en boucle **subi** par ces utilisateurs. La règle « Ionic
d'abord » vise à réduire le code maison, pas à dégrader l'accessibilité — c'est
le seul motif pour lequel elle est écartée ici.

### Pourquoi `IonItemSliding` n'est pas adopté

Il sert à révéler des actions secondaires par glissement latéral. Nos listes
exposent leurs actions directement (boutons visibles ou menu). En ajouter
créerait une affordance supplémentaire à découvrir, au détriment des actions
principales. Aucun écran n'a exprimé ce besoin.

### `IonSegment` : d'abord reporté, finalement adopté

Historique utile, parce que le premier diagnostic était faux.

`IonSegment` a été implémenté puis **retiré** : `IonSegmentButton` est en
**shadow DOM**, les specs Cypress de `/balance` le cherchaient en light DOM, et
le nombre d'échecs E2E est monté de 3 à 4 puis 5. Les logs Cypress étant
inaccessibles depuis l'environnement de travail, je ne pouvais pas distinguer
une régression de ma part d'une instabilité préexistante — j'ai donc retiré le
changement plutôt que de fusionner à l'aveugle.

Le retrait a fait revenir le compte à 3… mais **`main` est ensuite passé à 0
échec** sans que je touche à rien. Le diagnostic « instabilité préexistante à
3 échecs » était donc incomplet : les 3 échecs venaient d'une base trop
ancienne (antérieure au correctif `ConfirmModal inputs={[]}`), pas du bruit.

Une fois `main` verte, `IonSegment` a été réappliqué, avec les deux specs
adaptées au shadow DOM (`includeShadowDom`, puis assertion sur `aria-selected`
de l'hôte plutôt que sur le `<button>` interne).

Leçon retenue : « la CI est instable » est une conclusion qu'il faut
démontrer, pas supposer. Ici elle était fausse, et elle a coûté un aller-retour.

## Pourquoi `/balance` est revenu à ses boutons (IonSegment reporté)

`IonSegment` a été implémenté, testé unitairement (le choix de période refait
bien le calcul), puis **retiré**. Raison : `IonSegmentButton` est en **shadow
DOM** (`encapsulation: "shadow"`). Les specs Cypress de `/balance` cherchaient
« Mois »/« Année » en light DOM : je les ai corrigées (`includeShadowDom`),
mais le nombre d'échecs E2E a continué de varier entre 3 et 5 sans jamais
revenir à la référence, **et les logs Cypress sont inaccessibles depuis cet
environnement** — impossible de distinguer une instabilité préexistante d'une
régression de ma part.

Décision : ne pas fusionner un changement dont l'effet E2E n'est pas mesurable
ici. Le gain (deux boutons faits main → un composant natif) ne justifie pas de
laisser la CI dans un état inconnu. **Reporté jusqu'à ce que les logs Cypress
soient lisibles** ; le code et le test unitaire existent dans l'historique de
la branche `arena/fde9a031-luminap` (commit `f74b46b`) et peuvent être repris
tel quel.

Les trois autres migrations (`IonToggle`, `IonSearchbar`, `IonRefresher`) ne
sont pas dans le shadow DOM et touchent des écrans qu'aucune spec ne pilote par
libellé : elles sont conservées.
