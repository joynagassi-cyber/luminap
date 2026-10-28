# Receipt — Phase 10 : garde anti-dérive des jetons de design (R117)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-10-design-tokens-drift`
- **Priorité** : P2 (Phase 10 — design system)
- **Risque** : R117 (FAIBLE — divergence visuelle silencieuse)

## Tâche

Poser une garde anti-dérive entre les jetons de design dupliqués côté TypeScript
(`src/ionic/theme.ts`) et leur source de vérité CSS (`src/App.css`), sur le
modèle de la garde R65.b (inventaire jsonb).

## Défaut réel couvert

`theme.ts` déclare `LUMINA_TOKENS` (mode sombre) et `LUMINA_LIGHT_TOKENS` (mode
clair) — 16 clés chacune — pour poser les triplets `-rgb` et les variables
`--ion-*` que le CSS ne peut pas exprimer. `App.css` reste la source de vérité
des couleurs. **Aucun test** ne vérifiait l'alignement des deux : une retouche de
palette dans un fichier sans l'autre produisait une divergence visuelle
silencieuse (variables Ionic désynchronisées des surfaces CSS).

## Livrable

`src/lib/__tests__/design-tokens-drift.test.ts` (4 tests) :

1. le catalogue CSS expose > 10 tokens dans chaque bloc ;
2. chaque clé de `LUMINA_TOKENS` (camelCase → kebab-case) correspond à la valeur
   CSS de `:root` + `[data-theme="dark"]` ;
3. chaque clé de `LUMINA_LIGHT_TOKENS` correspond à `:root` +
   `[data-theme="light"]` ;
4. non-vacuité : la comparaison détecte une valeur erronée.

## Preuve de non-vacuité

`canvas` porté temporairement de `#121212` à `#000000` dans `theme.ts` :

```
AssertionError: canvas : TS=#000000 CSS=#121212
```

Valeur restaurée → 4/4 verts. La garde échoue donc bien sur une dérive réelle.

## Commandes et résultats

- `npx vitest run src/lib/__tests__/design-tokens-drift.test.ts` → 4 passed
- `npx tsc -b` → 0 erreur
- `npx vitest run` (suite complète) → 119 fichiers, tests verts

## Notes d'implémentation

`App.css` a trois blocs : le `:root` global (couleurs de données et d'accent,
partagées entre modes) puis `[data-theme="dark"]` et `[data-theme="light"]`
(neutres). La garde reproduit la cascade réelle en fusionnant `:root` puis le
bloc de thème.
