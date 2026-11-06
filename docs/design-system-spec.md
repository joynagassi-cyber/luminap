# Lumina — Design System dynamique

*Spécification destinée à l'agent de codage. Source : 7 captures de référence (apps finance). Stack : Ionic React + Capacitor. Niveau de confiance : \[Établi\] = observé sur les captures ; \[Probable\] = déduit ou valeur approchée ; \[À vérifier\] = à confirmer sur appareil.*

## 0. Règles NeverBreak (design)

1. Aucune couleur, rayon, ombre, taille de police ou espacement codé en dur dans un composant ou une page : uniquement `var(--lu-*)`. Lint bloquant (stylelint `color-no-hex`, ESLint `no-restricted-syntax` sur littéraux `#xxxxxx`, `rgb(`, `style={{color` et `style={{background`) hors de `src/design-system/tokens/`.
2. Les pages n'utilisent pas `ion-*` pour l'apparence : elles composent des composants `Lu*`. Les `Lu*` enveloppent Ionic (on garde gestes, accessibilité, animations natives).
3. Chaque surface a sa paire `--lu-on-*`. Contraste WCAG AA vérifié par test automatique pour CHAQUE combinaison thème × mode : 4.5:1 texte normal, 3:1 gros texte et éléments graphiques. Un thème qui échoue n'est pas publié.
4. Jamais la couleur seule : revenu / dépense = signe (+ / −) + icône (▲ / ▼) + couleur.
5. Changer de thème ne recharge rien et ne perd aucun état.
6. Non-régression : la migration visuelle ne modifie aucune logique métier, aucun modèle de données.

## 1. ADN commun extrait des 7 références

- **Pill partout** : boutons, chips, segmented, tab bar, badges = rayon 999. Les conteneurs de contenu sont en grands rayons (20–32).
- **Un seul accent par thème**, utilisé en grand aplat (hero, bouton principal, onglet actif, barre de progression). Le reste est neutre. Une seule carte « inversée » (blanche sur fond sombre) par écran pour créer un point focal.
- **Chiffres héros** : très gros (36–44), gras, interligne serré, chiffres tabulaires. Les décimales sont plus claires que la partie entière (réf. 5/6).
- **Hiérarchie par surfaces, pas par bordures** : fond < carte < carte imbriquée. Clair = ombres très diffuses ; sombre = pas d'ombre, paliers de gris + bordure 1px à 6 % de blanc.
- **Icônes outline** (trait 1.75, 20–24 px) dans un conteneur (cercle ou carré arrondi) teinté.
- **Cartes courtes** : titre 14 muted, valeur énorme, légende 12 muted ; liste = icône + titre/sous-titre + montant à droite.
- **Sections d'écran** : titre 15–18 gras à gauche, lien « Voir tout » en accent à droite.
- **Gestes** : swipe-to-confirm pour l'action importante, bottom sheet pour la saisie, filtres en chips horizontaux.

### Ce que chaque capture apporte

| Réf. | Thème | Apport spécifique |
| --- | --- | --- |
| 1 | `lime` (clair) | En-tête teinté qui fusionne avec la barre ; calendrier à pastille ; liste verticale de choix (Daily / Weekly / Monthly) ; timeline horizontale ; donut segmenté ; état vide illustré ; bouton plein + bouton contour avec icône |
| 2 | `neon` (sombre) | Hero plein accent texte noir ; carte inversée blanche ; mini barres d'activité ; slider de confirmation ; tab bar flottante à pastille active ; boutons noir / translucide |
| 3 | `violet` (sombre) | Même structure que `neon` avec autre accent : preuve que le thème = paramètres, pas une refonte. Grille de 4 tuiles d'actions rapides ; carte produit pleine accent avec badge « New » |
| 4 | `mint` (clair verre) | Fond dégradé maillé, panneaux verre dépoli, champs gris avec mini-label intégré, semi-donut à bouts ronds, barres arrondies grises avec barres actives colorées, courbe en aire à dégradé et ligne de référence pointillée |
| 5/6 | `ocean` (clair) | Carte héros sombre avec orbe lumineuse + chip verre « AI Insights » ; barre de budget en dégradé ; décimales atténuées ; segmented Sortie ▲ / Entrée ▼ ; donut avec infobulle ; FAB carré arrondi ; bottom sheet de saisie à chips ; tab bar à pastille douce |
| 7 | `noir` (sombre mono) | Verre sombre, carte marbrée, accent orange rare, barres verticales en pilule avec une barre active en dégradé, heatmap, flux (sankey), cartes flottantes inclinées (décoratif seulement) |

