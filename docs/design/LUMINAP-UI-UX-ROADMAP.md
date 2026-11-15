# Luminap — feuille de route UI/UX

**Établie le** : 4 novembre 2026 · **Révisée le** : 15 novembre 2026 (base `main` @ `66a4edc`)
**Base d'origine** : `main` @ `2293f14` (PR #417 fusionnée) — voir §12 pour ce qui a changé
**Branche de travail** : `arena/f3a29a97-luminap` · **Nature** : plan, aucun code écrit
**Objectif** : rendre Luminap cohérent, lisible et qualitatif — plus que `lumina-b`,
qui sert de **point de départ**, pas de modèle.

---

## 0. Comment lire ce document

Trois niveaux, jamais mélangés :

- **[Constat]** — mesuré dans ce dépôt, avec la commande ou le chiffre à l'appui.
  N'importe qui peut le rejouer.
- **[Hypothèse]** — plausible, non prouvé ici. Chaque hypothèse porte la
  **mesure qui la validerait ou l'infirmerait** et le lot qui l'arbitre.
- **[Décision]** — tranché, avec sa raison.

Aucun chiffre de ce document n'est repris d'un audit antérieur : tous ont été
rejoués sur `2293f14`. Cette règle existe parce qu'un audit recopié devient une
légende — un chiffre faux se propage alors de document en document.

---

## 1. Documents de référence demandés : cinq sur six sont absents

**[Constat]** Vérifié par `find . -name "<fichier>"` hors `node_modules` :

| Document demandé | État |
|---|---|
| `docs/design/LUMINAP-DESIGN-AUDIT.md` | **absent** |
| `docs/design/mockups/luminap-future-ui.html` | **absent** |
| `docs/design/references/dribbble/README.md` | **absent** |
| `docs/design-system-spec.md` | **absent** |
| `docs/design-system-plan.md` | **absent** |
| `docs/design-system-audit.md` | **absent** |

Le seul contenu de `docs/design/` est
`2026-10-05-lumina-dashboard-premium-propositions.md`, et le seul maquette HTML
présente est `docs/dashboard-design.html` (841 lignes).

**[Constat]** Aucune branche, aucun tag, aucun fichier ne documente `lumina-b`
dans ce dépôt (`git branch -a | grep lumina-b` → vide). La référence est donc
externe à la matière première disponible ici.

**Conséquence assumée** : ce plan n'est **pas** construit sur ces documents. Il
est construit sur le code réel, les jetons réels et des mesures reproductibles.
C'est plus lent, mais cela évite de propager des contraintes que je ne peux pas
vérifier. Si ces documents existent ailleurs, ils devront être confrontés au
présent plan **avant le lot 1** (§9, question Q1).

**[Hypothèse] H-00** : les documents manquants décrivent une intention de design
(maquette « future UI », références Dribbble) qui n'a jamais été confrontée au
code. *Test qui la valide* : si, à réception, ils contiennent des tokens ou des
composants absents du dépôt, l'écart entre intention et implémentation sera la
vraie dette de cohérence — et le lot 1 devra la traiter en premier.

---

## 2. Où en est réellement le système de design

### 2.1 Ce qui est solide — et qu'il ne faut pas casser

**[Constat]** Le socle est meilleur que ce qu'un plan de refonte laisserait
supposer. `src/App.css` (423 lignes) définit des **jetons sémantiques nommés**
par rôle, pas par couleur :

- argent : `--in` / `--out` / `--warn`, définis **par mode**, et volontairement
  **indépendants de l'accent de marque** ;
- accent : `--accent-primary` / `-light` / `-dark`, poussés au runtime par
  `applyTheme()` (`src/ionic/themes.ts:179`), donc l'**accent configurable par
  organisation fonctionne déjà** ;
- profondeur : échelle `--z-nav` 40 < `--z-overlay` 50 < `--z-float` 60 <
  `--z-toast` 70 < `--z-skip` 100 — un vrai empilement nommé, pas des `z-index`
  ad hoc ;
- élévation : `--shadow-accent` / `--shadow-accent-sm` / `--shadow-fab` ;
- typographie : `--font-sans`, **Inter réellement embarquée** en woff2
  (`src/main.tsx:5-12`, sous-ensembles latin + latin-ext, graisses 400/500/600/700).

**[Constat]** Les contraintes natives sont traitées avec un soin rare :
`src/App.css:262-300` documente pourquoi `.pb-safe` et `.pb-safe-calc` sont
**deux** classes distinctes (page scrollable vs page à `BottomNav` fixe), et
pourquoi ajouter `env(safe-area-inset-bottom)` une seconde fois le doublerait.
48 pages sur 65 utilisent ces classes.

**Conséquence pour la feuille de route** : la cohérence n'est pas à *créer*, elle
est à **finir**. Un plan qui réécrirait les jetons détruirait un actif.

### 2.2 Le vrai problème : la promesse n'est pas tenue par le code

**[Constat]** `src/App.css:6` affirme : *« Aucune couleur en dur dans un
composant. »* Mesure :

```bash
grep -rho "style={{" src/pages/*.tsx | wc -l     # 1066
grep -rho "style={{" src/components/*.tsx | wc -l #  293
# total : 1359 styles en ligne
```

Et parmi eux, `grep -rho "color: \"var(--[a-z-]*)\"" src/pages/*.tsx` → **461**
couleurs passées par attribut `style` alors qu'un jeton suffirait.

