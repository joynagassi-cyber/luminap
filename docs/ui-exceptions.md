# Exceptions à la règle « Ionic d'abord »

> **Règle** (issue de `docs/lumina-ionic-capacitor-permissions.md` §3.2) :
> avant d'écrire un composant, vérifier s'il existe en Ionic. Tailwind sert à la
> **mise en page** (espacements, grilles, couleurs), **pas** à reconstruire des
> contrôles. Chaque exception ci-dessous est **explicite, datée et associée à une
> phase de sortie**.

## 1. Comment ajouter une exception

Une PR qui introduit un contrôle maison (bouton, champ, interrupteur, feuille,
toast, sélecteur, date, liste, onglet) doit :

1. citer dans sa description le composant Ionic équivalent **et** la raison de
   ne pas l'utiliser ;
2. ajouter une ligne au tableau §2 avec l'échéance de migration ;
3. ne pas ajouter de nouvelle dépendance UI (Radix, vaul, sonner…) sans la même
   justification.

## 2. Inventaire au 3 novembre 2026 (commit `f29ebf5` + phase A2/A3)

| Composant maison | Fichier | Équivalent Ionic | Pourquoi l'exception existe aujourd'hui | Sortie prévue |
|---|---|---|---|---|
| `BottomNav` | `src/components/BottomNav.tsx` | `IonTabs` / `IonTabBar` | barre d'onglets **dynamique** pilotée par `useFeatureConfig` (1 à 4 onglets), construite avant l'adoption d'Ionic | **A8** (décision go/no-go, §7 #5) |
| `TopHeader` | `src/components/TopHeader.tsx` | `IonHeader` + `IonToolbar` | contient le sélecteur d'organisation, la cloche de notifications et le menu ; il **enveloppe déjà** `IonHeader`/`IonToolbar` — seuls les boutons internes sont bruts | A5 (remplacer les `<button>` par `IonButton fill="clear"`) |
| `ConfirmModal` | `src/components/ConfirmModal.tsx` | `IonAlert` (ou `useIonAlert`) | gère une confirmation **avec saisie de texte** (`requiredText`), absente d'`IonAlert` | A6 |
| `DatePicker` | `src/components/DatePicker.tsx` | `IonDatetime` dans `IonModal` | calendrier custom (react-day-picker) | A6 |
| `BottomDrawer` | `src/components/BottomDrawer.tsx` | `IonModal` en feuille (`breakpoints`) | menu maison à base de `div` fixes, antérieur à l'usage d'`IonModal` ; pas de gestion du bouton retour Android | A6 |
| `SegmentedTabs` | `src/components/SegmentedTabs.tsx` | `IonSegment` | styles maison très proches du besoin | A7 |
| interrupteurs `role="switch"` | `SettingsNotifications.tsx`, réglages | `IonToggle` | construits à la main faute de `IonToggle` dans le projet | A7 |
| toasts `sonner` / `use-toast` | `src/components/ui/*` | `useIonToast` | deux bibliothèques déjà en place, utilisées partout | A6 |
| `Skeleton` / `Shimmer` / `LogoSpinner` | `src/components/*` | `IonSkeletonText` / `IonSpinner` | identité visuelle (logo) pour le spinner | A7 |
| `FormField` | `src/components/FormField.tsx` | `IonItem` + `IonLabel` | label **au-dessus** du champ (correctif P0-3 : le label flottant recouvrait la valeur) | à conserver : l'exception est un choix d'accessibilité documenté |
| `MoneyFormatPicker`, `ThemePicker`, `CapabilityBanner` | `src/components/*` | `IonSelect` / `IonToggle` | listes visuelles avec aperçu | A7 |

## 3. Exceptions **refusées** (à ne pas ajouter)

| Besoin | Composant maison refusé | Utiliser |
|---|---|---|
| Explication avant une permission système | page ou alerte maison | `PermissionPrimer` (`IonModal` en feuille) — **existe** |
| Confirmation destructive simple (sans saisie) | `window.confirm` / nouveau modal | `IonAlert` |
| Rafraîchir une liste | bouton « recharger » en haut de page | `IonRefresher` |
| Champs de recherche | `<input>` + icône | `IonSearchbar` |
| Chevron/icônes d'action | nouveau composant | `IonIcon` (à installer comme dépendance directe `ionicons`) |

## 4. Cas particulier : `PermissionPrimer` (créé en phase A2)

C'est la **première** feuille Ionic de l'application : `IonModal` avec
`initialBreakpoint` / `breakpoints` / `handleBehavior="cycle"`, trois boutons
`IonButton`. Il ne s'agit donc **pas** d'une exception à la règle mais de son
application — il sert de modèle pour A6 (sélecteurs et dates).

---

## Mise à jour A6 (4 nov. 2026) — deux exceptions RÉSORBÉES

| Composant | Avant | Après |
|---|---|---|
| `ConfirmModal` | feuille maison (divs fixes, piège de focus réimplémenté) | **`IonAlert`** — Ionic gère Échap, le piège de focus, la restitution du focus et le `role="alertdialog"`. Contrat d'appels identique : aucun écran touché. |
| Confirmation de récupération locale (`/settings/health`) | `window.confirm()` (modulateur **système bloquant** : gèle le thread JS, donc la synchronisation) | **`IonAlert`** |

`ConfirmModal` reste un composant du dépôt, mais **uniquement comme adaptateur**
autour d'`IonAlert` : il conserve la signature attendue par les 6 écrans qui
l'utilisent et ne contient plus de logique d'interface.

`requiredText` (saisie obligatoire) n'a pas d'équivalent IonAlert : il est
implémenté par un champ contrôlé dont la valeur arme le bouton. C'est la seule
partie encore écrite à la main — elle est minimale et testée.

Le mock de test `IonAlert` était un `div` vide : il est désormais **fidèle**
(titre, message, boutons cliquables, `onDidDismiss` une seule fois). Sans cela,
un composant bâti sur IonAlert était intestable — et une régression réelle
serait passée inaperçue.