## 2. Thèmes = paramètres, pas copies

Un thème est un objet `ThemeSpec` ; les jetons sont générés (voir §3). Valeurs approchées des captures \[Probable\] ; les valeurs d'accent ont été ASSOMBRIES quand la référence ne passe pas AA avec du texte blanc (blanc sur #5A9E0E ≈ 3.3:1, sur #2B93EE ≈ 3.2:1, sur #FF4A1C ≈ 3.3:1).

| id | Mode natif | bg | surface | accent (fills + texte) | accent-vivid (graphiques seulement) | on-accent | fg / muted | Structure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `lime` | clair | #F3F3F1 | #FFFFFF | #3F7D0A | #5A9E0E | #FFFFFF | #141414 / #6B6B68 | hero `tinted` (#E4F7BE), tab bar sobre |
| `neon` | sombre | #0D0D0D | #1B1B1B (+ #262626) | #2DEB7B | #2DEB7B | #0B0B0B | #FFFFFF / #9A9A9A | hero `solid`, carte inversée blanche, tab bar pastille pleine |
| `violet` | sombre | #0C0B10 | #1B1A20 | #7C4DFF (réf. ≈ #8A5CFF) | #8A5CFF | #FFFFFF | #FFFFFF / #9C9AA6 | idem `neon` |
| `mint` | clair verre | dégradé 135° #C9D28B → #A9D6C6 → #7FB5A5 | blanc #FFFFFF + verre rgba(255,255,255,.35) blur 24 | #4B2BEE | #4B2BEE + #7DE3F8 | #FFFFFF | #111111 / #5F6B66 | hero absent, panneaux verre, champs #F2F2F2 |
| `ocean` | clair | #F3F8FD (canvas #D9EBFB) | #FFFFFF | #1A6FCC | #2B93EE | #FFFFFF | #0B1B3A / #6B7A90 | hero `dark-orb` (#060B18, orbe #1E6BFF → #7DD3FC), FAB carré |
| `noir` | sombre | #141414 | rgba(255,255,255,.06) + bordure rgba(255,255,255,.12) + blur 20 | #D83A0E (réf. ≈ #FF4A1C) | #FF4A1C | #FFFFFF | #F5F5F5 / #A0A0A0 | verre sombre, accent rare, tab bar texte+icône |

```ts
type ThemeSpec = {
  id: string; label: string;
  accent: string; accentVivid?: string;
  neutralHue: number;            // teinte des gris (OKLCH), chroma 0.005–0.02
  defaultMode: 'light' | 'dark';
  surfaceStyle: 'flat' | 'glass';
  hero: 'tinted' | 'solid' | 'dark-orb' | 'none';
  tabBar: 'pill-active' | 'soft-active' | 'text-active';
  fab: 'circle' | 'rounded-square';
  radiusScale: 0.9 | 1 | 1.1;
  fontDisplay?: string; fontBody?: string;
};
```

**Mode clair / sombre pour chaque thème** : les captures n'en montrent qu'un. L'autre est DÉRIVÉ par la fonction de génération : neutres teintés à la teinte du thème en OKLCH ; sombre = bg L≈8 %, surface L≈12 %, surface-2 L≈17 %, bordure blanc 6 % ; clair = bg L≈96 %, surface 100 %, surface-2 L≈95 %. L'accent est ré-ajusté pour garder AA dans chaque mode. \[Probable : à valider visuellement sur les 12 combinaisons\]