Répartition (top, `grep -rc "style={{"`) : `EventDetail` 57, `GroupDetail` 56,
`Dashboard` 54, `OrgReportDetail` 47, `CentralAdmin` 36, `Reports` 35,
`Balance` 27.

**[Constat]** 9 fichiers de production contiennent encore des couleurs
littérales (`grep -rl "#[0-9a-fA-F]\{6\}"`) : `Health`, `InvitationEmit`,
`Sessions`, `SettingsAbout`, `Tutorial`, `GoogleButton`, `LogoSpinner`,
`LuminaLogo`, `TransactionCard`. Les cas légitimes existent (`InvitationEmit`
force `bgColor="#ffffff"` pour un QR code lisible par caméra) ; les autres sont
de la dette.

**[Décision]** Le style en ligne n'est pas interdit *par principe* : il est
interdit **quand il porte une décision de design** (couleur, espacement, rayon,
ombre). Il reste acceptable pour une valeur réellement calculée (position d'un
indicateur, largeur d'une barre de progression). Le lot 2 introduit cette
frontière dans le lint plutôt que dans une revue humaine faillible.

### 2.3 Contraste : quatre accents échouent AA, et le commentaire se trompe

C'est le constat le plus grave du document, et il est purement calculé.

**[Constat]** `src/App.css:36-39` :

> *« Tous les thèmes Lumina ont un accent foncé (YIQ > 128), donc texte blanc.
> Si un accent clair est un jour ajouté, repasser ce token en noir. »*

Le raisonnement est doublement erroné :

1. **YIQ > 128 signifie « fond clair », donc texte NOIR** — l'affirmation est
   inversée.
2. Le seuil YIQ n'est pas un critère de contraste WCAG.

Mesure sur les **10 accents primaires** de `src/ionic/themes.ts`
(`color: "#ffffff"` vs `#000000`, ratio WCAG 2.1) :

| Accent | Blanc | Noir | `--on-accent: #fff` |
|---|---|---|---|
| `#FF6B00` (défaut) | **2,86** | 7,36 | ❌ échec AA |
| `#10B981` | **2,54** | 8,28 | ❌ échec AA |
| `#D97706` | **3,19** | 6,59 | ❌ échec AA |
| `#0D9488` | **3,74** | 5,61 | ❌ échec AA |
| `#DB2777` | 4,60 | 4,57 | ✅ limite |
| `#DC2626` | 4,83 | 4,35 | ✅ |
| `#B45309` | 5,02 | 4,18 | ✅ |
| `#2563EB` | 5,17 | 4,06 | ✅ |
| `#7C3AED` | 5,70 | 3,69 | ✅ |
| `#4F46E5` | 6,29 | 3,34 | ✅ |

**4 accents sur 10 sont sous 4,5:1 avec le texte blanc**, dont l'accent **par
défaut**. Cela touche tout texte posé sur un fond d'accent : boutons pleins,
FAB, onglet actif, badges. Et `--on-accent` est **figé à `#ffffff`** en clair
comme en sombre (`App.css:39`), alors qu'il faudrait **noir** pour ces quatre-là.

**[Constat]** Le même défaut existe sur le texte secondaire :
`--text-tertiary` = `#8a8f96` (clair) et `#71717a` (sombre) donnent
**3,04:1** et **3,96:1** sur leur canvas respectif — sous AA (4,5:1) pour du
texte normal. Or `text-text-tertiary` est utilisé **522 fois**, dont **397** sur
du texte réel (souvent `text-xs`, 12 px).

**[Hypothèse] H-01** : `--on-accent` a été figé alors que les accents étaient
plus foncés, et la liste d'accents a évolué sans que le token suive.
*Test* : `git log -p src/App.css -- --on-accent` et l'historique du catalogue
d'accents — rejouable par quiconque a le dépôt.

**[Décision]** Le lot 1 corrige les **jetons**, pas les écrans : un accent qui
décide lui-même de son `--on-accent` (contraste calculé au runtime) corrige
d'un coup les 4 thèmes fautifs, sans toucher 522 sites d'appel.

### 2.4 Montants FCFA : le formatage est bon, la typographie ne suit pas

**Bonne nouvelle [Constat]** : le formatage des montants est **centralisé et
sensible à la préférence utilisateur** (`src/lib/moneyFormat.ts`, avec
`formatAmount` / `formatMoney`, et un choix de format en réglages). Ce n'est pas
la dette que j'attendais ; il ne faut pas la réécrire.

**La dette est typographique** :

- **[Constat]** 24 pages affichent des montants ; **10 seulement** utilisent
  `tabular-nums`. Les 14 autres font danser les chiffres quand la valeur change
  ou quand une liste défile. C'est l'erreur classique en UI financière, et elle
  est invisible sur une capture d'écran statique — donc jamais corrigée.
- **[Constat]** `TransactionCard.tsx:117` affiche le montant avec
  `font-bold text-sm whitespace-nowrap` — **sans `tabular-nums`**. C'est le
  composant le plus vu de l'application (chaque ligne de chaque liste).
- **[Constat]** `font-black` (graisse 900) est utilisé sur les montants
  (`Balance.tsx:185,204,221`, `Dashboard.tsx:221`), alors que **seules 400 à
  700 sont embarquées** (`src/main.tsx`). Le navigateur produit donc une graisse
  **synthétique**, dont le rendu varie selon le moteur — sur les chiffres, là où
  la lisibilité compte le plus.
- **[Constat]** Un montant FCFA long est réaliste : `999 999 999 FCFA` fait
  **16 caractères**, `12 345 678 FCFA` en fait 15. Dans une rangée
  libellé + montant sur 320 px de contenu utile, cela ne tient pas sans
  décision explicite (repli, réduction, ou troncature avec affordance).

**[Hypothèse] H-02** : aucune vue financière n'a été testée avec un montant à
9 chiffres. *Test* : le lot 3 installe une fixture
`MONTANT_EXTRÊME = 999_999_999_00` centimes et vérifie l'absence de débordement
et de troncature silencieuse, en clair et en sombre, à 320 px.

### 2.5 États d'écran : 31 pages sur 65 n'en déclarent aucun

**[Constat]** `data-screen-state` est présent sur **34 pages sur 65**. Répartition
des valeurs : `ready` 34, `loading` 9, `notfound` 6, `error` 4, `forbidden` 1,
`empty` 1.

Les 31 pages sans état comprennent des écrans majeurs :
`Archives`, `Budgets`, `Events`, `Giving`, `Groups`, `Reports`, `Cotisations`,
`Federation`, `MembresEnAvance`, et **sept des huit écrans de réglages**
(`SettingsFeatures`, `SettingsGestion`, `SettingsNotifications`,
`SettingsPersonalisation`, `SettingsProfile`, `SettingsTheme`, `SettingsAbout`).

**Pourquoi cela bloque un travail sur l'esthétique** : sans état déclaré, on ne
peut pas garantir qu'un écran affiche un contenu *ou* un message, jamais une
zone vide. C'est la définition même du « pas esthétique » perçu par
l'utilisateur. Tant que ce contrat n'est pas complet, **toute refonte visuelle se
juge sur des écrans dont on ignore l'état**.

**[Constat]** La couverture a11y (`src/pages/__tests__/a11y-screens.test.tsx`)
couvre **9 routes** (`/`, `/auth`, `/dashboard`, `/finance`, `/forms`, `/help`,
`/members`, `/notifications`, `/splash`). Aucune route financière secondaire
(`/balance`, `/history`, `/budgets`, `/reports`), aucun réglage.

### 2.6 Incohérence de doctrine : deux réponses au même problème

**[Constat]** Il y a **deux réponses contradictoires** au sélecteur segmenté :

- `src/components/SegmentedTabs.tsx` — composant **maison**, justifié en
  commentaire par *« pas Ionic : piège React 19 sur les custom elements »*,
  utilisé par `src/pages/Events.tsx` ;
- `src/pages/Balance.tsx` — passé à **`IonSegment`** en A7 (PR #417), avec deux
  specs Cypress adaptées au shadow DOM.

Les deux sont dans le code au même instant, chacun avec une justification
écrite, et ils se contredisent. Ce n'est pas un détail : c'est le symptôme d'une
doctrine non écrite. `docs/ui-exceptions.md` existe et est de bonne qualité — il
n'est simplement **pas la source de vérité appliquée**.

**[Décision]** Le lot 2 tranche la doctrine (Ionic d'abord, exception tracée,
avec le critère du shadow DOM et celui du piège React 19), puis aligne les deux
cas. La décision A8 (`docs/a8-iontabs-decision.md`) fournit déjà le cadre pour
`IonTabs`.

### 2.7 Cibles tactiles : présentes, non vérifiées

**[Constat]** On compte 45 `w-8 h-8` (32 px), 50 `w-6 h-6` (24 px), 11
`w-7 h-7` (28 px). Beaucoup sont des icônes décoratives dans des conteneurs
plus grands — mais **rien dans le dépôt ne distingue un bouton de 24 px d'une
icône de 24 px**. La recommandation de 44 px (WCAG 2.5.5 AAA) ou 48 px
(Matériel) n'est donc ni respectée ni mesurée.

**[Hypothèse] H-03** : une part réelle de ces 106 déclarations est un bouton
tactile sous-dimensionné, surtout dans les rangées denses (finances, archives,
listes d'organisation). *Test* : le lot 2 ajoute un test qui, sur les écrans
pilotes, calcule la taille effective de tout élément interactif et échoue sous
44 px — c'est mesurable sans appareil physique.

### 2.8 Hors-ligne : la stratégie est bonne, la lisibilité n'est pas testée

**[Constat]** `SyncStatusNotifier` (monté dans `App.tsx:495`) est **sans
rendu** : il émet un toast unique par épisode d'échec, avec filigrane persistant
pour ne pas re-notifier les vieux rejets, et se tait sur `/auth`, `/splash`,
`/welcome`. C'est une décision produit explicite (le bandeau permanent a été
supprimé). `IonRefresher` existe désormais sur `/finance` et `/members` (A7).

**[Constat]** Aucun test ne vérifie l'**état visuel** hors-ligne d'un écran :
couleur du bandeau, contraste du message, position par rapport à la
`safe-area`, comportement à la reconnexion.

---

## 3. Autres apports audités (à citer avant le premier lot)

Deux disciplines voisines, appliquées explicitement :

**A. Typographie financière** (discipline de l'édition financière et de la
table de chiffres) — méthode : comparer les chiffres à largeur variable, exiger
des chiffres tabulaires, vérifier l'alignement décimal et la graisse réelle.
Apport : §2.4 (tabular-nums sur 10/24 pages, graisse 900 synthétique).

**B. Métrologie d'accessibilité** (WCAG 2.1, calcul de ratio) — méthode :
calculer les contrastes sur les valeurs réelles plutôt que les estimer à l'œil,
et refuser un critère disqualifié (YIQ). Apport : §2.3, 4 accents fautifs et
`--text-tertiary` sous AA.

**C. Théorie des jetons de design system** (tokens sémantiques, séparation
primitive/sémantique/usage) — méthode : vérifier qu'un composant ne consomme
jamais une primitive, et que toute décision de design vit dans un jeton. Apport :
§2.2, 1 359 styles en ligne dont 461 décisions de couleur.

---

## 4. Inventaire des écrans (65 pages)

**[Constat]** 65 fichiers dans `src/pages/`, 39 152 lignes avec les composants.
Groupes par nature, pas par ordre alphabétique — le lot 3 se joue sur les
écrans financiers, le lot 4 sur les listes, le lot 5 sur les réglages.

### 4.1 Finances — cœur du produit, priorité maximale

`Finance` (532 l.), `Balance` (450), `Dashboard` (1 215), `History`,
`Budgets`, `BudgetDetail`, `Giving`, `GivingCampaign`, `Cotisations`,
`GroupCotisation`, `Versement`, `Reports` (644), `ReportBuilder`,
`OrgReportsReceived` (25 styles en ligne), `OrgReportSend`,
`OrgReportDetail` (47 styles en ligne), `TransactionDetail`.

**Pourquoi en premier** : ce sont les écrans où un défaut typographique a un
coût (un montant mal lu est un montant contesté) et où les montants FCFA longs
apparaissent réellement. C'est aussi la zone la plus dense en styles en ligne.

### 4.2 Listes et annuaires

`Members`, `MembreDetail`, `MembresEnAvance`, `Groups`, `GroupDetail` (56 styles
en ligne), `Archives` (23), `Events`, `EventDetail` (57 — le plus dense),
`OrgUnits`, `OrgRoles`, `Federation`, `CentralAdmin`, `FormSubmissions`.

### 4.3 Réglages (8 écrans, 7 sans état déclaré)

`SettingsShell` (coquille), `SettingsProfile`, `SettingsTheme`,
`SettingsPersonalisation`, `SettingsFeatures`, `SettingsNotifications`,
`SettingsGestion`, `SettingsAbout`, `SettingsHealth` (`Health`).

### 4.4 Parcours d'entrée et états système

`Splash`, `Welcome`, `Auth`, `Onboarding`, `Tutorial`, `Help`,
`Notifications`, `Sessions`, `TransferOwnership`, `InvitationEmit` (31, styles
en ligne + hex QR), `InvitationManage`, `OrgReports*`, états `404` / `403`.

### 4.5 Composants partagés existants (48 fichiers) — à réutiliser, pas à réécrire

| Famille | Composants | État |
|---|---|---|
| Structure | `TopHeader`, `BottomNav`, `FeatureSidebar`, `HomeIndicator`, `SettingsShell`, `BottomDrawer` | mûrs |
| États | `EmptyState`, `RouteStates`, `PageSkeletons`, `Skeleton`, `Shimmer`, `LoadErrorBlock`, `CapabilityBanner` | mûrs, `Shimmer` gère `prefers-reduced-motion` |
| Donnée | `TransactionCard`, `TrendChart`, `FederationGraph`, `PeriodLockCard` | `TransactionCard` à corriger (§2.4) |
| Formulaire | `FormField`, `DatePicker`, `DocumentPicker`, `CameraScanner`, `Button`, `Badge`, `StatusBadge` | à auditer pour les cibles tactiles |
| Préférence | `ThemePicker`, `ThemeToggle`, `MoneyFormatPicker`, `SegmentedTabs` | `SegmentedTabs` en contradiction (§2.6) |

---

## 5. Les cinq lots

Chaque lot est indépendant, livrable, et **porte sa propre preuve**. Un lot qui
ne peut pas prouver son effet est reporté — c'est la leçon des allers-retours
d'A7.

### Lot 1 — Jetons : rendre la promesse vraie (fondations) — **FAIT**

> **Livré le 4 novembre 2026, branche `arena/f3a29a97-luminap`.**
> Voir §11 pour la preuve et les chiffres mesurés après coup.
> Ce qui suit reste la description de l'intention, utile pour comprendre le
> « pourquoi » des valeurs retenues.

**Ce qui change** : `--on-accent` devient **calculé** (contraste WCAG réel, pas
YIQ), posé par `applyTheme()` ; `--text-tertiary` remonte à ≥ 4,5:1 dans les deux
modes ; `--font-black` soit devient une graisse réellement embarquée (800), soit
disparaît des montants.

**Valeurs proposées, mesurées** :

| Jeton | Actuel | Proposé | Ratio obtenu |
|---|---|---|---|
| `--text-tertiary` (clair) | `#8a8f96` → 3,04 | `#6b7280` | **4,52** canvas / 4,83 surface |
| `--text-tertiary` (sombre) | `#71717a` → 3,96 | `#8b8b93` | **5,67** canvas / 5,14 surface |
| `--on-accent` | `#ffffff` figé | calculé par accent | ≥ 4,5 garanti |

**Fichiers touchés** : `src/App.css` (jetons seuls), `src/ionic/themes.ts`
(`applyTheme`), tests de jetons.

**Pourquoi d'abord** : corriger un jeton répare 522 usages et 4 thèmes d'un
coup. Corriger les écrans d'abord obligerait à repasser deux fois.

**Preuve** : test qui énumère les 10 accents et **échoue** si un
`--on-accent` calculé descend sous 4,5:1 ; test de contraste de
`--text-tertiary` sur les deux fonds, dans les deux modes.

**Risque** : `--text-tertiary` plus foncé réduit la hiérarchie visuelle perçue.
*Atténuation* : mesurer l'écart avec `--text-secondary` (7,22 clair) pour
conserver une hiérarchie lisible ; arbitrer sur capture avant/après, pas à l'œil.

### Lot 2 — Doctrine et garde-fous (empêcher la régression)

**Ce qui change** : une règle de lint interdit une **couleur littérale** dans un
attribut `style` d'un composant ; `docs/ui-exceptions.md` devient la source de
vérité référencée par les commentaires ; `SegmentedTabs` et `IonSegment` sont
tranchés ; un test mesure les cibles tactiles ≥ 44 px sur écrans pilotes.

**Fichiers** : `.eslintrc`/`eslint.config`, `docs/ui-exceptions.md`,
`SegmentedTabs.tsx` ou `Events.tsx`, nouveau test `touch-targets.test.tsx`,
suppression des 9 fichiers avec hex injustifiés (hors QR assumé).

**Preuve** : le lint **échoue** sur un `style={{ color: "#ff0000" }}` introduit
volontairement dans un test de non-vacuité ; le test tactile **échoue** sur un
bouton de 32 px ajouté exprès.

**Risque** : une règle de lint trop large bloque du travail légitime (QR,
dégradé calculé). *Atténuation* : la règle cible `color`/`background` littéral
seulement, avec une liste d'exceptions nommées.

### Lot 3 — Écrans financiers : les montants d'abord

**Ce qui change** : `tabular-nums` systématique sur tout montant (24 pages) ;
`TransactionCard` corrigé ; décision typographique pour le montant long
(16 caractères) ; hiérarchie libellé/montant/signe revue ; `--in`/`--out`
vérifiés en contraste sur `--surface` et `--card`.

**Fichiers** : 16 pages financières, `TransactionCard.tsx`, `moneyFormat.ts`
(lecture seule — **ne pas réécrire le formatage**, il est bon).

**Preuve** : `MONTANT_EXTRÊME = 999_999_999_00` en fixture ; tests à 320 px,
clair et sombre, vérifiant absence de débordement, absence de troncature
silencieuse, et `font-variant-numeric: tabular-nums` effectif.

**Risque** : `tabular-nums` change la largeur des montants et peut décaler des
rangées existantes. *Atténuation* : le test compare la largeur avant/après et
alerte au-delà de 4 px.

### Lot 4 — Listes et états : aucun écran muet

**Ce qui change** : les 31 pages sans `data-screen-state` en reçoivent un ;
`loading` / `error` / `empty` deviennent systématiques sur les listes ;
`EmptyState` et `RouteStates` sont réutilisés au lieu d'être réinventés ;
`a11y-screens.test.tsx` étendu de 9 à ~20 routes, en priorisant les réglages et
les finances secondaires.

**Preuve** : test qui **énumère les 65 pages** et échoue si l'une n'expose aucun
état valide — l'analogue visuel de la garde d'inventaire RLS. La non-vacuité se
démontre en retirant un `data-screen-state` d'une page.

**Risque** : ajouter un état `loading` à un écran qui affiche des zéros change
le comportement perçu (le patron R52.q l'a déjà montré : afficher 0 FCFA avant
la première lecture est un mensonge). *Atténuation* : le lot ne fait qu'exposer
un état **réel**, jamais fabriquer un état artificiel.

### Lot 5 — Finitions et cohérence perçue

**Ce qui change** : styles en ligne ramenés aux jetons sur les écrans pilotes
(`EventDetail` 57 → cible < 15) ; états hors-ligne/reconnexion lisibles et
positionnés correctement vs safe areas ; revue de la hiérarchie typographique
(`text-xs` 517 occurrences, à réévaluer) ; cohérence des rayons, ombres, espacements.

**Preuve** : compteur de styles en ligne en garde (il ne peut que baisser) ;
test de l'état hors-ligne (bannière visible, contraste ≥ 4,5, pas de
chevauchement avec la `BottomNav`).

---

## 6. Critères de validation transverses

Chaque lot est validé sur **ces neuf axes**, sinon il n'est pas terminé. Ils
sont formulés comme des tests reproductibles, pas comme des intentions.

| Axe | Critère mesurable |
|---|---|
| **Petits écrans** | 320 px de large (et 360 px) : aucun débordement horizontal (`scrollWidth ≤ innerWidth`), aucun montant tronqué sans affordance |
| **Clair / sombre** | Contraste ≥ 4,5:1 pour tout texte, ≥ 3:1 pour les éléments d'interface, dans **les deux modes** |
| **Thèmes (10 accents)** | `--on-accent` calculé garantit ≥ 4,5:1 sur **chacun** des 10 accents |
| **Montants FCFA longs** | Fixture `999 999 999 FCFA` (16 car.) : pas de débordement, pas de troncature silencieuse, chiffres tabulaires |
| **Clavier** | Parcours complet au clavier, focus visible (≥ 3:1 contre le fond adjacent), pas de piège de focus dans les overlays |
| **Safe areas** | Aucun contenu interactif sous l'encoche ni sous la barre de gestes ; `.pb-safe` vs `.pb-safe-calc` respectés |
| **Hors-ligne** | État lisible, contraste ≥ 4,5:1, positionné au-dessus de `--nav-height` (56 px), aucune donnée affichée comme « à jour » quand elle ne l'est pas |
| **Reconnexion** | Retour à un état normal sans doublon de toast, sans `loading` infini, données rafraîchies |
| **Mouvement réduit** | `prefers-reduced-motion` respecté (déjà vrai pour `Shimmer` — à étendre aux transitions de pages) |

**Non couvert ici, et pourquoi** : le rendu réel sur appareil (Android 12–15) et
les couleurs d'écran physiques. Aucun appareil ni émulateur dans cet
environnement. Ces critères sont **nécessaires mais pas suffisants** sans une
passe manuelle sur appareil.

---

## 7. Risques

| Risque | Gravité | Atténuation |
|---|---|---|
| Régression visuelle non détectée (pas de tests de capture) | **haute** | Le lot 2 doit évaluer un harnais de capture (Playwright/Cypress screenshots) **avant** le lot 3 ; sinon chaque lot livre des tests de mesure, pas de rendu |
| `--text-tertiary` plus foncé aplatit la hiérarchie | moyenne | Comparaison avant/après sur les 6 écrans pilotes, arbitrage humain |
| `tabular-nums` décale les rangées existantes | moyenne | Test de largeur, seuil 4 px |
| Le lint de couleurs bloque du code légitime | moyenne | Portée étroite (`color`/`background` littéral), exceptions nommées |
| Toucher aux jetons casse un thème d'organisation | **haute** | Les 10 accents sont testés un par un, pas seulement le défaut |
| Les documents de référence arrivent après le lot 1 et contredisent les jetons | moyenne | Q1 §9 : les confronter **avant** d'écrire une ligne |
| Le périmètre 65 pages dépasse la capacité | **haute** | Les lots 1–2 ne touchent que 3 fichiers ; les lots 3–5 sont bornés à des écrans pilotes nommés |

---

## 8. Ce qui manque pour aller plus loin

**[Constat]** Absences qui limitent la portée de ce plan :

1. **Aucun outil de capture visuelle** installé (ni Playwright ni navigateur) :
   la vérification de mon environnement montre que Cypress n'a pas de binaire
   (`Cypress binary version: not installed`) et que rien ne peut le télécharger.
   Toute validation visuelle est donc **mesurée**, pas **regardée**.
2. **Aucun appareil ni émulateur Android** : les critères safe areas, clavier et
   couleurs réelles ne peuvent pas être validés ici.
3. **Les cinq documents de référence** (§1) et **la référence `lumina-b`** :
   sans eux, je ne peux pas dire en quoi Luminap serait « plus » que `lumina-b` ;
   je peux seulement dire en quoi elle est **incohérente avec elle-même**.
4. **Aucune donnée d'usage** (analytics, parcours réels) : les priorités sont
   déduites de la structure du code et du coût d'un défaut, pas de la fréquence
   réelle d'usage des écrans.

---

## 9. Questions produit à trancher avant le premier lot

Ces cinq questions bloquent le lot 1. Elles ne sont pas techniques : elles
changent ce qu'on construit.

**Q1 — Les documents de référence existent-ils ailleurs ?**
`LUMINAP-DESIGN-AUDIT.md`, `luminap-future-ui.html`, le README Dribbble et les
trois `design-system-*.md` sont absents du dépôt. Faut-il les fournir, ou
considérer que le code est la seule source de vérité ?
*Si absents : le présent plan remplace l'audit design, et il faudra le dire.*

**Q2 — Que signifie « plus qualitatif que `lumina-b` », concrètement ?**
`lumina-b` n'est pas dans ce dépôt. Sans savoir ce que vous admirez ou rejetez
chez elle (densité ? sobriété ? hiérarchie ?), je risque d'améliorer Luminap
dans une direction que vous ne voulez pas. **Une capture d'écran de `lumina-b`
suffirait** à transformer le lot 5.

**Q3 — Le défaut `#FF6B00` à 2,86:1 est-il acceptable ?**
C'est l'accent **par défaut**, donc l'expérience de la majorité. Trois options :
(a) garder l'orange et passer `--on-accent` en **noir** sur ce thème ;
(b) assombrir l'orange jusqu'à 4,5:1 avec du blanc ; (c) changer de défaut.
Chacune change l'identité visuelle — c'est votre décision, pas la mienne.

**Q4 — La hiérarchie typographique actuelle est-elle voulue ?**
517 `text-xs` (12 px) et 526 `text-sm` (14 px) contre 15 `text-base` : quasiment
toute l'application est en 12–14 px, sur mobile. Est-ce une contrainte assumée
(densité d'information) ou une dérive ? Cela décide si le lot 5 est une
finitions ou un rééquilibrage.

**Q5 — Quel est le budget de régression visuelle acceptable ?**
Sans harnais de capture, chaque lot est prouvé par des mesures, pas par des
images. Acceptez-vous cette limite, ou faut-il investir d'abord dans
l'infrastructure de capture (ce qui décale les lots d'un cran) ?

---

## 10. Vérification externe

Ce qui, hors de moi, prouverait que ce plan est juste :

| Preuve | Comment la reproduire |
|---|---|
| **Les chiffres de §2 sont rejouables** | Chaque constat cite sa commande (`grep -rc`, `wc -l`, calcul de ratio). Quiconque sur `2293f14` doit retrouver les mêmes valeurs. |
| **Les contrastes sont calculés, pas estimés** | Le script de calcul (WCAG 2.1, formule de luminance relative) est reproductible ; un contrôle sur webaim.org/contrastchecker avec `#ffffff` sur `#FF6B00` doit donner ≈ 2,86:1. |
| **Le défaut `--on-accent` est un vrai défaut** | Un test de bout en bout : passer le thème sur « Orange Fire », lire un bouton plein à l'écran, mesurer. C'est falsifiable par un tiers. |
| **Les écrans sans état sont dénombrables** | `comm -23 <(ls src/pages/*.tsx\|sort) <(grep -rl data-screen-state src/pages/*.tsx\|sort)` → 31 fichiers. |
| **Les lots sont bornés** | Chaque lot nomme ses fichiers ; un relecteur peut vérifier qu'aucun n'a débordé. |
| **Le plan ne modifie pas la production** | `git diff --stat` doit ne montrer que ce fichier. |

**Limites restantes, explicitement** : ce plan ne prouve rien sur le **rendu
perçu** (aucune capture possible ici), sur l'**appareil réel**, ni sur la
**supériorité face à `lumina-b`** (référence absente). Il prouve que Luminap est
incohérente avec elle-même sur des points précis et chiffrés — c'est un
fondement solide pour commencer, pas une conclusion.

---

## 11. Lot 1 réalisé — preuve

**Ce qui est en place**, sur la branche, sans changer une seule vue :

| Élément | Détail |
|---|---|
| `src/lib/colorContrast.ts` | **nouveau** — luminance relative WCAG 2.1, `contrastRatio`, `inkOn`, `hasAccessibleInk`. Aucune heuristique. |
| `src/ionic/themes.ts` | `applyTheme()` pose `--on-accent`, `--brand-on-fill` **et** `--ion-color-primary-contrast` à partir de `inkOn(t.primary)` — donc Ionic en bénéficie aussi, pas seulement les composants maison. |
| `src/App.css` | `--text-tertiary` : `#8a8f96` → `#6b7280` (clair), `#71717a` → `#8b8b93` (sombre). Commentaire trompeur sur YIQ remplacé par l'explication réelle. |
| `src/ionic/theme.ts` | `LUMINA_TOKENS` / `LUMINA_LIGHT_TOKENS` alignés (garde anti-dérive satisfaite). |
| `src/lib/__tests__/color-contrast.test.ts` | **20 tests** : primitives WCAG, choix d'encre, et surtout `it.each` sur les **10 accents du catalogue réel**. |
| Montants | `font-black` (900 non embarquée → graisse synthétique) remplacé par `font-bold` (700, réellement chargée) sur **9 occurrences** ; `tabular-nums` ajouté à `TransactionCard` (le composant le plus vu). |

**Résultat mesuré sur les 10 accents** — avant / après :

| Accent | Ancienne encre figée (blanc) | Encre calculée | Verdict |
|---|---|---|---|
| Orange Fire `#FF6B00` | **2,86** | **7,36** (noir) | corrigé |
| Vert Émeraude `#10B981` | **2,54** | **8,28** (noir) | corrigé |
| Jaune Savoir `#D97706` | **3,19** | **6,59** (noir) | corrigé |
| Teal Soin `#0D9488` | **3,74** | **5,61** (noir) | corrigé |
| 6 autres | 4,60 – 6,29 | inchangé (blanc) | conforme |

**4 accents sur 10 étaient fautifs ; aucun ne l'est plus.**

`--text-tertiary` : clair **3,04 → 4,52** (canvas) / 3,26 → 4,83 (surface) ;
sombre **3,96 → 5,67** / 3,60 → 5,14. Hiérarchie préservée, vérifiée par test
(`tertiary` reste sous `secondary`).

**Non-vacuité** : l'assertion centrale échoue si l'on revient à une encre figée
en blanc — les 4 accents fautifs sont nommés dans le message d'erreur. Le test
`design-tokens-drift.test.ts`, qui existait déjà et compare TS ↔ CSS, a
d'ailleurs **attrapé ma modification** avant que je ne l'aligne : la garde
fonctionne.

**Validation** : `tsc` 0 erreur · `eslint` 0 erreur · `build` ✓ · **2 636 tests
verts** (271 fichiers).

### Ce que ce lot ne prouve pas

Le **rendu perçu**. Aucune capture d'écran possible dans cet environnement : les
valeurs sont justes au calcul, mais l'arbitrage esthétique (un orange avec du
texte noir change l'identité visuelle) reste une **décision humaine** — c'est
exactement la question Q3 de §9, et elle n'est pas tranchée.

### Prochain lot

Le lot 2 (garde-fous) est le suivant logiquement, mais il **dépend de Q1 et Q2** :
figer une règle de lint sur les couleurs sans savoir si les documents de design
manquants imposent d'autres jetons reviendrait à graver une décision révisable.

---

## 12. Révision du 15 novembre — le dépôt a changé sous le plan

Entre la base de ce plan (`2293f14`, 4 nov.) et la révision (`66a4edc`, 15 nov.),
`main` a reçu **35 commits**. Trois d'entre eux rendent une partie du plan
obsolète, et il faut le dire plutôt que de laisser un document périmé passer
pour un état des lieux.

### Ce qui est arrivé entre-temps

| Constat d'origine (§2) | État au 15 nov. | Conséquence |
|---|---|---|
| « Les composants `Lu*` : un seul, `LuminaLogo.tsx` » | **Un design system complet existe** : `src/design-system/components/` (`LuAmount`, `LuButton`, `LuCard`, `LuHero`, `LuField`, `LuChart`…), `src/design-system/tokens/` avec **générateur** et CSS généré | La prémisse « pas de composants partagés » était fausse **au moment de la révision**. Le plan ne doit plus proposer de les créer. |
| « Aucune garde anti-couleurs en dur » | **`src/design-system/ratchet/`** : ratchet lint « zéro nouveau littéral de couleur », porté par une règle ESLint (`scripts/eslint-rules/no-hardcoded-colors.mjs`) avec baseline versionnée | **Le lot 2 est déjà fait**, en mieux : baseline qui ne peut que décroître. |
| `--text-tertiary` fautif dans les deux modes | **Sombre corrigé sur `main`** (`#898991`, 5,52:1) ; **clair toujours fautif** (`#70757d`, 4,33:1 < 4,5) | Le défaut s'est réduit de moitié ; il reste **un** cas réel. |
| `font-black` synthétique | Traité par ce lot (9 occurrences → `font-bold`) | fait |
| `LuAmount` n'existe pas | **Il existe** et impose déjà `tabular-nums`, signe `−` U+2212, espaces fines insécables | Le lot 3 devient « **migrer les écrans vers `LuAmount`** », pas « ajouter `tabular-nums` partout ». |

**Leçon de méthode, à la charge de ce plan** : il a été établi sur une base qui
avait six jours, et il décrit un dépôt qui n'existe plus. Un audit de design
périme encore plus vite qu'un audit de sécurité, parce que le design system
avance par gros blocs. Toute révision doit commencer par `git log --since`.

### Ce qui reste vrai, et vérifié sur la nouvelle base

- **`--on-accent` est toujours figé à `#ffffff`** dans `App.css` — le défaut
  principal du lot 1 **n'a pas été corrigé par `main`** (vérifié :
  `grep on-accent src/App.css` → `#ffffff`).
