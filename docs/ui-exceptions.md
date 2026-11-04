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

### Permissions et erreurs (rappel, phases A2/A4)

Aucune demande de permission hors `PermissionService`, jamais au démarrage
à froid, toujours après l'écran d'explication. Aucune erreur avalée :
statuts typés et `reportError`.

## Exceptions en cours (composants maison avec équivalent Ionic)

| Composant maison | Équivalent Ionic | Motif / migration |
|---|---|---|
| `BottomNav` (barre d'onglets) | `IonTabs` / `IonTabBar` | Évaluation go/no-go prévue en **A8** (compatibilité routeur à prouver) |
| Toasts maison (`@/utils/toast`) | `useIonToast` | Migration **A6** |
| Confirmations maison | `IonAlert` / `useIonAlert` | Migration **A6** |
| `DatePicker` (design system) | `IonDatetime` (en modale/feuille) | Migration **A6** |
| Sélecteurs (lisibilité F-02) | `IonModal` en feuille + liste | Migration **A6** (les `IonSelect` actuels restent) |
| Listes : recherche, actions par ligne, filtres, interrupteurs | `IonSearchbar`, `IonItemSliding`, `IonRefresher`, `IonSegment`, `IonToggle`, `IonSkeletonText` | Migration **A7** |
| Boutons bruts `<button>` existants (~390 dans pages et composants) | `IonButton` | Héritage antérieur à la règle — pas de réécriture en masse ; tout **nouveau** contrôle suit la règle, et les écrans migrés en A6/A7 résorbent leur part |

## Enregistrer une exception

Ajouter une ligne au tableau (composant, équivalent Ionic, motif daté)
dans la PR qui introduit le composant maison. Sans ligne ici, la PR doit
utiliser le composant Ionic.

---

## Mise à jour A6/A7 (4 nov. 2026)

| Sujet | Avant | Après |
|---|---|---|
| Toasts applicatifs | **deux** toasters Sonner montés (dont un via `next-themes`, dépendance Next.js inutilisée ailleurs) | **un seul** `Toaster`, thème lu sur `data-theme` (source de vérité de l'app) |
| Position des toasts | `top-center` (recouvrait l'en-tête et la barre d'état) | `bottom-center`, au-dessus de la barre d'onglets |
| Rafraîchissement manuel | aucun | `IonRefresher` (tirer pour synchroniser) sur `/finance` et `/members` |

Les toasts restent **Sonner** et non `useIonToast` : Sonner est déjà en place
(45 points d'appel), accessible et thémé, tandis qu'`useIonToast` exigerait de
réécrire tous ces appels sans gain fonctionnel mesurable. L'exception est donc
**assumée et documentée** ici plutôt que contournée en silence.

`IonRefresher` en revanche est bien un composant Ionic natif : c'est la règle
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
