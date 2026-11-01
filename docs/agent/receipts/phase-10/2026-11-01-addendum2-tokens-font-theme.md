# Reçu — Addendum 2 : jetons de la maquette dashboard-MF, Inter, thème « système » (Phase 10)

**Date :** 2026-11-01
**Branche :** `design/addendum2-dashboard-mf`
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
section s'intitule « À traiter » (libellé de la maquette).

### B1 (suite) — migration app-wide des jetons d'argent

Les anciens jetons financiers `--data-income` / `--data-expense` /
`--data-expense-hover` / `--data-pending` ont été **entièrement renommés** vers
`--in` / `--out` / `--out-hover` / `--warn` dans **tout** le dépôt (~450
occurrences, ~80 fichiers) : écrans, composants, `tailwind.config.ts`,
`src/ionic/theme.ts` (catalogue TS + triplets `-rgb`), `src/lib/{utils,badges,
event-status,export,tutorialContent}.ts`, `capabilities/federation`, le SVG
`public/diagrams/domain-logic.svg` et le sélecteur Cypress `forms-v2.cy.ts`.

- `App.css` reste le fichier de jetons unique : les anciens noms sont
  **supprimés** (plus aucun alias `--data-income`), `--out-hover` est ajouté
  dans les deux modes.
- `src/lib/export.ts` (graphique PNG canvas, qui ne lit pas les CSS vars)
  résout désormais `--in`/`--out` **au runtime** via `getComputedStyle` (suit le
  mode) avec repli sur la valeur du mode sombre, au lieu de hex figés.
- Garde de non-régression : `src/lib/__tests__/money-token-migration.test.ts`
  (4) interdit le retour des anciens noms dans `src`, `cypress`, `public`,
  `tailwind.config.ts`, `index.html`.

## Gardes

- `src/lib/__tests__/design-tokens-addendum.test.ts` (10) : présence du
  vocabulaire maquette dans les deux modes + contrastes WCAG (texte ≥ 15:1,
  `--brand-text` clair ≈ 5.2:1, argent ≥ 4.5:1).
- `src/lib/__tests__/money-token-migration.test.ts` (4) : aucun ancien jeton
  `--data-{income,expense,expense-hover,pending}` ; `--in/--out/--out-hover/
  --warn` définis dans les deux modes ; mapping Tailwind.
- `design-tokens-drift` / `design-tokens-contrast` / `theme-mode` /
  `boot-storage-resilience` : mis à jour et verts.

## Non-vacuité (mutations mesurées, restaurées)

| Mutation | Effet |
|---|---|
| `--brand-text` clair → `#ffcc99` | `design-tokens-addendum` échoue (contraste) |
| suppression de `--divider` (clair) | `design-tokens-addendum` échoue (jeton manquant) |
| `APPROVED: "var(--in)"` → `"var(--data-income)"` (`utils.ts`) | `money-token-migration` échoue (`src/lib/utils.ts → --data-income`) |

## Preuves

- `npx vitest run` : **206 fichiers, 2157 passés, 6 ignorés**.
- `npx tsc -b --force --noEmit` : 0 erreur.
- `npx eslint` (fichiers modifiés) : 0 erreur (avertissements préexistants).