- **Le thème `violet` (nouveau) a le même défaut**, d'une autre manière : son
  `--lu-on-accent` généré vaut `#000000` alors que `#7C4DFF` donne **4,36:1**
  avec du noir contre **4,81:1** avec du blanc. Le générateur choisit le noir
  parce qu'il mesure un accent *différent* (ajusté en OKLCH), puis `applyTheme`
  pose `#7C4DFF` brut : les deux ne parlent pas du même accent.
- **31 pages sans `data-screen-state`** — **recompté** sur la nouvelle base le
  15 nov. (`comm -23 <(ls src/pages/*.tsx|sort) <(grep -rl data-screen-state …)`),
  identique au chiffre d'origine. Les autres compteurs rejoués : montants
  24 pages, `tabular-nums` **9** (10 − 1, une page ayant migré vers `LuAmount`),
  styles en ligne **1 374** (contre 1 359 — la dette a légèrement augmenté,
  malgré l'arrivée du design system).
- **Le contraste n'est testé nulle part** pour les 10 accents historiques : le
  générateur couvre le violet, pas `LUMINA_THEMES`.

### Ce que le lot 1 est devenu

Le module `src/lib/colorContrast.ts` **ne réimplémente pas** la formule : il
appelle `culori`, la même librairie que le générateur de jetons. Cette décision
vient d'une première version qui dupliquait la luminance — un défaut, puisque
deux formules d'accessibilité qui divergent est exactement le problème corrigé.
Un test vérifie désormais l'égalité stricte avec `culori` sur quatre paires.

Portée finale du lot : `applyTheme()` calcule l'encre des **10 accents
historiques** au runtime et couvre aussi `--ion-color-primary-contrast` (sans
quoi les composants Ionic gardaient leur blanc fixe). Pour `violet`, dont
l'accent est une variable CSS (`var(--lu-accent)`), la valeur littérale n'est
pas disponible côté JS : on s'appuie sur `--lu-on-accent`, que le générateur
publie déjà.

### Reste ouvert

Le **désaccord de source** sur le violet : `applyTheme` pose `#7C4DFF` alors que
le générateur calcule `--lu-on-accent` pour un accent ajusté. Corriger cela
demande de trancher **quelle valeur fait foi** (l'accent brut du catalogue ou
l'accent ajusté au contraste) — question produit, pas technique. Elle rejoint
**Q3**.

**`main` est rouge sur Cypress : 40 runs consécutifs en échec depuis le 6
novembre** (28+4 puis 25 échecs). Ce n'est pas attribuable à ce lot : la branche
a été rebasée sur `main` et la suite locale est verte (2 939 tests).
