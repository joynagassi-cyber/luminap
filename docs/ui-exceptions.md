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
