# Lumina — Design System v1 (spécification complète + plan de migration)

> Destinataire : agent de codage (non multimodal → toute vérification passe par des tests, scripts et lint, jamais par « regarder »).
> Stack **constatée dans le dépôt** (audit du 2 nov. 2026, commit `e7abaa7`) : React 19, Ionic React 9, Capacitor 7, Tailwind 3.4, shadcn/Radix (49 fichiers dans `components/ui`), PowerSync + Supabase, Zustand. **À confirmer en Phase 0** : bibliothèque d'icônes et police réellement utilisées. Les bugs fonctionnels/métier sont dans `lumina-bugs-backend-et-logique-metier.md` (piste séparée).
> Direction visuelle : **on garde l'identité existante** (sombre d'abord, accent orange, logo noir/orange). On ne change pas de marque, on la rend cohérente et lisible.

---

## 0. Principe directeur

Le problème n'est pas une collection de bugs visuels, c'est l'absence d'un **système** : valeurs en dur, composants copiés-collés, Ionic utilisé en direct avec des styles locaux qui se contredisent.

Un design system tient par **quatre couches** et par **l'interdiction technique de les contourner** :

```
Tokens  →  Primitives  →  Composites  →  Patterns d'écran
(valeurs)  (Button, Text…)  (TransactionRow…)  (FormScreen, Dashboard…)
```

Règles non négociables :
1. **Aucune valeur visuelle en dur** (couleur, taille, espacement, rayon, ombre, durée) en dehors de `design-system/tokens`.
2. **Aucun composant Ionic de formulaire/bouton/carte utilisé directement** dans une feature : on passe par un composant du design system (qui, lui, peut envelopper Ionic).
3. **Chaque composant a tous ses états** définis et testés (défaut, pressé, focus, désactivé, erreur, chargement, vide) **dans les deux thèmes**.
4. **Un seul composant par besoin.** Si deux écrans ont besoin de « une ligne de transaction », c'est le même composant.
5. **Les règles sont appliquées par lint + tests**, sinon elles seront cassées au prochain prompt de l'agent.

---

## 0 bis. État réel du dépôt (constaté) et conséquences sur ce plan

Chiffres relevés par analyse statique (aucun build exécuté) :

| Mesure | Valeur | Lecture |
|---|---|---|
| Labels flottants Ionic (`<IonLabel position="floating|stacked">`) | **76 occurrences dans 24 fichiers** | cause directe des textes superposés (F-01) |
| `<IonSelect` | **169** | cause probable des listes illisibles (F-02) |
| Styles inline `style={{…}}` | ~1 414 | la plupart utilisent déjà `var(--…)` : les **tokens existent** dans `globals.css`, c'est l'**usage** qui est incohérent |
| Couleurs hex en dur dans les `.tsx` | 21 | peu nombreuses : migration facile |
| Imports `@ionic/react` | 76 ; composants shadcn : 49 fichiers | **deux systèmes d'UI en parallèle** |
| Pages > 900 lignes | Tutorial 1137, Dashboard 1068, EventDetail 1065, CentralAdmin 960, GroupDetail 951, Onboarding 926 | à découper en sections/composants |

**Conséquences sur le plan (corrections de mes hypothèses initiales) :**
1. On **ne repart pas de zéro** : les tokens CSS (`--surface`, `--out`, `--in`, `--text-primary`, `--text-tertiary`, `--accent-primary`, `--nav-height`, classes Tailwind `bg-canvas`, `bg-card`…) existent. La Phase 1 consiste à **inventorier, nommer et compléter** ces tokens (et à les aligner sur le §2 : contraste, clair/sombre), pas à en inventer d'autres. Garder les noms existants comme alias pour ne pas casser 1 400 usages.
2. **Ionic 9 ne doit plus utiliser la « syntaxe legacy » des formulaires** (`IonItem` + `IonLabel position=…`). C'est la migration centrale de la Phase 4.
3. **Décision d'architecture à trancher (Phase 0)** : Ionic **et** shadcn/Radix coexistent. Règle recommandée : Ionic pour la coquille mobile (pages, navigation, overlays natifs, pickers) ; composants maison du design system pour boutons/champs/cartes/lignes ; Radix uniquement pour ce qu'Ionic ne fait pas, et jamais pour un composant qui existe déjà en double. Tout composant shadcn sans usage est supprimé.
4. Une migration **semi-automatique** est possible pour F-01 (76 occurrences) : codemod ciblé + cliquet `ds:audit`, revue humaine par fichier. Ne pas réécrire à la main 24 écrans sans test.

---

## 1. Principes de design (pour trancher les cas non prévus)

1. **Lisibilité avant décoration.** Contraste AA minimum partout, texte jamais posé sur un aplat accent sans vérification. Public : trésoriers/responsables, écrans d'entrée de gamme, plein soleil.
2. **Une action principale par écran.** Un seul bouton plein par vue.
3. **Le contenu d'abord.** La fonctionnalité occupe le premier écran ; pas de texte explicatif ni de liste de permissions avant elle.
4. **Zéro jargon technique.** L'utilisateur ne voit jamais d'UUID, de nom de colonne, de code d'erreur brut.
5. **Offline-first visible mais discret.** L'état de synchro est une information secondaire, jamais bloquante.
6. **Sobriété performante.** Pas de flou/ombres lourdes/animations coûteuses (appareils modestes). Profondeur par la teinte de surface et la bordure.
7. **Cohérence > originalité.** Même problème = même composant = même rendu.

---

