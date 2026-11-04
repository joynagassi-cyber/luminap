# Design System dynamique — Audit P0 (aucun code)

Date : 5 nov. 2026 · Base mesurée : `main @ ae019b2` (+ plan `6a212c2`) ·
Statut : **rapport P0 — gate avant P1**

Références : [plan](./design-system-plan.md) ·
[spec](./design-system-spec.md) · [spec v1 archivée](./design-system-spec-v1-archive.md).
Décisions déjà validées (4 nov. 2026) : **D1** phasage des thèmes,
**D2** alias `--lu-*` progressifs, **D3** mode Ionic par plateforme maintenu
(A5). Restent à confirmer au gate : **D4** (UI `custom` en P4) et **D5**
(seuils `effects=lite`).

Méthode : inventaire scripté (grep/python) sur l'arbre `src/` + `index.html`,
hors `__tests__`, `*.test.*` et `src/test/` (mocks), sauf mention contraire.
Aucun fichier applicatif n'a été modifié pour cet audit.

---

## 1. Architecture de thème existante (à généraliser, pas à créer)

| Pièce | Fichier | Rôle mesuré |
|---|---|---|
| Jetons sémantiques | `src/App.css` (423 l.) | 71 jetons définis ; deux blocs `[data-theme="dark"]` (:96, défaut) et `[data-theme="light"]` (:145) sur `<html>` |
| Pont Ionic | `src/ionic/theme.css` (283 l., 64 définitions distinctes) | `--ion-*` neutres → jetons ; couleurs Ionic custom ; surcharges overlays déjà présentes (`--surface-overlay`, `--option-selected-bg`) |
| Pont JS | `src/ionic/theme.ts` (133 l.) | `applyIonicThemeMode`, `setupLuminaTheme` ; exporte `LUMINA_TOKENS` / `LUMINA_LIGHT_TOKENS` (miroir JS des jetons — doublon à résorber en P1) |
| Catalogue d'accents | `src/ionic/themes.ts` (290 l.) | 10 thèmes 3 stops (`fire` défaut `#FF6B00`, `spirit`, `action`, `trust`, `emerald`, `care`, `know`, `feminine`, `tech`, `luxury`) ; `applyTheme` pousse `--accent-*` + `--ion-color-primary(-rgb)` ; mode `system/dark/light` + `applyThemeMode` (:269) ; persistance `lumina-theme-mode` + id de thème (`getStoredThemeId`/`persistThemeId`) |
| Anti-flash | `index.html` (:49-55) | Script inline : pose `data-theme` avant premier paint depuis `lumina-theme-mode` |
| StatusBar | `src/components/StatusBarBridge.tsx` (55 l.) + `src/lib/statusBar.ts` | Observe `data-theme`/`style` (`attributeFilter` :49), synchronise style + fond Android |
| UI thème | `ThemePicker.tsx` (79 l.), `ThemeToggle.tsx` (56 l.), `src/pages/SettingsTheme.tsx` (72 l.), `src/store/useThemeModeStore.ts` | Choix d'accent à l'onboarding (`OrgSetup.tsx:266`) et aux réglages ; bascule de mode persistée |
| Tailwind | `tailwind.config.ts` | Couleurs déjà mappées sur `var(--…)` (`canvas`, `surface`, `income: var(--in)`, `ring: var(--accent-primary)`…) ; ombres mappées sur les 5 jetons `--shadow-*` |
| Police | `src/main.tsx:5-12` | **Inter déjà auto-hébergée** via `@fontsource/inter` (latin + latin-ext, 400/500/600/700) ; `--font-sans` et `--ion-font-family` définis |
| Tests garde-fous | `src/lib/__tests__/design-tokens-{contrast,addendum,drift}.test.ts`, `design-token-undefined-guard.test.ts`, `money-token-migration.test.ts`, `perf-budget.test.ts` | Contraste paires texte/surface + `--in`/`--out` en 2 modes ; dérive de jetons ; budget perf (`docs/agent/perf-budget.json`) |

