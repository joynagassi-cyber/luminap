# Design System dynamique — plan d'exécution

Date : 4 nov. 2026 · Base mesurée : `main @ ae019b2` · Statut : **P0 validé — P1 en cours, lot 1**

Sources : `Lumina — Design System dynamique.md` (spécification, 7 captures
finance) ; `lumina-design-system.md` (spec DS v1 du 2 nov. 2026, identité
sombre/orange) ; captures jointes. Le fichier
`lumina-bugs-backend-et-logique-metier.md` est une **piste séparée** (déjà
triée), hors périmètre de ce plan.

## 1. État des lieux mesuré (le dépôt a une longueur d'avance)

La spec suppose un point de départ quasi vierge. En réalité, une première
génération de système de thème **existe et fonctionne** :

| Brique demandée par la spec | État réel |
|---|---|
| Jetons sémantiques sur `:root` | ✅ `src/App.css` : `--canvas`, `--surface`, `--text-primary`, `--in`/`--out`… basculés par `[data-theme="dark"\|"light"]` sur `<html>` |
| Pont Ionic (un fichier) | ✅ `src/ionic/theme.css` + `src/ionic/theme.ts` (les `--ion-*` neutres pointent les jetons ; JS pour les triplets `-rgb`) |
| Thèmes interchangeables | ⚠️ Partiel : `src/ionic/themes.ts` = catalogue de **10 accents** (fire `#FF6B00`, spirit, trust…) choisis à l'onboarding/réglages via `ThemePicker` — seuls l'accent varie, pas les neutres ni la structure |
| Anti-flash avant 1er rendu | ✅ script inline `index.html` (`localStorage lumina-theme-mode`, suit `system`) |
| StatusBar synchronisée | ✅ `StatusBarBridge.tsx` (observe `data-theme`, `setStyle` + `setBackgroundColor`) |
| Test de contraste AA | ✅ `design-tokens-contrast.test.ts` (paires texte/surface + `--in`/`--out`, 2 modes) — avec exceptions assumées (`--text-tertiary`, placeholders < AA) |
| Tailwind branché sur les jetons | ✅ `tailwind.config.ts` mappe les couleurs sur `var(--…)` |
| Couleurs en dur | **214** occurrences hex (86 en CSS — définitions de jetons et palette `--data-*` incluses ; ~128 en TS/TSX concentrées : thèmes, logos SVG, `export.ts` PDF, logique de données) ; styles inline **1419** dont **779 déjà en `var(--…)`** et **3** seulement avec hex littéral |
| Jetons rayon / mouvement | ❌ absents (ombres : 5 jetons métier `--shadow-card`… ; z-index : oui) |
| Graphiques | ✅ Recharts 2.15 ; palette `--data-*` en dur dans `App.css` |
| Primitives d'UI | ⚠️ Trois générations cohabitent : `src/components/ui/` (45 fichiers shadcn/Radix), composants maison (124 fichiers), `ion-*` en direct (IonSelect, IonSegment, IonToggle…) |
| Inventaire | 65 pages, 76 routes, 617 fichiers TS/TSX, 41 specs Cypress, budget perf gardé (`docs/agent/perf-budget.json` : 20/28 requêtes, marge gzip 72,5 kB) |

**Conséquence** : ce n'est pas une création, c'est une **généralisation**.
P1 est ~40 % déjà fait ; le risque principal n'est pas technique mais de
**régression sur l'existant** (utilisateurs avec accent/mode persistés).

## 2. Écarts spec ↔ dépôt et conflits à trancher