## 2. Tokens

### 2.1 Architecture des fichiers

```
src/design-system/
  tokens/
    tokens.css          # primitives + sémantique (ce fichier fait foi)
    theme-dark.css      # valeurs sémantiques, thème sombre
    theme-light.css     # valeurs sémantiques, thème clair
    ionic-bridge.css    # mappe les tokens vers les variables --ion-*
    index.ts            # tokens exposés en TS (pour tests/charts)
  primitives/  forms/  feedback/  layout/  data-display/  navigation/
  index.ts              # unique point d'import : "@/design-system"
src/shared/ui-domain/   # composites métier (MoneyText, TransactionRow…)
docs/DESIGN-SYSTEM.md   # ce document
```

Thème : attribut `data-theme="dark|light"` sur `<html>` ; défaut = préférence système (`prefers-color-scheme`), choix manuel persisté dans les paramètres. Les composants ne lisent **que** des tokens sémantiques, jamais des primitives.

### 2.2 Couleurs sémantiques (valeurs vérifiées par calcul de contraste WCAG)

Les ratios ci-dessous ont été calculés ; ils servent de **contrat de test** (voir §8).

**Thème sombre (par défaut)**

| Token | Valeur | Usage | Contraste |
|---|---|---|---|
| `--color-bg` | `#0E0E10` | fond d'app | — |
| `--color-surface-1` | `#17171A` | cartes, lignes, champs | — |
| `--color-surface-2` | `#1F1F23` | élément surélevé, pressé | — |
| `--color-surface-3` | `#28282D` | tuiles internes, chips inactifs | — |
| `--color-border` | `#34343A` | séparateurs, bordure de carte | décoratif |
| `--color-border-strong` | `#5A5A63` | **bordure des champs** | 2.62:1 sur surface-1 (≥ 3:1 recommandé : voir note) |
| `--color-text` | `#F4F4F5` | texte principal | 16.28 sur surface-1 |
| `--color-text-muted` | `#A1A1AA` | texte secondaire | 6.98 sur surface-1, 5.72 sur surface-3 |
| `--color-text-subtle` | `#8A8A93` | aides, placeholders | 5.23 sur surface-1 ; **interdit sur surface-3 (4.29)** |
| `--color-accent` | `#FF6B00` | fond bouton principal, icône active | 6.27 sur surface-1 |
| `--color-on-accent` | `#111111` | **texte sur fond accent** | **6.61 sur accent** |
| `--color-accent-pressed` | `#E65F00` | bouton pressé | 5.40 avec `on-accent` |
| `--color-accent-text` | `#FF8A3D` | texte/lien accent sur surface | 7.63 sur surface-1 |
| `--color-positive` | `#4ADE80` | entrées, succès | 10.27 |
| `--color-negative` | `#F87171` | sorties, erreurs | 6.47 |
| `--color-warning` | `#FBBF24` | en attente, alertes | 10.72 |
| `--color-info` | `#60A5FA` | information | 7.04 |
| `--color-*-subtle` (fond teinté) | couleur sémantique à 16 % sur surface-1 | badges, tuiles | texte sémantique dessus : 5.05 à 7.58 |

**Thème clair**

| Token | Valeur | Contraste |
|---|---|---|
| `--color-bg` | `#F6F6F7` | — |
| `--color-surface-1` | `#FFFFFF` | — |
| `--color-surface-2` | `#F0F0F2` | — |
| `--color-surface-3` | `#E6E6EA` | — |
| `--color-border` | `#D4D4D8` | décoratif |
| `--color-border-strong` | `#8E8E96` | 3.25 sur blanc |
| `--color-text` | `#18181B` | 17.72 |
| `--color-text-muted` | `#52525B` | 7.73 sur blanc, 6.21 sur surface-3 |
| `--color-text-subtle` | `#71717A` | 4.83 sur blanc |
| `--color-accent` | `#FF6B00` | fond bouton |
| `--color-on-accent` | `#111111` | 6.61 |
| `--color-accent-text` | `#9A3412` | 7.31 sur blanc, 6.14 sur teinte accent |
| `--color-positive` | `#166534` | 7.13 sur blanc, 6.08 sur teinte |
| `--color-negative` | `#B91C1C` | 6.47 sur blanc |
| `--color-warning` | `#92400E` | 7.09 sur blanc, 6.00 sur teinte |
| `--color-info` | `#1D4ED8` | 6.70 sur blanc |
| `--color-*-subtle` | couleur sémantique à 12 % sur surface-1 | texte dessus ≥ 5.29 |

**Constats importants issus du calcul (à ne pas « corriger » par habitude) :**
- **Texte blanc sur `#FF6B00` = 2.86:1 → échec AA.** Tout bouton orange actuel avec libellé blanc est à corriger : texte `--color-on-accent` (`#111`). Si le design exige du texte blanc, il faut un orange plus sombre (`#C2410C`, 5.18) pour le fond, ce qui change la perception de marque : **décision à valider par toi**.
- En thème clair, les verts/ambres/oranges « moyens » (`#15803D`, `#B45309`, `#C2410C`) tombent **sous 4.5 sur fond teinté** (4.25–4.35) : on utilise donc les variantes plus foncées du tableau.
- `--color-border-strong` sombre est à 2.62 : acceptable pour une bordure de champ si le champ est **aussi** distingué par son fond (`surface-2`) ; sinon passer à `#6B6B74` (3.39). L'agent doit tester et choisir la valeur ≥ 3:1.
- Les valeurs exactes sont des **points de départ calculés**, pas un dogme : toute modification doit repasser le test de contraste (§8).

