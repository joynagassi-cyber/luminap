# Design System: Lumina

Lumina est une application mobile de gestion financière (finance communautaire / organisationnelle) construite en Ionic React + Capacitor (web-first, wrapper natif). Interface sombre par défaut, accent Orange Fire, données chiffrées en local (PowerSync), synchronisation Supabase. Ce document est la source de vérité visuelle pour la génération d'écrans et les revues de design.

## 1. Visual Theme & Atmosphere

**Physique & Métaphore** : application mobile 48×48px minimale de toucher, écran 1 colonne, navigation basse (tab bar + FAB) + en-tête contextuel (TopHeader). Le mobile est la cible 1re — le desktop est un fallback (viewport centré `max-w-lg`). Pas de dashboard SaaS générique : pas de cartes flottantes sans ancrage, pas de badges pointus inutiles. Les surfaces sont des panneaux de contrôle (instrumentation financière), pas des cartes marketing.

**Atmosphère** : sombre, technique, fiable — « cockpit financier mobile ». Surface sombre profond (`#121212`) avec une hiérarchie de surface stricte (canvas < card < surface < surface-hover), typographie tabulaire pour les montants, accent Orange Fire (`#ff6b00`) réservé aux actions critiques et l'identité de marque. Les couleurs de données financières (entrée/sortie/en attente) sont INVARIANTES — elles ne changent jamais avec le thème clair/sombre.

## 2. Color Palette & Roles

### Primary Foundation (mode sombre, défaut)
- **Canvas (`#121212`)** : fond de page global, fond de navigation (`rgba(18,18,18,0.97)` + blur).
- **Card (`#181818`)** : panneaux et cartes de contenu (plus sombre que la surface).
- **Surface (`#212121`)** : barres, listes, items de formulaire, barres de statut.
- **Surface Hover / Active (`#282828` / `#333333`)** : états d'interaction des boutons et listes.
- **Border (`#282828`)** : séparateurs 1px, bordures de cartes.

### Primary Foundation (mode clair, `data-theme="light"`)
- Canvas `#f5f6f8`, Card/Surface `#ffffff`, Hover `#eef0f2`, Active `#e4e6e9`, Border `#e3e5e8`.

### Accent & Interactive
- **Orange Fire (`#ff6b00`)** : accent de marque, CTA primaire, nav active, focus ring (2px). Light variant `#ff8533`, Dark `#cc5500`. Texte inversé : `#ffffff`.
- **Lumina Light (`#ff8533`)** : hover de l'accent.

### Typography & Text Hierarchy
- **Text Primary (`#ffffff`)** : titres, montants, contenu principal (sur surfaces sombres).
- **Text Secondary (`#b3b3b3`)** : labels, métadonnées, contenu secondaire.
- **Text Tertiary (`#808080`)** : captions, états désactivés, icônes inactives.
- **Text Placeholder (`#535353`)** : placeholders de champs, états vide.

### Functional States (invariantes, hors finances)
- **Income Green (`#1db954`)** : entrées / revenus (finance).
- **Expense Red (`#e51332`)** : sorties / dépenses (finance), hover `#c4102b`.
- **Pending Amber (`#ffb800`)** : en attente, actions non complétées.
- **Planned Blue (`#3b82f6`)** : planifié (statut non-financier).
- **Advance Purple (`#8b5cf6`)** : avances (statut non-financier).
- **Chart Pink (`#ec4899`)** : 5e teinte du nuancier des graphiques.
- **Exhausted Grey (`#9ca3af`)** : état « Épuisé » (budgets).
- **Success Emerald (`#10b981`)** : succès / approuvé / payé.
- **Muted Grey (`#6b7280`)** : désactivé / brouillon / expiré.
- **Alert Red (`#ef4444`)** : erreurs, rejeté, anormal.
- **Shortcut Teal (`#14b8a6`)** / **Shortcut Amber (`#f59e0b`)** : raccourcis de navigation (HomeIndicator).

### Bands (TopHeader, invariants)
- **Band Central (`#1a130f`)** : ruban de contexte organisationnelle.
- **Band Org (`#1a1f2b`)**, **Band Org Ink (`#7aa2ff`)** : ruban org + texte.

## 3. Typography Rules