| # | Point | Spec | Dépôt / décision antérieure | Traitement proposé |
|---|---|---|---|---|
| C1 | Attributs de thème | `html[data-theme='neon'][data-mode='dark']` | `[data-theme]` = **le mode** (dark/light), lu par CSS, `index.html`, `StatusBarBridge`, tests | Migrer : `data-mode` remplace l'usage actuel, `data-theme` = id du thème. Migration de persistance (`lumina-theme-mode` conservé comme clé mode), un lot dédié en P1 |
| C2 | Noms de jetons | `--lu-bg`, `--lu-fg`, `--lu-income`… | `--canvas`, `--text-primary`, `--in`/`--out`… déjà partout (CSS, Tailwind, inline) | **Décision D2** (§3) |
| C3 | `LuTabBar` | « `ion-tab-bar` + `ion-tab-button` » | **A8 : no-go documenté** (`docs/a8-iontabs-decision.md`) — enfants React non rendus en light DOM sous React 19, barre déjà réécrite en HTML natif | Le **visuel** de la spec (flottante, pastille) est adopté ; l'**implémentation reste HTML natif** (BottomNav actuelle restylée). Non négociable sans rouvrir A8 avec preuve appareil |
| C4 | Mode Ionic | `setupIonicReact({ mode: 'md' })` \[Probable\] | **A5 : aucun mode forcé** (par plateforme), garde commentée dans `App.tsx`, validation appareil §4.14 encore due | **Décision D3** — défaut recommandé : ne pas toucher |
| C5 | Modèle de thèmes | 6 thèmes structurants × 2 modes + `custom` | 2 modes × 10 accents ; identité actuelle = sombre + orange (≈ thème `noir` de la spec) | **Décision D1** — le thème actuel doit exister comme thème de la nouvelle génération (continuité utilisateurs + PDF) |
| C6 | Contraste | AA partout ou thème non publié | `--text-tertiary`/placeholders < AA **par choix** documenté | Cartographier `fg-subtle` comme « indice non-texte » à usages énumérés, ou relever le contraste (changement visuel) — à trancher en P1 avec le test étendu |
| C7 | `components/ui` (Radix) | « les pages composent des `Lu*` » | 45 fichiers shadcn encore présents (usage réel à inventorier) | P0 mesure l'usage ; P2 décide par composant : envelopper, remplacer par Ionic, ou supprimer si mort |
| C8 | Polices | Manrope auto-hébergée (+ variantes par thème) | Aucune police embarquée ; marge perf **72,5 kB gzip** | Une seule famille d'abord, sous-ensemble latin, mesurée contre `perf-budget` ; variantes par thème seulement si la marge le permet |
| C9 | Génération OKLCH | `ThemeSpec` → jetons au runtime | Aucune lib couleur ; `custom` exige du calcul runtime | Génération **au build** pour les thèmes livrés (script, zéro dépendance runtime) + petit moteur runtime testé pour `custom` uniquement |
| C10 | Design Lab | route `/dev/design-lab` hors production | Garde existante « surface DEV » (PowerSync) comme patron | Import paresseux sous `import.meta.env.DEV` + test-garde d'absence au build prod ; ne touche pas le budget du premier rendu |

## 3. Décisions (validées par Joy le 4 nov. 2026)

- **D1 — Thèmes : PHASAGE.** P1 livre le moteur avec **2 thèmes** : l'actuel
  porté à l'identique (continuité utilisateurs) + 1 thème de la spec en
  preuve ; les autres suivront en `ThemeSpec` (< 20 lignes chacun, critère
  §10.7 de la spec). Le catalogue 10 accents reste fonctionnel pendant la
  transition ; son devenir (presets du `custom`) se tranche au gate P1.
- **D2 — Noms de jetons : ALIAS PROGRESSIFS.** `--lu-*` définis comme alias
  des noms actuels en P1 ; nouveau code en `--lu-*` ; migration des fichiers
  au fil de P4 ; suppression des anciens noms en P5. Zéro big-bang.
- **D3 — Mode Ionic : A5 MAINTENUE** (par plateforme, aucun `mode` forcé).
  Le `mode: 'md'` de la spec est écarté ; réexamen seulement sur preuve
  appareil (checklist §4.14).
- **D4 — Accent `custom`** *(par défaut, à confirmer au gate P1)* : moteur
  de génération en P1 (il sert aux thèmes), UI d'administration en P4
  (écran Réglages).
- **D5 — `effects=lite`** *(par défaut, à confirmer sur appareil en P5)* :
  seuils de la spec (`deviceMemory ≤ 2` ou `hardwareConcurrency ≤ 4`),
  interrupteur utilisateur dès P1.

## 4. Architecture cible (adaptée au dépôt)