**Conclusion §1** : le moteur P1 part d'un socle réel (persistance, anti-flash,
StatusBar, pont Ionic, tests). Les manques sont le générateur (OKLCH), les
jetons de forme (rayons/ombres/mouvement), la couche `--lu-*`, le Design Lab,
le lint bloquant (stylelint absent, `culori` absent, `cypress-axe` absent) —
et `src/design-system/` n'existe pas encore.

## 2. Passif « valeurs en dur » quantifié (baseline du ratchet P1)

| Mesure (hors tests/mocks) | Valeur | Lecture |
|---|---|---|
| Hex `#rrggbb`/`#rgb` dans `src/` | **214** | Dont 81 dans `App.css` (définitions de jetons : légitimes), 73 dans `src/ionic/` (`theme.ts` 27, `themes.ts` 30 = palettes, `theme.css` 4), 33 `lib`, 14 `pages`, 12 `components`, 6 `types`, 6 `templates`, 3 `packs`, reste épars |
| `rgb()/rgba()/hsl()` littéraux | 20 | Concentrés CSS (scrim, fonds translucides) |
| `style={{…}}` inline | **1416** occurrences, dont **1199** référençant `var(--…)`, **6** avec hex littéral | La règle « pas de couleur en dur en TSX » est déjà quasi tenue ; le vrai passif inline est la forme : `borderRadius` ×24, `boxShadow` ×19, `fontSize` numérique ×37 |
| Valeurs arbitraires Tailwind | couleur `[#…]` : **0** ; tailles `[…px]` : 51 | Discipline Tailwind déjà bonne sur les couleurs |
| Jetons `var(--…)` consommés | **64** noms distincts ; top : `--accent-primary` 482, `--surface` 358, `--border` 267, `--out` 228, `--in` 174, `--surface-hover` 166, `--text-tertiary` 164, `--card` 88 | Une dizaine de jetons portent l'essentiel de l'app : ce sont eux que les alias `--lu-*` doivent couvrir en priorité |

**Distinction essentielle** : une partie des hex ne sont pas du style d'écran
mais des **couleurs-données** (cf. §8) : palettes de groupes
(`lib/group-service.ts` ×10), statuts de cotisation (`cotisation-logic.ts`
×4), thèmes par type d'organisation (`types/index.ts` ×18 valeurs),
`accentColor` par défaut persisté en base (`dataLayer.ts` : `#FF6B00` ×3).
Elles ne doivent **pas** être remplacées par des jetons d'écran ; elles
relèvent du futur `custom`/presets (D4) et de la palette graphique.

## 3. Jetons actuels → correspondance `--lu-*` (base des alias P1, D2)

71 jetons définis dans `App.css` + `--radius` (globals.css). Familles :
surfaces (`--canvas --surface --card --surface-nav --surface-hover
--surface-active --nav-bg --bg`), texte (`--text-primary --text-secondary
--text-tertiary --text-placeholder --text --text-muted`), marque
(`--accent-primary --accent-light --accent-dark --on-accent --brand-fill
--brand-on-fill --brand-text`), argent (`--in --in-bg --out --out-hover
--out-bg --warn --warn-bg --btn-in-* --btn-out-*`), données
(`--data-planified/advance/pink/exhausted/success/muted/alert`,
`--shortcut-events/forms/reports`), ombres (`--shadow-card/pop/accent/
accent-sm/fab`), z (`--z-nav/overlay/float/toast/skip`), métier
(`--band-*`, `--org-chip-*`, `--sync-*`, `--notif-dot`, `--skeleton-*`,
`--scrim`, `--divider`, `--nav-height`).

