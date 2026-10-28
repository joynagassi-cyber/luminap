# Receipt — Phase 10 : a11y automatisée + états UX §5.1 généralisés + budgets de perf

- **Date** : 2026-10-27
- **Branche** : `agent/phase-10-a11y-ux`
- **Contrat** : Phase 10 (design / UX / perf / a11y) — ligne « Design system, UX,
  responsive, perf, a11y ».

## Défaut visé

Trois manques mesurables, tous vérifiables automatiquement :

1. **A11y non vérifiée.** Aucun test ne prouvait les invariants a11y des écrans
   principaux (titres, labels de champs, noms de boutons, `alt`). Les
   régressions d'accessibilité passaient silencieusement.
2. **États UX §5.1 partiels.** La garde §5.1 (« aucun écran muet ») n'existait
   que pour les écrans rendus par `RouteStates.tsx`. Les écrans montés par le
   routeur ne portaient pas tous un `data-screen-state` : un écran pouvait
   rester « muet » sans que rien ne le détecte.
3. **Aucun budget de perf.** Rien ne verrouillait le poids JS du premier rendu
   ni la taille du chunk d'entrée : une régression (import statique lourd) ne
   cassait aucun gate.

## Mesure (avant)

Commande : scan statique des composants montés par `<Route>` dans
`src/ionic/routes/*.tsx` (script identique à celui de la garde), sur `HEAD`
(`origin/main`, commit `32fdf19`).

| Mesure | Avant |
|---|---|
| Composants montés par le routeur | **62** |
| Composants exposant un état (`data-screen-state` / `ScreenState` / `EmptyState` / `SettingsShell`) | **34** |
| Composants **muets** (aucun état) | **28** |
| Tests a11y dédiés | **0** |
| Budget de perf verrouillé | **aucun** |

Les 28 écrans muets : `AuthPage, Balance, BudgetDetail, CulteDetail, CustomFields,
EventEdit, EventNew, FormBuilder, FormFill, GroupCotisation, Help, History,
InvitationClaim, InvitationEmit, Notifications, Onboarding, OrgReportSend,
OrgSetup, SaisieRapide, Settings, Splash, Trace, TransactionDetail,
TransactionEdit, TransactionNew, TransactionNewGroup, Tutorial, Versement`.

Poids JS du premier rendu (après `vite build`, chunks minifiés) :
`20` requêtes, `2284.5 kB` brut, `577.5 kB` gzip ; chunk d'entrée `index-*.js`
`736.5 kB` brut / `223.9 kB` gzip ; JS total `2179.3 kB` gzip.

## Livré

### 1. Tests a11y automatisés — **sans nouvelle dépendance**