```
index.html (script anti-flash étendu : data-theme + data-mode + data-effects)
  └─ ThemeProvider (généralise applyTheme/applyThemeMode existants)
       ├─ tokens/  (générés au build depuis ThemeSpec[] ; --lu-* canoniques + alias anciens noms)
       ├─ ionic-bridge.css (extension de theme.css actuel : overlays ion-popover/alert/select…)
       └─ src/design-system/  (Lu* ; les pages ne voient plus que Lu* + jetons)
StatusBarBridge (existant, suit data-mode) · ThemePicker (généralisé)
```

Règle héritée des incidents A7/A8, ajoutée aux NeverBreak de la spec :
**tout `Lu*` qui enveloppe un `ion-*` à enfants projetés en light DOM est
prouvé sur le Design Lab + appareil avant usage** ; les `ion-*` dont Ionic
rend l'intérieur en shadow DOM (Toggle, Segment, Select, Searchbar,
Datetime, Input à label stacked) sont enveloppables sans ce risque.

## 5. Plan par phases (1 lot = 1 PR, CI 12/12 groupes Cypress inclus)

### P0 — Audit (aucun code) · gate : validation du rapport + D1–D5
- Importer la spec dans le dépôt (`docs/design-system-spec.md`) ; archiver
  la v1 comme référence historique.
- Inventaire scripté : hex/rgb/rayons/ombres en dur par fichier (base des
  214 + inline), usage réel des 45 `components/ui`, table « existant →
  `Lu*` » pour les 124 composants et 65 pages, consommateurs non-écran du
  thème (exports PDF `export.ts`, manifest).
- Classement des écrans par gravité visuelle (formulaires, selects,
  « Derniers mouvements ») → ordre P4.
- Livrable : `docs/design-system-audit.md`. **Aucun code.**