| Sémantique spec (`--lu-*`) | Existant | Écart pour P1 |
|---|---|---|
| `--lu-bg` / `--lu-surface` | `--canvas` / `--surface` (+ alias `--bg`, `--card` doublon) | Alias direct ; résorber `--card` |
| `--lu-surface-2` | `--surface-hover` (166 usages, double emploi hover) / `--surface-active` | Clarifier : surface-2 = palier, hover = état |
| `--lu-surface-inverse`, `--lu-hero-*` | — (rien) | À créer (les heros actuels sont ad hoc) |
| `--lu-fg` / `--lu-fg-muted` | `--text-primary` / `--text-secondary` | Alias direct |
| `--lu-fg-subtle` | `--text-tertiary` + `--text-placeholder`, **< AA par choix documenté** | Décision C6 : relever le contraste ou cantonner à « indice non-texte » à usages énumérés |
| `--lu-accent` / `-vivid` / `-soft` / `-pressed` | `--accent-primary` / `--accent-light` / rien (color-mix épars) / `--out-hover` pour expense | À formaliser (`-soft` déjà implicite `--option-selected-bg`, `color-mix` ×n) |
| `--lu-on-accent` | `--on-accent` | Alias direct |
| `--lu-income` / `--lu-expense` (+soft) | `--in` / `--out`, `--in-bg` / `--out-bg` | Alias direct — déjà AA verrouillés par test |
| `--lu-warning` / `--lu-info` | `--warn` / — | `--lu-info` à créer |
| `--lu-border` / `-strong` / `--lu-focus-ring` | `--border` (+`--divider`) / rien / `ring` Tailwind = accent | À formaliser |
| `--lu-chart-1…6` | `--data-*` (7) + `--shortcut-*` (3) non ordonnées | À ordonner en palette graphique ; statuts métier (cotisation) séparés |
| `--lu-radius-*` (échelle × `radiusScale`) | `--radius` 0.5rem unique + `--skeleton-radius` | Échelle complète à créer ; absorption des 24 `borderRadius` inline et 51 `[…px]` |
| `--lu-shadow-sm/md/lg` | 5 ombres métier (`--shadow-card` = `none` en sombre ✔ conforme spec) | Re-mapper sur 3 paliers |
| `--lu-glass-*`, `--lu-dur-*`, `--lu-ease` | — | À créer (verre gated par `data-effects`) |
| `--lu-font-display` / `-body` | `--font-sans` = Inter auto-hébergée | La spec propose Manrope : surcoût bundle à mesurer (marge gzip 72,5 kB) ; défaut recommandé : **garder Inter en P1**, variante display plus tard |

## 4. Recensement `ion-*` direct (surface de P2/P3)

**896 occurrences `<Ion…>` dans 78 fichiers** (hors tests/mocks) :