### 2.3 Typographie

- Police unique : **Inter** (variable), **embarquée localement** (`@fontsource-variable/inter`), **pas de CDN** (offline-first). Fallback : `system-ui, Roboto, sans-serif`. Chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour tous les montants.
- Unités en `rem` (respect de la taille de police Android). Tester jusqu'à 130 % sans chevauchement.

| Style | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| `display` | 32 / 38 | 700 | montant héros |
| `title-1` | 24 / 30 | 700 | titre de page |
| `title-2` | 20 / 26 | 600 | titre de section/carte |
| `title-3` | 17 / 24 | 600 | titre de ligne, bouton |
| `body` | 16 / 24 | 400 | texte courant, valeur de champ |
| `body-sm` | 14 / 20 | 400 | description secondaire |
| `label` | 13 / 18 | 500 | label de champ |
| `caption` | 12 / 16 | 400 | méta, aide, badge |
| `overline` | 12 / 16 | 600, majuscules, +0.06em | en-têtes de section (« ACTIONS RAPIDES ») |

Règle : `font-size` interdit en dehors des tokens/`<Text variant>`.

### 2.4 Espacement, rayons, tailles

- Espacement (base 4 px) : `--space-1: 4` `2: 8` `3: 12` `4: 16` `5: 20` `6: 24` `8: 32` `10: 40` `12: 48`. Marge latérale de page : `--space-4` (16). Écart entre blocs : `--space-6`.
- Rayons : `--radius-sm: 8` (chips, badges), `--radius-md: 12` (champs, boutons), `--radius-lg: 16` (cartes), `--radius-xl: 24` (hero, sheets), `--radius-full`.
- Tailles tactiles : cible min **48×48**. Hauteur champ **52**, bouton principal **52**, bouton secondaire **44** (zone tactile étendue à 48), tab bar **64 + inset bas**, header **56 + inset haut**.
- Icônes : un seul jeu (celui majoritaire dans le code ; défaut Lucide ou Ionicons, **pas les deux**). Tailles 16 / 20 / 24, trait 1.75–2. Une icône seule porte toujours un `aria-label`.

### 2.5 Élévation, mouvement, z-index

- Élévation : on privilégie **surface + bordure**. Ombre réservée aux overlays (`--shadow-overlay`), pas de flou sur les cartes.
- Mouvement : `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 300ms`, courbe `cubic-bezier(0.2, 0, 0, 1)`. Respect de `prefers-reduced-motion`. Animer seulement `transform`/`opacity`.
- z-index : `--z-header: 10`, `--z-tabbar: 20`, `--z-fab: 30`, `--z-sheet: 100`, `--z-toast: 200`.

### 2.6 Pont Ionic (`ionic-bridge.css`)