**Accent personnalisé (organisation)** : un thème spécial `custom` prend un seul hex (couleur de l'organisation / annexe) et génère toute la palette. `on-accent` = noir ou blanc selon le meilleur contraste calculé. Si aucun des deux n'atteint 4.5:1, l'accent est automatiquement assombri/éclairci en OKLCH jusqu'à AA.

## 3. Architecture des jetons (3 couches)

1. **Primitives** (générées, jamais utilisées directement) : échelles `accent-50…900`, `neutral-0…950` en OKLCH.
2. **Sémantiques** (seules utilisables dans les composants) :
   - Surfaces : `--lu-bg`, `--lu-surface`, `--lu-surface-2`, `--lu-surface-inverse`, `--lu-hero-bg`, `--lu-hero-fg`, `--lu-scrim`
   - Texte : `--lu-fg`, `--lu-fg-muted`, `--lu-fg-subtle`, `--lu-fg-inverse`, `--lu-on-accent`
   - Marque : `--lu-accent`, `--lu-accent-pressed`, `--lu-accent-soft` (accent à 12–16 % sur surface), `--lu-accent-vivid`
   - Finance : `--lu-income`, `--lu-expense`, `--lu-warning`, `--lu-info` + variantes `-soft`
   - Lignes : `--lu-border`, `--lu-border-strong`, `--lu-focus-ring`
   - Graphiques : `--lu-chart-1…6`, `--lu-chart-grid`, `--lu-chart-muted-bar`
   - Forme : `--lu-radius-xs 8 / sm 12 / md 16 / lg 20 / xl 28 / 2xl 32 / pill 999` (multipliés par `radiusScale`)
   - Élévation : `--lu-shadow-sm/md/lg` (clair : `0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)` ; sombre : aucune ombre)
   - Verre : `--lu-glass-bg`, `--lu-glass-border`, `--lu-glass-blur` ; drapeau `data-effects`
   - Typo : `--lu-font-display`, `--lu-font-body`, échelle §4
   - Mouvement : `--lu-dur-fast 150ms / base 250ms / slow 400ms`, `--lu-ease cubic-bezier(.2,.8,.2,1)`
3. **Composants** (ex. `--lu-button-height`) : uniquement si une variante en a besoin.

**Pont Ionic** (`ionic-bridge.css`, UN seul fichier) : `--ion-color-primary` ← `--lu-accent` (+ `-rgb`, `-contrast`, `-shade`, `-tint`), `--ion-background-color` ← `--lu-bg`, `--ion-text-color` ← `--lu-fg`, `--ion-card-background` / `--ion-item-background` ← `--lu-surface`, `--ion-toolbar-background` ← `--lu-bg`, `--ion-border-color` ← `--lu-border`. Couleurs custom Ionic : `income`, `expense`, `accent2`.

**Sélecteurs** : `html[data-theme='neon'][data-mode='dark']`. Les variables sont posées sur `:root` (html), JAMAIS sur un wrapper : les overlays Ionic (modal, popover, alert, action-sheet, select) sont rendus hors de l'arbre de page et perdraient les variables.

## 4. Moteur de thème (runtime)

- `ThemeProvider` + hook `useTheme()` → `{ themeId, mode: 'light'|'dark'|'system', effects: 'full'|'lite', setTheme, setMode, setEffects, setCustomAccent }`.
- Persistance : `@capacitor/preferences` + miroir `localStorage` ; script inline dans `index.html` qui applique `data-theme`/`data-mode` AVANT le premier rendu (aucun flash) ; le splash n'est masqué qu'après application.
- `mode: 'system'` suit `prefers-color-scheme` ; écouteur de changement.
- Bascule à la volée : `document.startViewTransition?.(() => apply())` ; repli = classe `theme-transition` (transition `background-color, color, border-color` 250 ms) retirée après 300 ms. Respecter `prefers-reduced-motion`.
- **Capacitor** : à chaque changement, synchroniser `StatusBar.setStyle` + `setBackgroundColor` (Android) et la couleur de la barre de navigation système avec `--lu-bg`.
- **Effets** : `data-effects='lite'` remplace tout verre par `--lu-surface-2` opaque, supprime flou, orbe animée et dégradés lourds. Mode `lite` activé par défaut si `navigator.deviceMemory <= 2` ou `hardwareConcurrency <= 4`, avec interrupteur utilisateur. (`backdrop-filter` est coûteux sur WebView Android d'entrée de gamme.) \[À vérifier sur appareil réel\]
- Polices **auto-hébergées** (`@fontsource-variable`, sous-ensemble latin) : app offline-first, aucun CDN. Défaut : Manrope (corps + display). Alternatives par thème : DM Sans (`lime`), Inter Tight (`noir`). Les polices exactes des captures sont inconnues \[Incertain\] ; toutes ces familles sont sous licence OFL.
- `setupIonicReact({ mode: 'md' })` pour une apparence identique iOS/Android \[Probable : conforme aux captures, qui sont indépendantes de la plateforme\].

## 5. Fondations

**Typographie** (chiffres tabulaires `font-variant-numeric: tabular-nums` sur tout montant) :

| Rôle | Taille / interligne | Graisse |
| --- | --- | --- |
| display (solde héros) | 44 / 48, tracking −0.02em | 700 |
| amount-lg (montant de détail) | 36 / 40 | 700 |
| h1 (titre d'écran) | 28 / 34 | 700 |
| h2 (section) | 20 / 26 | 700 |
| title (titre de carte / ligne) | 15–16 / 22 | 600 |
| body | 14 / 20 | 400–500 |
| caption | 12 / 16 | 400–500, muted |
| micro (labels tab bar, axes) | 10–11 / 14 | 500 |

**Espacement** : grille 4 px ; marges d'écran 16 (20 ≥ 600 px) ; padding de carte 16–20 ; écart entre cartes 12 ; écart entre sections 24.

**Formes** : boutons / chips / segmented / badges = pill ; champs 14 ; lignes de liste 16 ; cartes 20–24 ; hero (coins bas) 32 ; bottom sheet (coins haut) 28.

**Icônes** : un seul jeu outline (Ionicons ou Lucide), trait 1.75, 20 px par défaut, 24 en tab bar. Jamais d'icône pleine sauf état actif. Illustrations d'états vides en SVG dont tous les traits utilisent `var(--lu-*)` (elles suivent le thème).

**Montants** (`LuAmount`) : `Intl.NumberFormat` selon la devise ; décimales seulement si la devise en a (XOF/FCFA n'a pas de subdivision) ; partie entière `--lu-fg`, décimales `--lu-fg-subtle` ; vrai signe « − » (U+2212) ; espace fine insécable pour les milliers.

**États interactifs** : pressed = `scale(.98)` + `--lu-accent-pressed` ; focus clavier = anneau 2px `--lu-focus-ring` décalé de 2px ; disabled = opacité .4 sans ombre ; loading = spinner à la place de l'icône, largeur stable ; zone tactile ≥ 44×44.

## 6. Catalogue des composants

Tous dans `src/design-system/` (adapter à l'arborescence canonique existante après l'audit de la phase 0). Préfixe `Lu`.

### Navigation et en-têtes

- **LuAppBar** : hauteur 56 + safe-area ; 3 slots (retour | titre centré 16/600 | actions). Variantes `tinted` (fond = teinte du hero, sans bordure, fusionne avec le contenu), `transparent`, `solid`. Variante *grand titre* : 28/700 avec chevron de menu déroulant, métadonnée à droite (« 3 Total »).
- **LuHero** : `tinted` (zone haute en `--lu-accent-soft`, contenu blanc qui remonte avec coins hauts 28) ; `solid` (aplat `--lu-accent`, coins bas 32, textes `--lu-on-accent` ; avatar 40 + salutation à gauche, bouton cloche circulaire contour à droite ; label 14 ; montant display ; badge delta pill translucide ; bloc imbriqué rayon 24 en overlay noir 10 %) ; `dark-orb` (carte #060B18 rayon 24 padding 20 ; phrase-clé 18/600 avec la valeur en accent-vivid ; orbe radiale 96 px à droite avec halo flou 24 ; chip verre « Insight » ; bouton blanc pill « Voir détails ↗ »).
- **LuTabBar** : flottante, marges latérales 12 + safe-area bas, hauteur 64, rayon 32, surface + `--lu-shadow-lg`. 4–5 onglets. Inactif : icône outline `--lu-fg-muted`. Actif selon thème : `pill-active` = pastille pleine accent 64×44 rayon 22, icône seule `--lu-on-accent` ; `soft-active` = pastille `--lu-accent-soft`, icône + label accent ; `text-active` = icône + label `--lu-fg`. Labels 10–11/500. Haptique léger. Implémentation : `ion-tab-bar` + `ion-tab-button.tab-selected`.
- **LuSegmented** : conteneur `--lu-surface-2` pill, hauteur 44, padding 4 ; indicateur = surface blanche (clair) ou surface-inverse / accent (sombre) avec `--lu-shadow-sm`, transition 200 ms. Variantes `plain`, `signed` (Sortie ▲ `--lu-expense` / Entrée ▼ `--lu-income`), `bar` (Résumé / Toutes les transactions). Base : `ion-segment` (`--indicator-color`, `::part(indicator-background)`).
- **LuChip** : hauteur 32, pill, icône 16 optionnelle. Non sélectionné : surface + bordure 1px. Sélectionné : fond accent + `--lu-on-accent`. Rangée à défilement horizontal avec snap. Usage : catégories, comptes/caisses, filtres.

### Cartes et listes

- **LuCard** variantes : `surface` (rayon 20–24, padding 16–20) ; `inverse` (blanche sur sombre / sombre sur clair, 1 par écran max) ; `accent` (aplat accent) ; `glass` (si thème verre et `effects=full`, sinon surface-2) ; `stat` (titre 14 muted + icône en haut, valeur énorme, légende) ; `tile` (action rapide : cercle d'icône 40 + label 12/500, grille 4 colonnes).
- **LuListRow / LuTransactionRow** : carte rayon 16, padding 12–16 ; icône 40–44 dans conteneur rayon 12–14 (`--lu-surface-2` ou `--lu-accent-soft`) ; titre 15/600 ; sous-titre 12 muted (« 9 transactions », « Annulé · 17 avril ») ; montant à droite 15/600 tabulaire signé + icône ▲/▼ ; variante chevron. Thèmes sombres : une carte par ligne, écart 8 ; thèmes clairs : lignes dans une carte groupe avec séparateurs 1px `--lu-border`.
- **LuBadge / LuDelta** : pill hauteur 24, padding 8, 12/600, icône ▲/▼ 10 ; variantes `soft` (income / expense / neutral / accent), `on-hero` (translucide), `new` (blanc sur carte accent).
- **LuProgress** : barre h 8 pill, piste `--lu-surface-2`, remplissage dégradé `--lu-accent-vivid → --lu-accent` ; dates aux extrémités, légende « x / y » en dessous ; Budget = titre 14 muted + montant + « (33 %) restant sur ... ».
- **LuBanner** : fond `--lu-accent-soft` ou overlay sombre ; texte 13/500 ; bouton fermer ✕ ; variante *ligne d'action* pleine largeur (cercle d'icône + titre + sous-titre + chevron).
- **LuInsightCard** : variante `dark-orb` du hero. Les phrases sont produites par des règles déterministes sur le grand livre (ex. variation d'un poste de dépense vs mois précédent), pas par un LLM : zéro coût et traçable.
- **LuSectionHeader** : titre 15–18/700 + lien d'action accent à droite.
- **LuEmptyState** : illustration 160 px tokenisée, titre 16/600, texte muted, CTA.

### Boutons

- **LuButton** : `primary` (accent plein, `--lu-on-accent`, hauteur 52, pill, 16/600, icône flèche 20 optionnelle à droite) ; `outline` (transparent, bordure 1.5px accent, texte accent, ex. « Passer ✕ ») ; `tonal` (`--lu-accent-soft`) ; `dark` (fond `--lu-fg-inverse`, ex. « Déposer » sur hero accent) ; `ghost` ; `danger`. Tailles lg 52 / md 44 / sm 32. Option `shape='rounded'` (rayon 12, pleine largeur, hauteur 48) pour les formulaires du thème `ocean`.
- **LuIconButton** : cercle 40, bordure 1px ou fond surface-2.
- **LuFab** : 56, cercle ou carré rayon 16 selon `ThemeSpec.fab`, accent, icône plus, `--lu-shadow-lg`, positionné au-dessus de la tab bar (+16).
- **LuSwipeToConfirm** : piste pill hauteur 56 (surface-inverse), pouce circulaire 48 (accent ou noir) avec chevron, libellé centré, double chevron à droite. Valide à 85 % de course (`createGesture` d'Ionic), retour élastique sinon, haptique à la validation. Alternative accessible obligatoire : double-tap / Entrée sur le pouce. **Usage Lumina : actions irréversibles ou engageantes** (clôturer une période, valider un rapport, envoyer à l'organisation mère, supprimer).

### Formulaires

- **LuField** : fond `--lu-surface-2`, rayon 14, hauteur 56, **label au-dessus de la valeur à l'intérieur du champ** (12 muted, `labelPlacement='stacked'` d'Ionic, `fill='solid'`) : c'est exactement le motif des captures (réf. 4) et il supprime le défaut des labels superposés. Sans bordure au repos en clair, bordure 1px en sombre. États : focus (bordure accent + anneau), erreur (bordure `--lu-expense` + message avec icône sous le champ), disabled, readonly. Slot trailing (icône calendrier, « T »). Aide / erreur toujours sous le champ, jamais en superposition.
- **LuAmountInput** : montant 40/700, devise en préfixe muted, décimales atténuées ; ligne « Catégorie » = LuField avec chevron.
- **LuSelect** : 3 modes. ≤ 5 options → **LuOptionList** (liste verticale : conteneur `--lu-surface-2` rayon 20 padding 6 ; item hauteur 44 rayon 16, texte 15 muted ; sélectionné = surface blanche + `--lu-shadow-sm` + 600). 6–20 options → champ gris à chevron + `interface='popover'`. Plus long ou mobile → `interface='modal'` (bottom sheet avec recherche).
- **LuDateField / LuCalendar** : `ion-datetime` (`presentation='date'`) habillé : fond transparent, jour sélectionné = disque accent 36 px texte `--lu-on-accent`, jour courant = texte accent, jours passés `--lu-fg-subtle`. Pastilles d'événements (4 px sous le chiffre) : si `highlightedDates` ne le permet pas nativement, construire `LuCalendarStrip` custom. \[À vérifier\]
- **LuSheet** (saisie de transaction) : `ion-modal` avec `breakpoints=[0, .6, .92]`, `initialBreakpoint=.6`, poignée 36×4, rayon haut 28. Contenu : segmented Sortie / Entrée / Transfert → montant → ligne catégorie → date + heure (chips) → chips Statut (Défaut / À venir / Récurrent) → chips Compte → champs Titre / Notes → bouton principal pleine largeur. Gérer le clavier : `Keyboard.resize` + `scrollAssist` ; le bouton reste visible.

### Données et graphiques (Recharts existant)

Toutes les couleurs via `var(--lu-chart-n)` ; légende = pastille 8 + libellé + montant ; tooltip = pill sombre (`--lu-surface-inverse`) avec valeur.

- **Donut segmenté** (réf. 1) : épaisseur 28 % du rayon, écart 2°, `cornerRadius` arrondi, valeur centrale 24/700 + légende.
- **Semi-donut** (réf. 4) : 180°, bouts ronds, 2–4 segments.
- **Barres** : rayon 8–12, barres inactives `--lu-chart-muted-bar`, barre active colorée ; axe Y à droite, 11 muted, grille pointillée.
- **Courbe / aire** : trait 2, lissage monotone, aire en dégradé accent → transparent, ligne de référence pointillée, point actif 8 px avec bande verticale surlignée + tooltip.
- **Mini-barres d'activité** (carte `stat`) : 7 barres pill blanches, la barre active en accent.
- **LuTimeline** : ligne 2px entre nœuds ; nœuds 14 px ; passé = plein accent ; futur = pointillé gris. Labels 11 muted sur 2 lignes. Usage : cycle de vie d'une transaction (brouillon → validée → clôturée), périodes comptables.
- Palette graphique : 6 couleurs par thème, distinguables entre elles ; pour les séries critiques, ajouter motif ou libellé direct (pas de couleur seule).

## 7. Patrons d'écran

1. **Dashboard** : LuHero (solde de la caisse + delta) → LuBanner d'onboarding (fermable) → grille de tuiles d'actions rapides → cartes `stat` en 2 colonnes → LuInsightCard → LuSectionHeader « Derniers mouvements » + liste de LuTransactionRow → LuTabBar.
2. **Détail** (transaction, caisse, événement) : AppBar `tinted` avec retour et action ; icône 56 en cercle, chip de statut, titre 24/700, montant amount-lg centré ; LuTimeline ; liste liée.
3. **Historique** : chips de filtres + segmented ; groupes par mois avec LuSectionHeader ; swipe ligne = actions.
4. **Statistiques** : deux LuSelect côte à côte (Ventilation / Période) → carte graphique → légende → liste mensuelle.
5. **Saisie** : LuSheet (voir §6).
6. Listes d'administration (permissions, rôles) : jamais au-dessus du contenu ; dans une carte repliable ou un écran dédié.

## 8. Qualité (zéro budget, tout automatisable)

- **Test de contraste** (Vitest) : pour chaque thème × mode (12 + custom), vérifier toutes les paires `fg/bg`, `fg-muted/surface`, `on-accent/accent`, `income/surface`, `expense/surface` ≥ AA. Échec = CI rouge.
- **Lint** : règles de la section 0.
- **Design Lab** : route `/dev/design-lab` (hors production) qui affiche TOUS les composants dans TOUS leurs états, avec sélecteur de thème/mode en barre fixe. C'est la page de recette et la base des tests.
- **Cypress + cypress-axe** sur le Design Lab et sur les écrans clés, en clair et en sombre, avec les 6 thèmes.
- **Tests ciblés sur les bugs connus** : selects lisibles en clair/sombre (popover, modal), labels de champs jamais superposés, carte « Derniers mouvements » lisible, pas d'identifiant technique affiché à l'utilisateur.

## 9. Plan par phases (chaque phase = gate de validation humaine)

- **P0 — Audit (aucun code)** : inventorier toutes les couleurs, rayons, tailles codés en dur, les composants dupliqués, l'arborescence existante ; produire un rapport Markdown et la table de correspondance « ancien → composant Lu\* ». Gate : validation du rapport.
- **P1 — Jetons + moteur de thème** : générateur OKLCH, 6 thèmes + `custom`, pont Ionic, ThemeProvider, persistance, StatusBar, mode `lite`, test de contraste vert. Gate : Design Lab affiche les jetons dans les 12 combinaisons.
- **P2 — Primitives** : LuButton, LuIconButton, LuChip, LuBadge, LuSegmented, LuField, LuSelect/OptionList, LuCard, LuAmount, LuSectionHeader, LuEmptyState.
- **P3 — Composites** : AppBar, Hero (3 variantes), TabBar, ListRow, Progress, Banner, Sheet, DateField/Calendar, SwipeToConfirm, graphiques, Timeline.
- **P4 — Migration des écrans** par ordre de gravité : écrans à bugs visuels connus d'abord (formulaires, selects, Derniers mouvements), puis dashboard, historique, rapports, réglages. Un écran = une PR = Cypress vert ; aucune modification de logique métier.
- **P5 — Durcissement** : audit des derniers styles en dur, test sur appareil Android réel (flou, performances, clavier), documentation du DS dans le dépôt.

## 10. Critères d'acceptation

1. Zéro littéral de couleur / rayon / ombre en dehors de `tokens/` (lint vert).
2. Changement de thème et de mode instantané, sans rechargement ni perte d'état, y compris barre d'état Android.
3. Les 12 combinaisons passent le test de contraste AA.
4. Aucune page n'importe `ion-*` pour l'apparence.
5. Revenu / dépense lisibles sans la couleur (signe + icône).
6. Mode `lite` fluide sur un appareil Android d'entrée de gamme.
7. Un nouveau thème s'ajoute en moins de 20 lignes (un `ThemeSpec`).

## 11. Pièges Ionic connus

- Variables posées ailleurs que sur `:root` : les overlays n'en héritent pas (cause probable des selects illisibles).
- `ion-popover`, `ion-alert`, `ion-action-sheet`, `ion-select` ont leurs propres `--background` / `--color` à surcharger via le pont.
- `ion-item` impose ses styles de label : préférer `LuField` avec `labelPlacement='stacked'`.
- `backdrop-filter` sur éléments animés ou en défilement = saccades ; limiter à 2 surfaces verre visibles.
- Les polices servies par CDN cassent l'usage hors ligne.
- Le clavier Android peut masquer le bouton principal d'une feuille : tester `Keyboard.resize` en mode `native`/`ionic`.