| Bloc | Composants (occurrences) | Cible DS |
|---|---|---|
| Structure (reste Ionic) | `IonPage` 99, `IonContent` 96, `IonApp` 1, routeur 5 | Hors règle « apparence » — inchangé |
| En-têtes | `IonHeader` 32, `IonToolbar` 32, `IonTitle` 33, `IonButtons` 31, `IonBackButton` 26 | **`LuAppBar`** (32 écrans ont le patron header) |
| Champs | `IonInput` 87, `IonLabel` 82, `IonItem` 78, `IonTextarea` 13 | **`LuField`** — le plus gros lot P2 ; le trio Item+Label+Input est le patron actuel à remplacer par label `stacked` |
| Sélection | `IonSelect` 57 + `IonSelectOption` 114, `IonCheckbox` 2 | **`LuSelect`/`LuOptionList`** ; vérifier au cas par cas ≤5 options |
| Actions | `IonButton` 58, `IonSpinner` 11 | **`LuButton`** (croisé avec `components/Button.tsx` maison, 85 l.) |
| Déjà DS-compatibles | `IonSegment` 1 + boutons 2 (#417), `IonSearchbar` 2, `IonToggle` 1, `IonRefresher` 2, `IonDatetime` 1 (via `DatePicker` maison), `IonAlert` 4 (via `ConfirmModal`) | Enveloppes fines `LuSegmented`, `LuDateField`… déjà à moitié faites |
| Divers | `IonCard` 3, `IonList` 1, `IonModal` 2, `IonInfiniteScroll` 4, `IonProgressBar` 1, `IonBadge` 3, `IonNote` 1 | Les cartes/listes sont maison (div) : `LuCard`/`LuListRow` partiront de l'existant, pas d'Ionic |

Règle héritée A7/A8 (déjà au plan §4) : envelopper sans preuve appareil
uniquement les `ion-*` rendus en shadow DOM ; **LuTabBar reste HTML natif**
(`BottomNav.tsx`, 312 l., rôle tablist) — la ligne « `ion-tab-bar` » de la
spec est écartée par la décision A8 (`docs/a8-iontabs-decision.md`).

## 5. `src/components/ui/` (shadcn/Radix) : 45 fichiers, 40 morts

Importateurs hors `ui/` : `chart` ×3, `tooltip` ×1, `switch` ×1,
`skeleton` ×1, `progress` ×1 — **tous les autres (40) à 0** : accordion,
alert(-dialog), aspect-ratio, avatar, badge, breadcrumb, button, calendar,
carousel, checkbox, collapsible, command, context-menu, dialog, drawer,
dropdown-menu, form, hover-card, input(-otp), label, menubar,
navigation-menu, pagination, popover, radio-group, resizable, scroll-area,
select, separator, sheet, sidebar, slider, table, tabs, textarea, toggle(-group).

Sort proposé (P2, PR de nettoyage dédiée, garde par build + suite complète) :
suppression des 40 morts ; `chart` (wrapper Recharts) à fondre dans les
graphiques jetonnés P3 ; `switch`/`skeleton`/`progress`/`tooltip` remplacés
par `IonToggle` déjà adopté, squelette maison (`IonSkeletonText` refusé en
A7, `prefers-reduced-motion`), `LuProgress`, et équivalent Ionic/maison.

## 6. Composants existants → catalogue `Lu*`

79 fichiers `.tsx` hors `ui/` (dont ~25 de tests). Correspondances directes :

| Existant | Cible | | Existant | Cible |
|---|---|---|---|---|
| `Button.tsx` (85) + `IonButton` ×58 | `LuButton` | | `BottomNav.tsx` (312) | `LuTabBar` (HTML natif) |
| `CircleAction.tsx` (51) | `LuIconButton` / `LuFab` | | `TopHeader.tsx` (190) | `LuAppBar` |
| `Badge.tsx` (191), `StatusBadge.tsx` (27), `lib/badges.ts` | `LuBadge` (+ `LuDelta`) | | `FormField.tsx` (78) + trio IonItem/Label/Input | `LuField` |
| `SegmentedTabs.tsx` (58) + IonSegment /balance | `LuSegmented` | | `DatePicker.tsx` (95) | `LuDateField` |
| `EmptyState.tsx` (72) | `LuEmptyState` | | `BottomDrawer.tsx` (33) + IonModal ×2 | `LuSheet` |
| `TransactionCard.tsx` (139) | `LuTransactionRow` | | `CapabilityBanner` (93), `ReportReminderBanner` (168) | `LuBanner` |
| `TrendChart.tsx` (95) + `ui/chart` | Graphiques jetonnés P3 | | `EventCalendar/` (505+118+36) | `LuCalendar`/`LuTimeline` (pastilles déjà maison : `EventDot`) |
| `PeriodLockCard.tsx` (206) | `LuCard` + candidat `LuSwipeToConfirm` | | `Skeleton`/`Shimmer`/`PageSkeletons` (56/176/515) | États de chargement jetonnés (hors catalogue spec : conserver) |
| `ConfirmModal.tsx` (149, IonAlert) | Dialogues natifs via pont (inchangé) | | `ThemePicker`/`ThemeToggle`/`StatusBarBridge` | Moteur P1 (généraliser) |

Sans équivalent direct (à construire) : `LuHero` (3 variantes), `LuAmount`
(le formatage existe en lib — `money-format` : l'envelopper en composant),
`LuInsightCard`, `LuAmountInput`, `LuSwipeToConfirm`, `LuSectionHeader`
(motif présent mais non factorisé), `LuChip` (motif épars).

## 7. Écrans (65 pages) et ordre de migration P4

Plus grosses pages (lignes) : Dashboard 1215, Tutorial 1137, EventDetail
1066, CentralAdmin 960, GroupDetail 952, Onboarding 926, ReportBuilder 849,
OrgReportDetail 824, SettingsGestion 717, Federation 706, FormSubmissions
687, FormBuilder 666, TransactionDetail 660, Archives 646, Reports 644,
TransactionNew 639 (65 pages, 76 routes via App.tsx + 12 modules
`src/ionic/routes/`).

Ordre P4 confirmé par la collecte (gravité = champs/selects × fréquentation) :

1. **Saisie** : TransactionNew, TransactionNewGroup, TransactionEdit,
   SaisieRapide, FormFill, FormBuilder, FormSubmissions (concentration
   IonItem/Input/Select maximale — bénéficient le plus de `LuField`/`LuSelect`)
2. **Dashboard** seul (1215 l., « Derniers mouvements », hero solde)
3. **Argent** : History, TransactionDetail, Finance, Balance (déjà
   IonSegment), Budgets/BudgetDetail, Versement, Cotisations, GroupCotisation
4. **Rapports** (découpé) : Reports, ReportBuilder, OrgReportsReceived,
   OrgReportDetail, OrgReportSend
5. **Membres/Groupes/Événements** : Members, MembreDetail, Groups,
   GroupDetail, Events, EventNew/Edit/Detail, CulteDetail
6. **Parcours** : AuthPage, Onboarding, OrgSetup (contient `applyTheme`),
   Invitation*, Welcome, Splash, NotFound
7. **Réglages** : Settings* (dont SettingsTheme = future UI moteur/`custom`)
8. **Admin** : CentralAdmin, Federation, OrgUnits, OrgRoles, Archives,
   Trace, Sessions, Health, Tutorial/Help, Search, Notifications

Soit ~14 lots P4 (les pages > 800 l. en lot solo). Chaque lot : aucune
logique métier touchée, Cypress vert (adaptations de specs en test-only si
un sélecteur d'apparence bouge), décrément de la baseline lint §2.

## 8. Consommateurs du thème hors écrans

| Consommateur | Constat | Traitement P1+ |
|---|---|---|
| `lib/export.ts` (PDF/canvas) | Lit `--in`/`--out` via `getComputedStyle` (:770) avec fallbacks hex ; palette « papier » fixe (`#F5F5F5`, `#1E1E1E`, `#646464`…) adaptée à l'impression | Centraliser en palette d'export nommée ; garder la lecture des jetons argent (suit le thème porté à l'identique) |
| `lib/bootWatchdog.ts:83` | Fallback `var(--accent-primary,#6366f1)` — indigo étranger à la marque | Fallback aligné sur l'accent par défaut en P1 |
| `lib/badges.ts`, `lib/tutorialContent.ts` | `var(--accent-primary)` et `color-mix` en chaînes : déjà jetonnés | Rien (suivent les alias) |
| `types/index.ts`, `templates/{school,church}.ts`, `packs/church` | **Second catalogue** de palettes par type d'organisation, parallèle aux 10 accents de `themes.ts` | À unifier dans le devenir des accents (gate P1, lié D4) : source unique des presets `custom` |
| `lib/dataLayer.ts` | `accentColor: "#FF6B00"` persisté (défaut DB) | Constante marque nommée, pas un jeton d'écran |
| `manifest/compiler.ts` | 2 hex (manifest PWA/app) | À brancher sur le thème porté ou constante de marque selon plateforme |

## 9. Surface de migration `data-theme` → `data-theme` + `data-mode` (C1)

Aujourd'hui `data-theme` **est** le mode. Points de contact exhaustifs :
`index.html` (script anti-flash), `src/App.css` (2 sélecteurs),
`src/ionic/themes.ts` (`applyThemeMode` écrit l'attribut ; types
`ThemeMode`), `src/ionic/theme.ts` + `theme.css` (commentaires/consommation),
`src/components/StatusBarBridge.tsx` (observateur), `src/store/useThemeModeStore.ts`,
`src/main.tsx:68`, `Badge.tsx`/`globals.css` (documentation), et les tests
`design-tokens-*` qui parsent les sélecteurs.

Bonne nouvelle mesurée : **aucune nouvelle persistance n'est nécessaire** —
`lumina-theme-mode` (system/dark/light) devient la source de `data-mode`, et
l'id d'accent déjà persisté (`getStoredThemeId`, défaut `fire`) devient la
source de `data-theme`. La migration est un renommage coordonné en un lot P1
avec les tests `design-tokens-*` mis à jour dans la même PR.

## 10. Écarts spec confirmés ou infirmés par l'audit

- ✅ **Infirmé** « aucune police » : Inter est déjà embarquée (offline-safe).
  La proposition Manrope de la spec devient optionnelle et conditionnée au
  budget perf — décision formelle au gate P1.
- ✅ **Confirmé** Recharts 2.15, `@capacitor/preferences`, Lucide présents ;
  `culori`, `stylelint`, `cypress-axe` **absents** (dépendances à valider en P1/P5).
- ⚠️ **Nuancé** « 12 combinaisons thème × mode » : avec D1 (phasage), P1
  livre 2 thèmes × 2 modes = **4 combinaisons** testées AA + le générateur
  `custom` testé unitairement ; le test de contraste existant couvre déjà
  les 2 modes du thème actuel et s'étendra mécaniquement par thème ajouté.
- ⚠️ **Nuancé** « aucun `ion-*` d'apparence dans les pages » : 896 usages
  dont ~290 structurels/patrons d'en-tête ; la cible réaliste est « aucun
  `ion-*` d'apparence **non enveloppé** », atteinte en fin de P4, mesurée
  par la même commande de recensement.
- ❌ **Écarté** (décisions antérieures) : `ion-tab-bar` (A8), `mode:'md'`
  forcé (A5/D3), `IonSkeletonText` (A7).

## 11. Baseline chiffrée pour les gates suivants

| Indicateur | P0 (mesuré) | Cible fin P1 | Cible fin P5 |
|---|---|---|---|
| Hex hors fichiers de définitions/palettes-données | ~45 (214 − définitions − données) | Baseline lint figée, 0 nouveau | 0 |
| `style={{` avec littéral couleur/forme | 6 hex ; 24 radius ; 19 shadow ; 37 fontSize | Interdits aux nouveaux fichiers | 0 (jetons radius/shadow/typo) |
| `--lu-*` définis / consommés | 0 / 0 | Alias complets §3 / nouveau code | Anciens noms supprimés |
| Combinaisons AA testées | 1 thème × 2 modes | 2 thèmes × 2 modes + `custom` | Tous thèmes livrés × 2 modes |
| Fichiers `components/ui` morts | 40 / 45 | — | 0 (suppression P2) |
| Écrans migrés `Lu*` | 0 / 65 | 0 (moteur seul) | 65 / 65 (P4) |

## 12. Gate P1 — ce qui est demandé à la validation de ce rapport

1. **D4** : UI d'administration du `custom` en P4 (moteur de génération en
   P1) — et unification des deux catalogues d'accents (§8) traitée en P1.
2. **D5** : seuils `effects=lite` de la spec adoptés provisoirement,
   preuve appareil en P5.
3. **Thème spec « preuve » de P1** (en plus du thème actuel porté) :
   recommandation audit = **`violet`** (sombre, hero `solid`, proche de
   l'ergonomie actuelle dark-first ; accent spec déjà assombri AA) — il
   exerce neutres teintés OKLCH, hero et accent dérivé sans imposer le verre.
4. **Police** : Inter conservée en P1 (recommandation §3), Manrope
   réévaluée seulement si le budget perf le permet après mesure.
5. **C6** (`--lu-fg-subtle`) : recommandation = relever `--text-tertiary`
   au seuil AA « gros texte/graphique » 3:1 minimum et cantonner
   `--text-placeholder` aux placeholders, énumérés — à confirmer, car c'est
   le seul changement visuel que P1 ferait au thème « porté à l'identique ».

**Après validation : P1 en 7 lots** (plan §5) — attributs/persistance,
générateur+jetons, provider, pont, contraste étendu, lint ratchet, police
mesurée. Aucun écran n'est touché avant le gate de fin P1 (Design Lab).