Mapper, une fois pour toutes :
`--ion-background-color`←`--color-bg`, `--ion-text-color`←`--color-text`, `--ion-color-primary`←`--color-accent`, `--ion-color-primary-contrast`←`--color-on-accent`, `--ion-item-background`←`--color-surface-1`, `--ion-border-color`←`--color-border`, `--ion-toolbar-background`←`--color-bg`, `--ion-tab-bar-background`←`--color-surface-1`, `--ion-safe-area-*`. Les popovers/modals/action-sheets Ionic (rendus hors de l'arbre) doivent aussi hériter : définir les tokens sur `:root` et non sur un conteneur. **C'est une cause probable des listes illisibles actuelles.**

---

## 3. Layout et shell d'application

### 3.1 AppShell

- Edge-to-edge géré **une seule fois** : `viewport-fit=cover`, `env(safe-area-inset-*)` appliqué par `AppShell`, `PageHeader` et `TabBar`, **jamais** par les pages.
- Tab bar : `padding-bottom: env(safe-area-inset-bottom)`. Le contenu scrollable réserve `tabbar + inset + --space-4`.
- Header : un seul, `PageHeader`, contient titre de page (une fois), sous-titre optionnel, actions (recherche, notifications, paramètres). Affiche le **nom** de l'organisation (sélecteur si plusieurs), **jamais** son identifiant.
- Aucune zone vide en haut : le contenu démarre sous le header (pas de `justify-content:center` ni `min-height:100%` sur la page).

### 3.2 ScreenScaffold (gabarit unique de page)

```
<ScreenScaffold
  title="…" subtitle?  leading?(back)  actions?
  footer?          // action collante (ex: Enregistrer), au-dessus du clavier + inset
  hideTabBar?      // true pour formulaires et détails
>
  contenu scrollable
</ScreenScaffold>
```

Règles : formulaires et écrans de détail masquent la tab bar ; l'action principale du formulaire est dans `footer` (collante) ; **pas de FAB** sur un écran qui a un `footer`.

---

## 4. Catalogue de composants

Convention : un dossier par composant (`Button/Button.tsx`, `Button.css|module.css`, `Button.test.tsx`, `index.ts`). Props typées, `variant`/`size` par union de littéraux, pas de `className` libre pour contourner le style (autoriser `className` seulement pour le positionnement externe).

### 4.1 Primitives

| Composant | API | Variantes / états | Règles |
|---|---|---|---|
| `Text` | `variant` (§2.3), `tone` (`default|muted|subtle|positive|negative|warning|accent`), `as` | — | seul moyen d'afficher du texte stylé |
| `Icon` | `name`, `size`, `tone` | — | enveloppe l'unique jeu d'icônes |
| `Button` | `variant: primary|secondary|ghost|danger`, `size: md|sm`, `loading`, `disabled`, `leadingIcon`, `fullWidth` | défaut, pressé, focus, désactivé, chargement | primary = fond `accent` + texte `on-accent` ; un seul primary par écran ; `loading` bloque le double-clic et conserve la largeur |
| `IconButton` | `icon`, `label` (obligatoire), `variant`, `size` | idem | zone tactile 48 |
| `Fab` | `icon`, `label` | — | **max 1 par écran**, jamais sur écran avec footer ; ne doit pas recouvrir une action |
| `Badge` | `tone`, `children` | `success|warning|danger|info|neutral` | fond `*-subtle`, texte sémantique ; ne pas utiliser « Approuvé » comme badge permanent |
| `Chip` | `selected`, `onPress`, `leadingIcon` | inactif / sélectionné (fond plein + coche) | état sélectionné évident sans couleur seule |
| `Avatar` | `name`, `src?`, `size` | initiales par défaut | — |
| `Divider` | — | — | token `border` |
| `Spinner` / `Skeleton` | `size` / `shape` | — | skeleton pour chargements > 300 ms |

### 4.2 Formulaires (cause de P0-3 / P0-4)

**Anatomie unique, appliquée à tous les champs :**

```
Label  (label, text-muted, 6px sous)   [* obligatoire en accent-text]
┌────────────────────────────┐
│ [icône?]  valeur/placeholder     [chevron?]  │  hauteur 52, fond surface-2, bordure border-strong
└────────────────────────────┘
Aide ou erreur (caption)  — erreur = negative + icône
```

Le **label est toujours au-dessus** du champ, dans le flux. Pas de label flottant, pas de position absolue, pas de superposition possible par construction.

| Composant | Notes |
|---|---|
| `FormField` | wrapper : `label`, `required`, `hint`, `error`, `children`. Gère `htmlFor`/`aria-describedby`/`aria-invalid`. **Tous les champs passent par lui.** |
| `TextField` | `type`, `value`, `onChange`, `placeholder`, `inputMode` |
| `AmountField` | `inputMode="numeric"`, séparateurs de milliers en saisie, suffixe devise fixe (affiché **une fois**), valeur stockée en entier (unité mineure : le FCFA n'a pas de décimales) |
| `TextAreaField` | auto-grow, compteur optionnel |
| `SelectField` | **bottom sheet** pleine largeur (pas de popover desktop) : titre, recherche si > 8 options, option sélectionnée = coche + fond `surface-2`, bouton fermer, liste scrollable, zone tactile 52. Valeur affichée dans le champ, jamais vide quand une valeur existe. Les sheets utilisent les tokens (thème clair/sombre garanti). |
| `DateField` | sélecteur natif/bottom sheet, format `JJ/MM/AAAA`, valeur ISO en interne |
| `SegmentedControl` | ex. Entrée/Sortie ; sélection = fond sémantique + texte `on-*` contrasté ; **ne laisse pas déborder sa couleur derrière le bouton principal** |
| `Switch`, `Checkbox`, `RadioGroup` | cible 48, label cliquable |
| `FormSection` | titre `overline` + groupe de champs, espacement `--space-4` |

Règle d'or : si un nouveau formulaire a besoin d'un champ qui n'existe pas, **on crée le composant dans `design-system/forms`**, on ne bricole pas dans la feature.

### 4.3 Conteneurs et feedback

| Composant | Notes |
|---|---|
| `Card` | `surface-1`, bordure `border`, rayon `lg`, padding `4`. Variantes : `default`, `interactive` (pressé = `surface-2`), `hero` (dégradé discret). **Jamais d'aplat accent.** |
| `ListRow` | primitive de ligne : `leading`, `title`, `subtitle`, `trailing`, `onPress`. Hauteur min 64. Base de `TransactionRow`, `MemberRow`, etc. |
| `Sheet` (bottom sheet) | base de `SelectField`, menus, confirmations |
| `Dialog` | confirmation destructive : titre, conséquence, bouton `danger` + annuler |
| `Toast` | transitoire, bas d'écran **au-dessus de la tab bar**, 4 s, pas de recouvrement d'action ; `tone` |
| `Banner` | persistant inline (hors ligne, sync en échec) ; ne recouvre jamais de contenu |
| `EmptyState` | icône + titre + phrase d'aide + action optionnelle |
| `ErrorState` | message humain + « Réessayer » ; jamais de texte technique brut |
| `InlineLoader` | pour boutons/sections |

### 4.4 Navigation

`PageHeader`, `TabBar` (icône + libellé, actif = `accent-text` + fond `surface-2`, insets gérés), `BackButton` (« Retour » + icône, 48 px), `SectionHeader` (`overline` + action « Tout voir »).

### 4.5 Composites métier (`shared/ui-domain/`)

| Composant | Contrat |
|---|---|
| `formatMoney(amount, {signed})` + `MoneyText` | **seule** source de formatage : `−50 000 FCFA` (espace insécable fine entre milliers, signe `−` typographique, `+` si signed et positif, `0 FCFA` jamais `−0`). Un seul « FCFA ». Couleur par signe. `tabular-nums`, `nowrap`. |
| `formatDate`, `formatRelativeDate` | « Aujourd'hui », « Hier », « 2 nov. 2026 » ; locale `fr`, fuseau local |
| `TransactionRow` | gauche : pastille ↗/↘ ; centre : `description` → sinon nom catégorie → sinon « Entrée/Sortie » (**jamais « Transaction »**) ; sous-ligne : catégorie · date ; droite : `MoneyText` ; `Badge` **uniquement si statut ≠ approuvé** |
| `StatTile` | libellé + valeur + icône teintée (Entrées/Sorties) |
| `HeroSummaryCard` | résultat net, delta vs mois précédent (si dispo), 2 `StatTile`, sparkline ou état vide |
| `Sparkline` | données réelles, sinon état vide texte ; couleur selon la tendance réelle |
| `QuickActions` | 4 actions circulaires 56 px + libellé, filtrées par permissions |
| `SyncStatus` | point + texte (« Synchronisé » / « Hors ligne » / « Synchronisation… » / « Échec · Réessayer ») ; piloté par l'état PowerSync réel ; jamais bloquant |
| `PermissionGate` | masque/désactive selon droits ; **n'affiche jamais** la liste des permissions |
| `OrgName` | nom lisible de l'organisation ; jamais l'UUID |
| `ExportButton` | gère génération → écriture fichier (Capacitor Filesystem) → partage (Share), états chargement/succès/erreur |
| `ReportMetricPicker` | libellés métier (« Total des montants », « Nombre de transactions ») ; **jamais** `Somme · amount` |

### 4.6 Dictionnaire de libellés

Fichier unique `i18n/labels.fr.ts` : map `clé technique → libellé humain` (champs, types, statuts, agrégats). Règles : tout texte affiché provenant d'une clé de base de données passe par ce dictionnaire ; **test unitaire** qui échoue si un libellé rendu est égal à une clé brute (`amount`, `type`, `status`, `org-…`, UUID, ou regex `^[a-z_]+$`).

---

## 5. Patterns d'écran (gabarits)

| Pattern | Structure | Notes |
|---|---|---|
| **FormScreen** | `ScreenScaffold(hideTabBar, footer=<Button primary>)` + `FormSection`s de `FormField` | l'action principale est collante au-dessus du clavier ; erreurs inline + résumé en haut si > 1 ; après succès : retour à la liste/détail **après** que l'écriture locale est confirmée |
| **ListScreen** | header + filtres (chips/`SelectField`) + `ListRow`s + `EmptyState` + FAB unique éventuel | pull-to-refresh optionnel, chargement skeleton |
| **DetailScreen / Reçu** | `ScreenScaffold(hideTabBar)` + `Card` de détails + actions (modifier, exporter, supprimer via `Dialog`) | doit gérer « introuvable » par un `ErrorState` propre, pas par une page vide |
| **Dashboard** | salutation + `SyncStatus` → `HeroSummaryCard` → `QuickActions` → « Derniers mouvements » (5 `TransactionRow`) | voir spec détaillée dans `lumina-rapport-bugs-et-dashboard.md` §5 |
| **ReportBuilder** | `FormScreen` à sections Filtres / Groupement / Métriques + résultat | « Exécuter » affiche le résultat ; « Enregistrer » persiste ; pas de FAB |
| **Page de fonctionnalité** (Finances, Groupes, Cultes…) | s'ouvre **directement** sur la liste/les données utiles | aucun bloc de permissions ou d'explication avant le contenu |
| **Auth** | logo + titre + `FormField`s + `Button primary` | spinner = état du bouton avec timeout ; `SyncStatus` absent de cet écran |

---

## 6. Accessibilité et robustesse (critères de sortie communs)

- Contraste ≥ 4.5:1 (texte), ≥ 3:1 (grand texte, bordures de champ, icônes porteuses de sens) dans **les deux thèmes**.
- Focus visible (anneau 2 px `accent-text`) sur tout élément interactif ; ordre de tabulation logique.
- Cible tactile ≥ 48×48.
- Aucun sens porté par la seule couleur (icône ou signe `+/−` en plus).
- Aucun chevauchement à 320 / 360 / 412 px et avec police à 130 %.
- Textes longs : `ellipsis` contrôlé (1 ligne titre, 2 lignes description), jamais de coupe silencieuse d'un montant.
- Clavier Android : le champ actif et le `footer` restent visibles.

---

## 7. Gouvernance : rendre les règles applicables

### 7.1 Lint
- **Stylelint** : `color-named: never`, interdiction des couleurs hex/rgb/hsl hors `design-system/tokens/**` ; `declaration-property-value-disallowed-list` pour `font-size`, `border-radius`, `box-shadow`, `z-index` en valeur littérale hors tokens (autoriser `var(--…)`).
- **ESLint** : `no-restricted-imports` — interdire `IonInput, IonSelect, IonSelectOption, IonButton, IonItem, IonLabel, IonCard*, IonTextarea, IonDatetime, IonFab*, IonChip, IonBadge` hors `src/design-system/**` ; `react/forbid-dom-props` + règle `no-restricted-syntax` pour `style={{ color|background|fontSize|… }}` ; interdiction de `Intl.NumberFormat`/`toLocaleString` direct pour les montants (utiliser `formatMoney`).
- **Cliquet de migration** : script `npm run ds:audit` compte les violations (hex en dur, `style=` inline, `Ion*` interdits, `font-size` littéraux) et écrit `docs/ds-audit.md`. La CI échoue si un compteur **augmente** ; objectif final : 0, puis lint en `error` strict.

### 7.2 Tests (vérifiables sans voir)
1. **Contraste** : test unitaire qui lit `tokens.css`/thèmes, calcule le ratio WCAG des paires du §2.2 et échoue sous seuil (le script de calcul est celui utilisé pour ce document).
2. **Géométrie anti-chevauchement** : test Playwright sur chaque `FormField` — le `getBoundingClientRect()` du label et de la zone de valeur ne s'intersectent jamais ; idem entre bouton principal et FAB, et entre contenu et tab bar (inset inclus).
3. **a11y** : `jest-axe`/`axe-playwright` sur la route catalogue, en clair et en sombre.
4. **Contrat des composants** : tests RTL pour chaque état (défaut/erreur/désactivé/chargement/vide).
5. **Libellés** : test du dictionnaire (§4.6) + test « aucun UUID dans le DOM » sur dashboard et en-tête.
6. **Captures de référence** (pour **toi**, pas pour l'agent) : Playwright produit des PNG par composant et par thème dans `docs/ds-snapshots/` ; tu les regardes une fois par phase.

### 7.3 Catalogue interne
Route dev-only `/__ui` qui affiche **chaque composant dans chaque état et chaque thème**. C'est la source de test (2, 3, 6) et ta recette visuelle.

### 7.4 Règle de contribution
Toute nouvelle UI = (1) chercher un composant existant ; (2) sinon en créer un dans le design system avec états + test + entrée au catalogue ; (3) l'utiliser. PR refusée si elle ajoute une valeur en dur ou un composant Ionic interdit.

---

## 8. Plan de migration phasé (chaque phase = une PR, une porte de sortie)

> Les deux bugs **fonctionnels** (entrée invisible P0-1, exports P0-2 — voir `lumina-rapport-bugs-et-dashboard.md`) sont une **piste séparée** : à traiter **avant ou en parallèle**, jamais mélangés aux PR du design system (sinon on ne sait plus ce qui a corrigé quoi). Un beau dashboard qui perd les revenus ne sert à rien : fais P0-1 en premier.

### Phase 0 — Audit et état de référence (aucun changement visuel)
> Une première passe d'audit est déjà faite (voir §0 bis et §11). La Phase 0 sert à **la confirmer par script**, à lister les composants dupliqués précis (ex. `components/Button.tsx` vs `ui/button`), la police/les icônes réellement utilisées, et à trancher la règle Ionic/shadcn.
- Livrables : script `ds:audit`, `docs/ds-audit.md` listant : couleurs/tailles en dur par fichier, usages `Ion*` par fichier, `style=` inline, **composants dupliqués** (cartes, lignes, boutons, en-têtes, champs similaires), approche CSS, jeu d'icônes, police actuelle, endroits qui formatent des montants/dates.
- Porte : rapport committé ; l'agent propose, par catégorie, le composant cible du catalogue. **Stop et validation humaine.**

### Phase 1 — Tokens, thèmes, pont Ionic, police, icônes
- Livrables : `tokens.css`, `theme-dark/light.css`, `ionic-bridge.css`, Inter locale, unification du jeu d'icônes, commutateur de thème, test de contraste.
- Porte : test de contraste vert ; l'app compile et s'affiche (apparence quasi inchangée) ; popovers/sheets Ionic héritent des tokens.

### Phase 2 — Shell et layout
- Livrables : `AppShell`, `PageHeader` (nom d'organisation, plus d'UUID), `TabBar` avec insets, `ScreenScaffold`, suppression du vide en haut.
- Porte : test géométrique (tab bar vs contenu vs nav système), plus aucun UUID dans le DOM, `hideTabBar` sur les formulaires.

### Phase 3 — Primitives
- Livrables : `Text, Icon, Button, IconButton, Fab, Badge, Chip, Avatar, Divider, Spinner, Skeleton`, catalogue `/__ui`.
- Porte : tous les états testés dans les deux thèmes ; contraste du bouton primary conforme (texte `on-accent`).

### Phase 4 — Formulaires
> Périmètre chiffré : migrer les **76 labels flottants (24 fichiers)** et les **169 `IonSelect`** vers `FormField`/`SelectField`. Commencer par `TransactionNew.tsx`, puis `TransactionEdit`, `TransactionNewGroup`, `Versement`, `EventNew/Edit`, `ReportBuilder`, `InvitationClaim`, `Budgets`.
- Livrables : `FormField, TextField, AmountField, TextAreaField, SelectField (sheet), DateField, SegmentedControl, Switch/Checkbox/Radio, FormSection`.
- Porte : test anti-chevauchement label/valeur vert ; selects lisibles (test axe + contraste) en clair et sombre ; `Select` fonctionne au clavier et au tactile.

### Phase 5 — Affichage de données et composites métier
- Livrables : `Card, ListRow, Sheet, Dialog, Toast, Banner, EmptyState, ErrorState, formatMoney/MoneyText, formatDate, TransactionRow, StatTile, HeroSummaryCard, Sparkline, QuickActions, SyncStatus, PermissionGate, ExportButton`, dictionnaire de libellés.
- Porte : tests de format (`−0` impossible, une seule devise), test « aucun nom de colonne brut affiché », états vides/erreurs rendus.

### Phase 6 — Migration des écrans (une PR par écran, dans cet ordre)
1. Nouvelle transaction (FormScreen) — valide l'ensemble formulaires.
2. Dashboard (nouvelle hero card + `TransactionRow`).
3. Historique, détail/reçu de transaction (avec `ErrorState`).
4. Pages Finances / Groupes / Cultes / Membres (suppression des blocs de permissions, contenu en premier).
5. Constructeur de rapport + Bilan/Budget (avec `ExportButton`).
6. Connexion/Inscription.
7. Tous les formulaires restants (membres, événements, groupes, cotisations…).
- Porte par écran : `ds:audit` en baisse (cliquet), tests géométrie + axe verts, captures produites pour ta validation.

### Phase 7 — Verrouillage
- Livrables : suppression des CSS/composants morts, lint en `error`, `ds:audit` = 0, `docs/DESIGN-SYSTEM.md` à jour, règle de contribution dans le README / le fichier d'instructions de l'agent.
- Porte : CI bloque tout nouvel écart.

---

## 9. Gabarit de prompt phasé pour l'agent

```
CONTEXTE : lis docs/DESIGN-SYSTEM.md (source de vérité). Tu travailles UNIQUEMENT sur la Phase {N}.
OBJECTIF : {livrables de la phase}.
CONTRAINTES : aucune valeur visuelle en dur ; pas de composant Ionic interdit hors design-system ;
  ne touche pas aux phases suivantes ; ne mélange pas de correction fonctionnelle (données/sync/export).
PROCÉDURE : 1) liste les fichiers que tu vas créer/modifier ; 2) implémente ; 3) écris les tests de la porte de sortie ;
  4) lance lint, tests, `ds:audit` ; 5) rapporte les compteurs avant/après.
PORTE DE SORTIE : {critères de la phase}. Si un critère échoue, corrige ; ne passe pas à la phase suivante.
INTERDIT : « regarder » l'écran. Vérifie par tests, scripts et lint. Si une décision de design n'est pas couverte, STOP et pose la question.
```

---

## 10. Définition de « terminé » du design system

- Aucune couleur, taille, rayon ou ombre en dur hors tokens ; lint strict vert.
- Aucun `Ion*` interdit hors `design-system/`.
- Un seul composant par besoin ; catalogue `/__ui` complet, tous états, deux thèmes.
- Contraste, géométrie, a11y, libellés : tests verts en CI.
- Dashboard, formulaires, listes et rapports conformes aux patterns du §5.
- Zéro donnée technique visible ; montants formatés par une seule fonction.

---

## 11. Registre des défauts frontend (avec références code)

Légende : **[Constaté]** vu dans le code ; **[Hypothèse]** à vérifier. Les bugs de données/logique (entrée invisible, export, sync) sont dans `lumina-bugs-backend-et-logique-metier.md` ; ici : uniquement UI/UX/structure frontend.

| ID | P | Défaut | Preuve / référence | Correctif attendu | Test d'acceptation |
|---|---|---|---|---|---|
| **F-01** | P0 | Label et valeur superposés dans tous les formulaires | **[Constaté]** `TransactionNew.tsx` ≈ l.318 : `<IonItem><IonLabel position="floating">…</IonLabel><IonInput/></IonItem>` ; 76 occurrences / 24 fichiers (DocumentPicker, EventTasks, OrgChildren, Budgets, FormBuilder, InvitationClaim, ReportBuilder, GroupDetail, GroupCotisation, CustomFields, Federation, BudgetDetail, Versement, EventEdit, OrgUnits, TransactionNew, EventNew, FormFill, OrgReportSend, TransactionNewGroup, CentralAdmin, Groups, TransactionEdit, EventDetail). Ionic **9** installé : la syntaxe legacy y est dépréciée/cassée. | `FormField` (label au-dessus, §4.2) + champs du design system ; supprimer tout `position="floating|stacked"` | Test géométrique : label et zone de valeur ne s'intersectent jamais, sur chaque écran migré ; `ds:audit` = 0 occurrence |
| **F-02** | P0 | Listes déroulantes illisibles (clair et sombre) | **[Constaté]** 169 `<IonSelect`. **[Hypothèse]** popover/alert Ionic rendus hors de l'arbre applicatif sans hériter des variables de thème, ou fond/texte en conflit avec les `ion-*` variables | `SelectField` (bottom sheet, §4.2) ; tokens et variables `--ion-*` définis sur `:root` ; test contraste des overlays | axe + test de contraste verts, clair et sombre ; catégorie sélectionnable et visible |
| **F-03** | P0 | Carte de transaction du dashboard illisible (aplat orange) | **[Constaté sur capture]** ; rendu de la liste « Derniers mouvements » dans `Dashboard.tsx` (source des données ≈ l.759). **[Hypothèse]** style « actif » appliqué en permanence | `TransactionRow` neutre (§4.5) ; accent seulement à l'appui ; pas de badge « Approuvé » permanent | Contraste ≥ 4.5:1 ; test de rendu : aucun fond `--accent*` sur une ligne de liste |
| **F-04** | P1 | Identifiant d'organisation affiché (`org-a089…`) en bandeau permanent | **[Constaté sur capture]**. `TopHeader.tsx` l.30 calcule déjà `orgName` avec une garde « ne pas afficher un ID technique » : **la source du bandeau n'est pas dans ce composant** (non localisée). **[À faire]** : trouver le composant qui affiche l'ID (rechercher le texte rendu, classes `font-mono`/bleu) | Supprimer l'affichage ; afficher le nom d'organisation ; bandeau debug seulement en `DEV` | Test DOM : aucun texte ne correspond à `/org-[0-9a-f]{8}/` ni à un UUID sur dashboard et header |
| **F-05** | P1 | Bloc « VOUS POUVEZ » (permissions) en tête de pages de fonctionnalité | **[Constaté]** `components/CapabilityBanner.tsx` rendu en haut de **6 pages** : `Finance`, `Members`, `Events` (Cultes), `Groups`, `Reports`, `InvitationManage` (`<CapabilityBanner orgId={getOrganizationId()} />`) | Retirer des 6 pages ; déplacer vers Menu › « Mon rôle et permissions » ; utiliser les permissions pour masquer/désactiver les actions | Test : le premier élément de contenu de chaque page est la donnée utile ; le texte « Vous pouvez » n'apparaît plus hors du Menu |
| **F-06** | P1 | Barre d'onglets masquée par la navigation système Android | **[Constaté]** `BottomNav.tsx` (« historiquement construite sur IonTabBar… ») : aucun `safe-area-inset-bottom` trouvé dans les composants de nav (seul `SyncUnavailableBanner.tsx` l.50 l'utilise). **[À vérifier]** dans `globals.css` (`--nav-height`) | `AppShell`/`TabBar` avec `padding-bottom: env(safe-area-inset-bottom)` ; edge-to-edge Capacitor 7 | Test Playwright mobile : le contenu n'est pas recouvert par la barre ; vérifier navigation 3 boutons et gestuelle sur appareil |
| **F-07** | P1 | Bannière « Synchronisation indisponible » affichée sur l'écran de connexion et masquant du contenu | **[Constaté sur capture]** ; composant `SyncUnavailableBanner.tsx` (positionné en `bottom: calc(var(--nav-height)+inset)`) | Ne pas l'afficher hors zones authentifiées ; ne jamais recouvrir une action | Test : absente sur `/auth` |
| **F-08** | P1 | Badge « synchronisation… » bloqué après connexion | **[Constaté sur capture]** ; `lib/hooks/usePowerSyncIndicator.ts` contient 3 `catch` qui avalent l'erreur | Piloter par l'état réel (`connected`, `hasSynced`, `dataFlowStatus`), avec timeout et états finaux (§4.5 `SyncStatus`) | Test unitaire de la machine d'états (connecté, hors ligne, échec, timeout) |
| **F-09** | P1 | Champ montant en `inputMode="decimal"` pour une devise sans décimales | **[Constaté]** `TransactionNew.tsx` (`inputMode="decimal"`) ; `parseAmountToCents` accepte les décimales | `AmountField` en `inputMode="numeric"`, entiers seulement, séparateur de milliers à la saisie | Saisir « 25 000 » → valeur 25000 ; « 12,5 » refusé ou arrondi explicitement |
| **F-10** | P1 | Titre de transaction générique « Transaction » | **[Constaté]** `TransactionNew.tsx` : repli description → libellé catégorie → `"Transaction"` ; le libellé affiché dépend de `label_fr`/`label` | Afficher `description`, sinon catégorie, sinon « Entrée »/« Sortie » selon le type ; jamais « Transaction » | Test de `TransactionRow` : 3 cas de repli |
| **F-11** | P1 | Message d'erreur de l'envoi de preuve jamais vu | **[Constaté]** `TransactionNew.tsx` : `setError(...)` puis `navigate(...)` immédiat → l'écran est quitté | Afficher en `Toast` persistant après navigation, ou rester sur l'écran | Test : après échec d'upload de preuve, un message visible subsiste |
| **F-12** | P1 | Pages monolithiques | **[Constaté]** `Tutorial` 1137, `Dashboard` 1068, `EventDetail` 1065, `CentralAdmin` 960, `GroupDetail` 951, `Onboarding` 926 lignes | Découper en sections et composants (hero, actions rapides, liste) ; viser < 300 lignes/fichier | Lint `max-lines` en avertissement puis erreur |
| **F-13** | P2 | Deux systèmes d'UI (Ionic + shadcn/Radix) et doublons (`components/Button.tsx` / `ui/button`) | **[Constaté]** 49 fichiers `ui/`, 76 imports Ionic | Décision de §0 bis ; supprimer les composants morts | `ds:audit` : plus de composant dupliqué |
| **F-14** | P2 | 21 couleurs hex en dur dans les `.tsx` | **[Constaté]** | Remplacer par des tokens | `ds:audit` = 0 |
| **F-15** | P2 | Constructeur de rapport : libellé métier absent, FAB sur le bouton Enregistrer, chips sans état sélectionné | **[Constaté sur capture]** ; `ReportBuilder.tsx` | Voir `lumina-rapport-bugs-et-dashboard.md` §3 P2-5 ; dictionnaire de libellés (§4.6) | Test : aucune clé brute (`amount`) affichée |

Défauts déjà décrits sur captures et toujours valides (superposition des textes, valeurs vides des sélecteurs, espace vide en haut, doublon de devise, états vides) : voir `lumina-rapport-bugs-et-dashboard.md`.

## 12. Ordre recommandé de la suite

1. **Piste données d'abord** (document `lumina-bugs-backend-et-logique-metier.md`, bugs B-01 à B-06) : sans elle, une belle UI affiche des données fausses ou absentes.
2. **Phase 0 + 1** : audit par script et alignement des tokens existants (alias, pas de renommage massif).
3. **Phase 2** : `AppShell`/`TabBar`/`PageHeader` (F-04, F-06, F-07, F-08) — gain visible immédiat sur tous les écrans.
4. **Phase 4** (formulaires, F-01/F-02) : le plus gros levier de lisibilité ; migration par lots de 3–4 fichiers, avec le test géométrique.
5. **Phase 5** (`TransactionRow`, `HeroSummaryCard`, F-03/F-10) puis **Phase 6** écran par écran.
6. En parallèle, découper les pages géantes (F-12) uniquement lorsqu'on les touche (règle du « scout »), pas en refonte séparée.
