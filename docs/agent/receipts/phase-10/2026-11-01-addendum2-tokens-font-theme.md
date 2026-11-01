# Reçu — Addendum 2 : jetons de la maquette dashboard-MF, Inter, thème « système » (Phase 10)

**Date :** 2026-11-01
**Branche :** `verify/pr5-pr7-pr19-robustness-2`
**Portée :** volet B de l'addendum 2 (design de référence), sans toucher aux
propositions produit PR8–PR16.

## Ce qui a été fait

### B1 — Vocabulaire de jetons de la maquette

`src/App.css` reste le **fichier de jetons unique**. Le vocabulaire de la
maquette est ajouté comme **alias** des jetons historiques (zéro renommage
massif sur 99 fichiers) :

| Jeton maquette | Alias de |
|---|---|
| `--bg` | `--canvas` |
| `--text` | `--text-primary` |
| `--text-muted` | `--text-secondary` |
| `--brand-fill` | `--accent-primary` |

Les jetons neufs portent des valeurs **distinctes par mode** : `--in`, `--out`,
`--warn` (+ `-bg`), `--btn-in-bg/ink`, `--btn-out-bg/ink`, `--surface-nav`,
`--divider`, `--brand-text`. Palette sombre recalée sur la maquette
(canvas `#0F0F10`, surface `#1A1A1C`, surface-hover `#232326`, border
`#2C2C30`…).

### B2 — Inter embarquée + thème « système » par défaut

- `@fontsource/inter` (woff2, sous-ensembles latin + latin étendu, 400/500/600/700)
  importé dans `src/main.tsx` ; `--font-sans` appliqué globalement. **Aucun appel
  réseau à l'exécution** (l'app doit marcher hors ligne).
- `src/ionic/themes.ts` : `ThemeMode = "system" | "dark" | "light"`, **défaut
  « system »**, `resolveThemeMode` (suit `prefers-color-scheme`).
- `ThemeToggle` : sélecteur 3 états (Système / Clair / Sombre), cibles 44 px.
- `index.html` : script de pré-peint résout « system » avant le premier rendu.
- `color-scheme` posé dans les blocs de jetons (contrôles natifs adaptés).

### Dashboard de référence

`src/pages/Dashboard.tsx` (écran de référence de la maquette) consomme
désormais `--in` / `--out` au lieu de `--data-income` / `--data-expense`, et la
section s'intitule « À traiter » (libellé de la maquette). Les **86 usages**
de `--data-income/expense` dans les autres écrans ne sont **pas** touchés :
une migration app-wide de la palette financière (vert/orange de la maquette vs
vert/rouge historiques) reste un **arbitrage produit** — hors périmètre.

## Gardes

- `src/lib/__tests__/design-tokens-addendum.test.ts` (10) : présence du
  vocabulaire maquette dans les deux modes + contrastes WCAG (texte ≥ 15:1,
  `--brand-text` clair ≈ 5.2:1, argent ≥ 4.5:1).
- `design-tokens-drift` / `design-tokens-contrast` / `theme-mode` /
  `boot-storage-resilience` : mis à jour et verts.

## Non-vacuité (mutations mesurées, restaurées)

| Mutation | Effet |
|---|---|
| `--brand-text` clair → `#ffcc99` | `design-tokens-addendum` échoue (contraste) |
| suppression de `--divider` (clair) | `design-tokens-addendum` échoue (jeton manquant) |

## Preuves

- `npx vitest run` : **206 fichiers, 2161 passés, 6 ignorés**.
- `npx tsc -b --force --noEmit` : 0 erreur.
- `npx eslint` (fichiers modifiés) : 0 erreur (avertissements préexistants).