### P1 — Moteur & jetons · gate : Design Lab jetons + contraste vert
Lots (PR séparées) :
1. Attributs `data-theme`/`data-mode` + migration de persistance + script
   anti-flash étendu (comportement inchangé pour l'utilisateur).
2. Générateur de jetons (build) : ThemeSpec → primitives OKLCH →
   sémantiques `--lu-*` + alias anciens noms ; jetons manquants (radius ×
   `radiusScale`, shadow, chart-1…6, glass, focus-ring, hero).
3. `ThemeProvider`/`useTheme()` par-dessus l'existant ; bascule à la volée
   (View Transition + repli, `prefers-reduced-motion`) ; `data-effects`.
4. Pont Ionic complété (overlays) ; thème « actuel » porté à l'identique
   (test de non-régression visuelle par jetons) + 1 thème spec.
5. Test de contraste étendu : toutes paires × (thèmes × modes) + `custom`
   (génération + ajustement AA automatique, testés).
6. Lint en mode **ratchet** : les règles §0 bloquent tout *nouveau* littéral
   (baseline des 214 existants figée, décrémentée en P4/P5).
7. Police Manrope (sous-ensemble) si D8/C8 le permet — mesuré au budget.

### P2 — Primitives `Lu*`
LuButton, LuIconButton, LuChip, LuBadge/LuDelta, LuSegmented (capitalise
l'expérience #417 : état = classe sur l'hôte), LuField (label stacked —
corrige le motif « labels superposés »), LuSelect/LuOptionList, LuCard,
LuAmount (XOF sans décimales, signe − U+2212), LuSectionHeader,
LuEmptyState. Chaque composant : états complets (§5 spec), test de
comportement invalidé par mutation, entrée Design Lab. Sort des 45
`ui/` tranché composant par composant.

### P3 — Composites
LuAppBar, LuHero (tinted/solid/dark-orb), **LuTabBar = BottomNav restylée
HTML natif** (C3 : onglets configurables, FAB contextuel et
`ensureNavViewChunk` préservés), LuListRow/LuTransactionRow, LuProgress,
LuBanner, LuInsightCard (règles déterministes), LuSheet (saisie —
clavier Android prouvé), LuDateField/LuCalendar (pastilles : vérifier
`highlightedDates`, sinon strip custom), LuSwipeToConfirm (actions
irréversibles Lumina : clôture de période, validation de rapport…,
alternative accessible obligatoire), graphiques Recharts re-jetonnés,
LuTimeline.

### P4 — Migration des écrans (ordre de gravité, logique métier intacte)
Groupement proposé (~12–16 PR) : formulaires de saisie
(TransactionNew/Group, formulaires dynamiques) → Dashboard (dont
« Derniers mouvements ») → Historique/transactions → Balance/Rapports
(déjà IonSegment) → Membres/Groupes → Finance/Caisses → Archives →
Onboarding/Auth → Réglages (+ UI thème/`custom`/effects) → écrans d'admin.
Par PR : Cypress vert (adaptations de specs = test-only), axe sur l'écran,
décrément de la baseline lint.

### P5 — Durcissement · gate : critères §10 de la spec
- Baseline lint à zéro ; suppression des alias d'anciens jetons ; audit
  final des styles en dur.
- Appareil Android réel : flou/`lite`, clavier des sheets, StatusBar,
  bascules de thème — **fusionner avec la checklist `docs/audit-permissions.md`
  §4 encore ouverte** (dont §4.14 mode par plateforme et §4.10 safe-area).
- cypress-axe sur Design Lab + écrans clés × thèmes × modes (nouvelle
  devDep à valider).
- Documentation : ce plan soldé, `docs/ui-exceptions.md` mis à jour (la
  ligne BottomNav reste : HTML natif, désormais *stylé* par le DS).

## 6. Dimensionnement & risques

C'est un **programme de plusieurs semaines**, pas une PR : ~22 composants
`Lu*`, 65 écrans, chaque lot gated par une CI complète (~35–50 min,
groupes Cypress inclus). L'existant (§1) raccourcit P1 mais impose la
prudence (préférences persistées des utilisateurs en production).

| Risque | Mitigation |
|---|---|
| Régression visuelle silencieuse sur 65 écrans | Thème actuel porté « à l'identique » en P1 (jetons équivalents), migration écran par écran, Design Lab comme recette |
| Enfants React dans custom elements (A7/A8) | Règle §4 ci-dessus ; LuTabBar en HTML ; preuve appareil avant généralisation |
| Budget perf (marge 8 requêtes / 72,5 kB) | Génération au build, police unique mesurée, Design Lab hors prod, garde `perf-budget` existante en CI |
| `backdrop-filter` sur Android d'entrée de gamme | `effects=lite` par seuils + interrupteur ; ≤ 2 surfaces verre (spec §11) |
| Conflit avec sessions parallèles (vécu #417) | Une phase = une branche = une PR ; ce plan comme référence unique |
| Volume P4 (fatigue de relecture) | Lots par domaine, ordre de gravité : la valeur arrive d'abord sur les écrans à bugs |

## 7. Hors périmètre (spec §0.6)
Aucune logique métier, aucun modèle de données, aucune correction du
fichier bugs (piste séparée). Aucun changement de navigation (A8 reste
tranchée : pile unique, BottomNav maison).

## 8. Suivi
- 4 nov. 2026 : plan et décisions D1–D3 validés ; spec importée
  (`docs/design-system-spec.md`, v1 archivée en
  `docs/design-system-spec-v1-archive.md`) ; **P0 en cours**
  (`docs/design-system-audit.md`). Gate avant P1 : validation du rapport
  P0 + confirmation D4/D5.

- 5 nov. 2026 : rapport P0 et gate P1 validés : D4 (moteur `custom`
  en P1, UI en P4, unification des catalogues en P1), D5 (seuils de la
  spec provisoires), thème preuve `violet`, Inter conservée, C6 (texte
  tertiaire ≥ 3:1). Le lot 1 sépare `data-theme` (accent existant) de
  `data-mode` (mode résolu) sans ajouter de clé de persistance. Les autres
  lots P1 et la validation Design Lab restent à réaliser.
- P1 lot 2 : socle d'alias `--lu-*`, générateur OKLCH et CSS violet
  généré au build ; application du seuil C6 sur les surfaces historiques.
  Violet est préparé mais pas encore sélectionnable ; raccordement Ionic,
  Provider, `custom` interactif et contrôle AA global restent à faire.
- P1 lot 3 en cours : Provider/hook sur les préférences existantes, transitions
  avec respect du mouvement réduit, détection et choix des effets. Le réglage
  `lite` agit sur les jetons de verre ; il ne retouche pas les écrans anciens.
  Le raccordement du violet, `custom`, le pont Ionic et Design Lab restent dus.
- P1 lot 6 : **lint en mode ratchet** livré (`scripts/design-ratchet.mjs`,
  branché sur `pnpm lint` donc la CI). Règle ESLint locale
  `design/no-hardcoded-colors` (hex, `rgb(`/`hsl(`, `style={{ color: "…" }}`
  non-`var()`) + scan CSS ; la baseline figée
  `scripts/design-ratchet-baseline.json` (462 littéraux, 97 fichiers, hors
  `src/design-system/tokens/` et tests) n'autorise que les littéraux
  existants — tout nouveau littéral casse le lint. La baseline ne diminue
  qu'explicitement (`pnpm lint:ratchet:update`), à décrémenter en P4/P5.
  Note : pas de dépendance stylelint ajoutée ; le volet CSS est couvert par le
  même runner sans nouveau devDep. Reste dû en P1 : raccordement violet
  (lot 4, PR en attente), Design Lab, police.
- P1 lot 5 : **test de contraste étendu AA** livré
  (`src/lib/__tests__/design-system-contrast-aa.test.ts`). Nouveau registre
  `THEME_SPECS` dans `tokens/themes.ts` : le test itère chaque thème publié ×
  dark/light et exige 4.5:1 sur fg/bg, fg-muted/surface, on-accent/accent,
  income/surface, expense/surface, hero-fg/hero-bg (échec = CI rouge, spec
  §0.3 « un thème qui échoue n'est pas publié »). Le thème `custom` est
  couvert par une grille hue × luminosité (52 hex) via `createCustomTheme` +
  ajustement noir/blanc testé, et les entrées invalides rejetées. Audit du
  catalogue historique : les 10 accents atteignent AA avec noir OU blanc,
  et l'écart connu « blanc sur accent < AA » (fire, emerald, care, know) est
  verrouillé comme exception documentée — à corriger à l'unification P4/P5,
  sans toucher à l'apparence du thème actuel en P1.
- P1 lot 7 (gate) : **Design Lab** livré — route `/dev/design-lab`, 100 %
  dev-only (vérifié : 0 référence dans le bundle `pnpm build`, route et
  résolveur compilés hors prod via `import.meta.env.DEV`). Barre fixe
  thème (10 accents, boutons — aucun `<select>` natif) × mode × effets,
  tous les jetons `--lu-*` résolus (couleurs, rayons, ombres, typo) lus
  via getComputedStyle, plus un aperçu hero + cartes façon maquettes.
  Les composants `Lu*` (P2/P3) y entreront au fur et à mesure. Gate P1
  atteint côté outillage ; reste : raccordement violet (#424) et `custom`.
- P2 lot 1 : premières primitives `Lu*` livrées dans
  `src/design-system/components/` — **LuButton** (6 variantes, tailles
  lg/md/sm, shape rounded, états pressed/focus/disabled/loading, 100 %
  jetons), **LuIconButton**, **LuChip** (+ `LuChipRow` snap-x),
  **LuBadge/LuDelta** (signe + icône + couleur, §0.4). Entrées Design Lab
  avec tous les états. Tests de comportement (19 tests ciblés). La baseline
  ratchet a été re-figée pour absorber uniquement les 3 hex du violet
  (merge #424) : 465 littéraux, toujours 0 nouveau depuis.
- P2 lot 2 : **LuCard** (surface / inverse / accent / glass avec repli
  surface-2 en effects=lite / stat / tile cliquable clavier), **LuAmount**
  (Intl fr-FR, XOF sans décimales, signe − U+2212, décimales en
  --lu-fg-subtle, tabular-nums, tailles display 44 / amount-lg 36),
  **LuField** (label au-dessus DANS le champ, h 56, états
  focus/erreur/disabled/readonly, message sous le champ), **LuSegmented**
  (indicateur animé 200 ms, état = classe sur l'hôte + aria-selected,
  variante signed income/expense). Entrées Design Lab + 16 tests.
- P2 lot 3 : **LuOptionList** (conteneur surface-2 r20 p6, item h44
  sélectionné = surface blanche/inverse + ombre + coche), **LuSelect**
  (3 modes auto : ≤5 liste en ligne, 6–20 popover, >20 bottom sheet avec
  recherche ; champ façon LuField, fermeture Échap/clic extérieur),
  **LuSectionHeader** (titre 17/700 + action accent), **LuEmptyState**
  (illustration 160 px 100 % jetons, titre, texte, CTA). Helper
  `useInversePair` partagé (LuSegmented aligné dessus). Entrées Design
  Lab + 8 tests.
- P3 lot 1 (composites) : **LuHero** 3 variantes (`tinted` accent-soft +
  carte remontée coins hauts 28 ; `solid` aplat hero coins bas 32, badge
  on-hero, bloc imbriqué overlay 10 % ; `dark-orb` carte orb-bg r24,
  valeur accent-vivid, orbe flou 24, chip verre, bouton blanc pill),
  **LuAppBar** (56 + safe-area, 3 slots, variantes tinted/transparent/
  solid, grand titre 28/700 + méta), **LuTransactionRow** (carte r16,
  icône 44, titre 15/600, montant signé ▲/▼, chevron, mode `grouped`
  avec séparateurs pour les thèmes clairs), **LuTabBar** flottante HTML
  natif (marges 12 + safe-area, h64 r32, ombre lg, styles actif
  pill/soft/text). 3 nouveaux jetons (--lu-orb-bg/on-orb/overlay-ink/
  orb-glow). Entrées Design Lab + 9 tests.
- P3 lot 2 : **LuBanner** (accent-soft 13/500 fermable ✕ + variante
  action pleine largeur cercle icône/titre/sous-titre/chevron),
  **LuProgress** (piste surface-2 h8 pill, remplissage jeton
  --lu-progress-fill vivid→accent, dates aux extrémités, légende,
  variante budget « (x %) restant »), **LuFab** (56 fixe au-dessus de la
  tab bar, cercle ou carré r16, ombre lg), **LuSwipeToConfirm** (piste
  pill h56 surface-inverse, pouce 48 accent, validation à 85 % de course,
  retour élastique, alternative clavier Entrée/Espace). Entrées Design
  Lab + 10 tests.
- P3 lot 3 : **LuSheet** (bottom sheet, poignée, rayon haut 28, snaps
  60/92 %, backdrop scrim, fermeture Échap), **LuAmountInput** (saisie
  40/700 tabulaire, devise préfixe muted, parse « 12 500,50 » → majeurs),
  **LuTimeline** (points + ligne verticale, montant signé),
  **LuChart** (barres SVG 100 % jetons --lu-chart-*, barre max accent,
  grille chart-grid, légende). Entrées Design Lab + 6 tests.
- P4 lot 1 (migration Dashboard, zéro logique métier) : le héro
  « executive » devient **LuHero solid** (salutation + avatar, résultat
  net en LuAmount display, badge delta on-hero, bloc imbriqué overlay :
  pill sync + tuiles Entrées/Sorties + sparkline 6M) ; **Actions
  rapides** en tuiles **LuCard tile** ; **Derniers mouvements** en
  LuSectionHeader + **LuTransactionRow** (+ LuEmptyState). Ancres
  Cypress conservées (« Derniers mouvements », aria-label héro,
  BottomNav natif inchangé).
- P4 lot 2 (reste du Dashboard, zéro logique métier) : « À traiter »,
  « Rapports reçus » et « Événements à venir » passent en
  LuSectionHeader + **LuTransactionRow** (montant signé, chevron,
  sous-titres combinés) ; en-tête « Caisses des groupes » en
  LuSectionHeader (cartes CaisseCard laissées pour le lot 3).
- P4 lot 3 : **CaisseCard** reconstruite sur **LuCard surface** cliquable
  (role=button + clavier, aria-label conservé) avec **LuAmount** signé
  coloré income/expense, **LuBadge** « n en attente », sparkline 6M
  conservée ; calcul solde/sparkline inchangé.