- **Famille** : stack système (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) — aucun webfont.
- **Features numériques** : `font-feature-settings: "tnum" on, "ss01" on` (globale) — chiffres tabulaires pour tous les montants.
- **Hiérarchie** :
  - Display / titres de page : `text-2xl` (24px) `font-black` ou `font-bold`.
  - Section headers : `text-base` à `text-lg` `font-bold`.
  - Corps : `text-sm` (14px) `font-medium` à `font-semibold`.
  - Labels / captions : `text-xs` (12px) `font-medium uppercase tracking-wider` (état tertiaire).
  - Montants dans les stat-cards : `text-2xl font-black tabular-nums`.

## 4. Component Stylings

- **Buttons** : `rounded-full` (pill), padding `px-4 py-2.5` (md) / `px-3 py-1.5` (sm) / `px-6 py-3.5` (lg). Variants : Primary (fond accent, texte blanc), Secondary (fond surface + bordure 1px), Danger (fond expense), Ghost (transparent, hover surface). État `active:scale-95`.
- **Cards & Panels** : fond `--card` ou `--surface`, `rounded-xl` à `rounded-2xl` (12–16px), bordure 1px `--border` optionnelle, ombre `0 4px 12px rgba(0,0,0,0.3)` (sombre) / `0.08` (clair).
- **FAB** : `56px` cercle, dégradé 135° accent, ombre `0 4px 16px` tint 38%, position `bottom: 80, right: 20`.
- **BottomNav** : barre fixe 128px (safe-area), fond `--nav-bg` + blur 10px, onglets `rounded-xl`, icône `20×20` + label `12px`, accent Orange sur l'onglet actif.
- **TopHeader** : hauteur ~64px, org badge `32×32 rounded-lg`, actions `36px`, fond band sombre, blur 10px.
- **Form Inputs** : `IonInput` / `IonSelect`, fond surface, focus ring 2px Orange, label `12px` tertiaire, placeholder `--text-placeholder`.
- **Status Badges** : pills `rounded-full` avec pastille couleur + label texte explicite (`StatusBadge`).
- **Skeletons** : `shimmer` via `translateX` (balayage 1400ms), base `--skeleton-base`, highlight `--skeleton-highlight`, radius 4px.

## 5. Layout Principles

- **Grille & Espacement** : base `4px`/`8px`. Mobile 1 colonne, viewport centré `max-w-lg` (320–411px). Marges 16px (1rem), gutters 16px, padding de cartes 16–24px.
- **Navigation** : BottomNav (tab bar) + TopHeader (contexte) + FAB. Pas de sidebar. `viewport-fit=cover`, safe-area insets gérés par tokens `--ion-safe-area-*` et utilitaires `.pb-safe`/`.pt-safe`.
- **Cibles tactiles** : minimum 48×48px. FAB 56px.
- **Responsive** : une seule colonne (mobile-first) ; desktop = viewport centré, jamais de grilles multi-colonnes.
- **Transition de vues** : fondu d'opacité ~220ms au montage de chaque vue Ionic (pas de transform, qui casserait le `position:fixed`).

## 6. Design System Notes for Stitch Generation

- **Mots-clés d'atmosphère** : cockpit financier mobile sombre, Orange Fire, surfaces stratifiées, chiffres tabulaires, instrumentation, fiable, technique.
- **Couleurs canoniques** : Canvas `#121212`, Card `#181818`, Surface `#212121`, Accent `#ff6b00`, Income `#1db954`, Expense `#e51332`, Pending `#ffb800`, Text `#ffffff`/`#b3b3b3`/`#808080`.
- **Prompts de composants** :
  1. Une page de tableau de bord financier mobile avec 3 stat-cards (entrée/sortie/balance) en chiffres tabulaires 24px `font-black`, une section « Transactions récentes » (listes 20×20 icône + montant), et une BottomNav fixe 5 onglets (icône 20px + label 12px, Orange sur l'actif).
  2. Un formulaire de saisie de transaction mobile : titre 16px `font-bold`, champ montant 48px avec préfixe devise, `IonSelect` pour catégorie (pill), `IonInput` date (bottom-sheet calendrier), CTA primaire pill 48px `rounded-full` accent Orange, safe-area bottom.
  3. Une page de rapport avec en-tête contextuel (bande sombre 44px + nom de l'org + 2 actions 36px), un `SegmentedTabs` (3 segments) pour filtrer par période, et une liste de lignes (montant tabulaire à droite, icône de statut colorée à gauche).