`src/pages/__tests__/a11y-screens.test.tsx` (11 tests, jsdom) rend réellement les
écrans prioritaires (`/splash`, `/auth`, `/dashboard`, `/members`, `/finance`,
`/forms`) via le mock Ionic partagé (les `<ion-input>` deviennent de vrais
`<input>`, donc réellement présents dans l'arbre accessible) et vérifie 5
invariants, chacun **échouant** s'il est violé :

1. `data-screen-state` présent et appartenant au catalogue §5.1 ;
2. exactement **un** `<h1>` non vide par écran (structure de titres WCAG 2.4.1) ;
3. tout champ visible a un nom accessible (`aria-label` / `aria-labelledby` /
   `<label for>` / label englobant) ;
4. tout bouton visible a un nom accessible ;
5. tout `<img>` a un attribut `alt`.

Un bloc « auto-test » rend des écrans factices volontairement défectueux et
prouve que chaque assertion **rejette** bien la violation (sinon le harnais
lui-même serait vert à tort).

Correctifs a11y révélés et appliqués : `FormBuilder.tsx` (modale d'édition de
formulaire et éditeur de champ) — `aria-label` sur nom/clé/description du
formulaire, libellé/type/options/conditionnel/regex/mappage des champs, et
`aria-label="Fermer"` sur la croix ; `Finance.tsx` — `aria-label` sur recherche
et bornes de période.

### 2. États UX §5.1 généralisés + garde d'inventaire

Chaque écran monté par le routeur expose désormais un état UX observable :

- `data-screen-state` ajouté sur les 25 pages restantes (état par branche :
  `loading`, `ready`, `empty`, `notfound`, `forbidden`) ;
- `EmptyState.tsx` → `data-screen-state="empty"` ;
- `SettingsShell.tsx` → `data-screen-state="ready"` (couvre les 8 écrans
  Paramètres qui partagent ce shell).

`src/pages/__tests__/screen-states-guard.test.tsx` (5 tests) est la **garde
d'inventaire §5.1** (analogue de la garde RLS de la Phase 8). Elle lit les
sources et échoue si :

1. un composant monté n'expose aucun mécanisme d'état ;
2. une valeur `data-screen-state` sort du catalogue fini lu depuis
   `RouteStates.tsx` (anti-dérive : une faute de frappe est refusée) ;
3. le catalogue ne couvre plus les états clés `empty` / `loading` / `error` /
   `ready` ;
4. les composants partagés `EmptyState` / `SettingsShell` perdent leur marqueur.

### 3. Budgets de performance mesurés

`docs/agent/perf-budget.json` documente le budget et sa justification ;
`src/lib/__tests__/perf-budget.test.ts` (6 tests) le **verrouille** à partir de
l'artefact réel `dist/index.html` (entrée + `modulepreload`), et est
proprement `skip` si `dist/` n'existe pas (suite unitaire sans build).

| Budget | Mesure | Plafond | Marge |
|---|---|---|---|
| Requêtes au 1er rendu | 20 | ≤ 28 | +40 % |
| Poids brut 1er rendu | 2284.5 kB | ≤ 2560 kB | +12 % |
| Poids gzip 1er rendu | 577.5 kB | ≤ 650 kB | +13 % |
| Chunk d'entrée brut | 736.5 kB | ≤ 800 kB | +9 % |
| Chunk d'entrée gzip | 223.9 kB | ≤ 260 kB | +16 % |
| JS total gzip | 2179.3 kB | ≤ 2400 kB | +10 % |

Justification : le premier rendu conditionne le temps d'affichage perçu sur un
téléphone d'église (réseau 4G médiocre). Les plafonds sont fixés ~10–15 % au
dessus de la mesure courante — assez pour absorber le bruit de build, assez
serré pour échouer sur une vraie régression (ex. import statique lourd).

### 4. Garde de contraste des tokens (design system)

`src/lib/__tests__/design-tokens-contrast.test.ts` (10 tests) lit la source de
vérité `src/App.css` et vérifie le ratio WCAG 2.1 AA (≥ 4.5:1) des paires
texte/fond qui portent la lecture courante (`--text-primary` et
`--text-secondary` sur `--canvas` et `--surface`), dans les deux modes.

## Preuve (gates)

| Gate | Commande | Sortie |
|---|---|---|
| Typecheck | `./node_modules/.bin/tsc -b` | **0** |
| Lint | `./node_modules/.bin/eslint .` | **0 erreur** (warnings préexistants) |
| Tests (suite complète) | `./node_modules/.bin/vitest run` | **1378/1378** (103 fichiers) |
| Build | `./node_modules/.bin/vite build` | **OK** |

### Les nouveaux tests échouent sans le correctif (preuve de non-vacuité)

Chaque test a été désactivé/réintroduit volontairement, puis restauré :

| Test | Sabotage | Résultat |
|---|---|---|
| `screen-states-guard` (écran muet) | retirer le marqueur de `Help.tsx` | **échec** : `écrans sans état UX §5.1 : Help` |
| `screen-states-guard` (catalogue) | `data-screen-state="loadingg"` dans `Settings.tsx` | **échec** : `valeurs d'état hors catalogue : Settings: "loadingg"` |
| `perf-budget` | plafond brut du 1er rendu abaissé à 100 kB | **échec** : « le poids brut du premier rendu reste sous budget » |
| `design-tokens-contrast` | `--text-secondary` clair passé à `#f0f0f0` | **échec** : 2 tests de contraste |
| `a11y-screens` | retirer le `data-screen-state` de `Finance.tsx` | **échec** : « jamais passé à l'état « ready » » |

## Reste assumé (honnêteté)

- **Contraste des teintes d'indice.** `--text-tertiary` (≈ 3.0–4.7:1) et
  `--text-placeholder` (≈ 2.1–2.6:1) sont **sous** 4.5:1 par choix esthétique
  du mode sombre/clair (placeholders, légendes). Ils ne sont **pas** verrouillés
  pour ne pas figer une régression connue ; un passage à `#767676`-like pour le
  mode clair reste à décider (impact visuel). Les couleurs de données
  (`data-income` / `data-expense`) ne portent jamais seules l'information (le
  signe +/− la porte aussi) et ne sont donc pas verrouillées non plus.
- **Budget = instantané.** Le budget fige l'état au commit ; toute évolution
  volontaire du bundle doit mettre à jour `docs/agent/perf-budget.json` (mesures
  + plafonds) dans le même commit — c'est le point de friction assumé.
- **A11y limitée aux 6 écrans prioritaires** (+ la modale `/forms`). Les 56
  autres écrans sont couverts par la garde §5.1 statique (état présent) mais pas
  par le rendu a11y profond (labels/boutons/titres).
- **Pas de `@axe-core`.** Choix délibéré : invariants explicites sans nouvelle
  dépendance, conformément à la consigne. Une passe axe-core (contraste calculé
  réel, règles ARIA complètes) reste un complément possible en Phase 12
  (crawler).
- **`--ion-*` et `theme.ts`** non touchés : la consolidation demandée porte sur
  les tokens CSS (source de vérité), déjà centralisés dans `App.css` /
  `globals.css`.
