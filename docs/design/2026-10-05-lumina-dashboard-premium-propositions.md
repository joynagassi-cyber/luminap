# Lumina — 3 propositions premium de dashboard principal

> **Date** : 2026-10-05 · **Contexte** : session QA dimanche (B4 design → B5 dashboard v2)
> **Cible** : `src/pages/Dashboard.tsx` (l'« Accueil » du BottomNav, surface 390×844 mobile-first)
> **Objet** : ce document est la référence de choix AVANT toute implémentation.
> L'implémentation B5 ne démarre qu'après la sélection d'une proposition (ou d'un mix).

---

## 0. Ce que dit l'état actuel (audit express de `Dashboard.tsx`)

La page est déjà propre (règles canon respectées : `IonItem lines="none"`, tokens
`--surface`/`--border`/`--data-*`, `CircleAction` M23, `BottomNav` figé). Ses limites
visuelles, qui la rendent « trop basique » :

1. **Le héros financier est un gradient pastel très plat** — le chiffre clé
   (résultat net du mois) a le même poids visuel que les labels secondaires.
2. **Aucun graphique** — pas de tendance, pas de répartition. L'app a recharts
   (`AreaChart` dans le bundle Android) mais le dashboard principal ne l'utilise pas.
3. **Hiérarchie plate** : 5 blocs empilés du même poids (profil, héros, stats,
   événements, caisses, actions, transactions) → l'œil n'a pas d'ancrage.
4. **Rôle sous-exploité** : un admin et un membre voient exactement le même écran.
5. **Le multi-organisation est absent** : pas de sélecteur d'org, pas d'aperçu
   annexes/rapports, alors que l'app est le cœur du produit (Features 1-2).
6. **Pas d'état « vie » du système** : sync PowerSync, dernier rapport reçu,
   événements du jour → le dashboard ne dit pas « où ça en est ».

**Invariants non-négociables (toutes propositions)** :
- Mobile 390×844, `max-w-lg mx-auto`, `pb-safe-calc` ; le **BottomNav existe déjà**
  → on NE recrée PAS de nav (zéro non-régression sur 15 specs Cypress + 4 existantes).
- **Tokens Lumina uniquement** (`var(--surface)`, `var(--card)`, `var(--border)`,
  `var(--accent-primary)`, `var(--data-income/expense/pending/advance/planified)`,
  `--z-*`, `--shadow-*`) — aucune couleur brute.
- Les sélecteurs testés par Cypress restent (`aria-label="Voir les détails de la
  caisse principale"`, textes « Entrées du mois », « Derniers mouvements », boutons
  CircleAction aria-label) → on peut **ajouter** mais pas **renommer/cacher** ces anchors.
- `DashboardSkeleton` (chargement) et `EmptyState` (0 mouvement) préservés.
- Données 100% PowerSync/local-first : aucun appel REST à l'ouverture du dashboard.

---

## P1 — « Executive Card » (la carte bancaire d'exec)

### Vision / métaphore
Le dashboard OUVRE sur une **carte physique premium** : une surface sombre
(`--card` inversé, ou `--surface-elevated`), biseautée, avec le solde comme s'il
était gravé sur une carte bancaire. Le reste de l'écran est en retrait :
l'argent d'abord, le reste ensuite. C'est la proposition la plus « produit
premium bancaire » (à la Raiffeisen / Revolut) — la plus lisible, la moins risquée.

### Maquette ASCII (390×844)

```
┌─────────────────────────────────────┐
│ ●  bonjour, Jean · Trésorier        │ TopHeader (existant, figé)
├─────────────────────────────────────┤
│ ╔═════════════════════════════════╗ │
│ ║ LUMINA  [logo]          ÉGLISE  ║ │  ← CARTÉROÏDE
│ ║                                  ║ │     fond: var(--card) dark
│ ║ Résultat net — Octobre          ║ │     + motif subtil (dégradé 2%
│ ║  ▸ 2 450 000 F                 ║ │       accent, ombre --shadow-card,
│ ║  ─────────────                  ║ │       bordure 1px var(--border))
│ ║  +812 000 F  ┃  -1 638 000 F    ║ │     coins: radio 20px
│ ║  entrées     ┃  sorties         ║ │
│ ║  [sync ● en ligne 07:12]       ║ │
│ ╚═════════════════════════════════╝ │
│                                     │
│ [ En attente 3 ] [ Évén. 2 ] [Gr.4]│ stats quick (existantes, refondu
│                                     │   en chips 2-up + sparkline)
│ ┌─ Tendance (6 mois) ─────── ● ● ─┐│
│ │   ▁▂▅▂▆▇  recharts AreaChart    ││  ← NOUVEAU : mini-chart 96px,
│ └──────────────────────────────────┘│     dégradé accent → transparent
│                                     │
│ Aujourd'hui & à venir              │
│  ● Culte — 27 oct · budget 80% ▓▓░ │ événements (existant, refondu)
│  ● Trésorerie — 29 oct            │
│                                     │
│ Caisses des groupes (2)            │
│  ◆ Caisse Jeunesse    +120 000 F  │
│  ◆ Choeur             -  45 000 F  │ (refonte CaisseCard: sparkline)
│                                     │
│ [ + Entrée ][ - Sortie ][ Verse. ][Évén.]  CircleAction (existant M23)
│                                     │
│ Derniers mouvements                │
│  ◆ Offrande culte    +50 000  07:12│
│  ◆ Location sono     -30 000  hier │
│                         Tout voir →│
├─────────────────────────────────────┤
│  [Accueil] [Finance] [Évén.] [Admin][Param]  BottomNav (figé)
└─────────────────────────────────────┘
```

### Composants concrets
| Bloc | Implémentation |
|------|---------------|
| Carte héro | Nouvelle version de l'actuel héros : `bg: var(--card)` (mode sombre) ou `linear-gradient` 2 tons de `--accent-primary` (6%→2%), `--shadow-card`, motif SVG subtil. **Le `aria-label` « Voir les détails de la caisse principale » reste.** |
| Sync pill | `IonBadge` + état `usePowerSyncStatus` (existant) : `● en ligne` / `● re-sync…` / `● hors ligne`. |
| Sparklines | `AreaChart` recharts existant, 96px de haut, `stroke: var(--accent-primary)`, dégradé `--accent-primary` 18%→0. Tooltip masqué (léger). |
| Chips stats | Grid 2+1 : En attente / Événements / Groupes — chacune avec **delta** (`+2 vs hier`) via `getPeriodRange("semaine")`. |
| CaisseCard | Ajout d'une sparkline 60px + badge « en attente X » si `pendingAmount ≠ 0`. |

### Effort & risque
- **Effort** : 1 session (4-6 h), ~300-400 lignes modifiées dans `Dashboard.tsx` + 1 nouveau composant `HeroFinanceCard`.
- **Risque** : **faible**. Ancres Cypress préservées, pas de nouvelle dépendance (recharts déjà installé). Le seul nouveau composant testable est la carte.
- **Ce qui manque** : aucune dimension multi-org / annexes. C'est un « plus beau dashboard de la caisse » — pas un poste de commandement.

---

## P2 — « Command Center multi-organisation » (l'orchestrateur)

### Vision / métaphore
Le dashboard devient un **poste de pilotage de la fédération** : en haut,
un **sélecteur d'organisation** (chips horizontales) qui bascule tout
l'écran entre les orgs dont l'utilisateur a un grant actif ; au-dessous,
une rangée de **KPIs par org** (membres, solde, rapports à traiter) ;
puis un **stream unifié** « à faire » (approbations + événements +
rapports reçus + caisses). La métaphore : un hub de contrôle de type
mission control, mais mobile et chaud (accent warm `--accent-primary`
sur fond `--surface`). C'est la proposition la plus **produit** (elle
met en scène les Features 1-2 déjà livrées) — et la plus coûteuse.

### Maquette ASCII (390×844)

```
┌─────────────────────────────────────┐
│ ●  bonjour, Jean · Admin central     │
├─────────────────────────────────────┤
│ (Toutes) (Église) (Annexe A) (B)  + │  ← CHIPS ORG (scroll horizontal,
│    ●   ●        ●       ○           │     active = dot accent + ring
│                                     │
│ ╭─ Église St-Martin ──────────────╮ │  ← Bannière org active
│ ║ Solde  ▸ 2.450.000 F  ▼12%      ║ │     (accent border-left 3px)
│ ║ Membres 142 · Rapports 3 à voir║ │
│ ╰──────────────────────────────────╯ │
│                                     │
│ ┌─À FAIRE (n)─────────────────────┐ │  ← STREAM UNIFIÉ (n = nombre global)
│ │ ● 2 transactions à approuver    │ │     priorité: PENDING > RAPPORT
│ │ ● Rapport de A à lire (pdf)     │ │     NOUVEAU: org_reports non lus
│ │ ● Culte 27 oct · budget à 80%  │ │     (hook useReportsReceived
│ │ ◆ Evénement 29 oct · ONGOING    │ │      + useTransactions PENDING
│ │ ◆ Caisse Jeunesse -45 000 F     │ │      + useEvents)
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ RAPPORTS REÇUS ───────────────┐ │  ← Feature 2 exposée ici
│ │ A · T3 2026 · pdf · non lu     │ │     (marque-lu + CTA « Ouvrir »)
│ │ B · T3 2026 · xlsx · lu        │ │
│ │            [Envoyer un rapport →]│
│ └────────────────────────────────┘ │
│                                     │
│ [ Approb. 2 ][ Évén. 2 ][ Rap. 3 ] │  stats rapides par type
│                                     │
│ [ + Entrée ][ - Sortie ][ Verse. ][Évén.]
│                                     │
│ Derniers mouvements (global)       │
│ ◆ Offrande culte   +50 000 (Église)│
│ ◆ Rapport A→B       (annexe)  hier │
│                         Tout voir →│
├─────────────────────────────────────┤
│  [Accueil] [Finance] [Évén.] [Admin][Param]  BottomNav (figé)
└─────────────────────────────────────┘
```

### Composants concrets
| Bloc | Implémentation |
|------|---------------|
| Chips org | Nouveau composant `OrgSwitcher` : horizontal scroll de `IonItem`-less chips (`button` natif), state via `useOrganizationContext` + `enterOrganization(id)` (capacité existante). Gating : ne s'affiche QUE si l'utilisateur a ≥2 orgs accessibles, sinon retour à P1. |
| Bannière org | `border-left: 3px solid var(--accent-primary)`, fond `color-mix(accent 8%, var(--surface))`. |
| Stream unifié | `useUnifiedTodos()` : union PENDING transactions + rapports `read_at IS NULL` + événements du jour + caisses en solde négatif. Tri par priorité. |
| Rapports reçus | 1re intégration de `useReportsReceived(orgId)` dans le dashboard (actuellement isolée dans `/admin/reports`). CTA `markReportRead`. |
| Stats rapides | 3 chips typées (Approbations / Événements / Rapports), non le triptyque actuel. |

### Effort & risque
- **Effort** : 2-3 sessions (8-14 h), ~500-700 lignes + 2-3 nouveaux composants.
- **Risque** : **moyen**. Le stream unifié nécessite un hook nouveau à bien tester ; les rapports reçus sont déjà livrés (Phase 2-4 Feature 2) → pas de nouveau backend, juste de la composition. Les anchors Cypress existants restent **mais le layout change** → à vérifier à B4 (captures).
- **Ce qui manque** : pas de chartes financières (le P1 est plus lisible pour l'argent). Ce n'est pas un choix binaire — voir § Combinaison.

---

## P3 — « Cockpit financier » (le tableau de bord analyste)

### Vision / métaphore
Le dashboard devient un **cockpit** : 3 mini-graphiques (tendance 6 mois,
répartition par catégorie, top 5 postes) + KPIs avec **deltas** et **objectifs**
(barres de progression budget). C'est la proposition la plus dense en
information, la plus « analyste » — pour l'org qui veut piloter, pas juste
regarder. Style : recharts partout, grille 12 colonnes virtuelle, cards à
bords fins (`--border` 1px) et ombres douces.

### Maquette ASCII (390×844)

```
┌─────────────────────────────────────┐
│ ●  bonjour, Jean · Trésorier        │
├─────────────────────────────────────┤
│  Résultat net · Octobre             │  ← HÉROS SOMBRE COMPACT (à la P1
│  2 450 000 F  ▲ +8,2% vs sept.      │     mais une seule ligne, delta)
│  [sync ●] [3 en attente] [2 évén.]  │
│                                     │
│ ┌─ Tendance (6M) ────────────────┐ │
│ │ ▁▂▃▅▆▇  Entrées   ▁▂▂▃▃▄ Sort. │ │  ← 2 series sur 1 chart (140px)
│ │ T4   Mai  Ju  Jj  Ao  Sep  Oct │ │
│ └──────────────────────────────────┘ │
│                                     │
│ ┌─ Répartition ─────┐ ┌─ Budget ─┐ │
│ │ Donuts 60/25/15   │ │ Culte   │ │  ← 2-up (90px chacun)
│ │ Offrandes 78%     │ │  80% ▓▓░│ │
│ │ Offrandes 78%     │ │ Sono   │ │
│ └────────────────────┘ │  45% ▓░░│
│ ┌─ Top 5 postes ──────┴───────────┘
│ │ 1. Culte            450 000 F  │
│ │ 2. Salaires         320 000 F  │
│ │ 3.Sono              210 000 F  │
│ │ 4. Loyer             90 000 F  │
│ │ 5. Imprimerie        45 000 F  │
│ └─────────────────────────────────┘ │
│                                     │
│ [ + Entrée ][ - Sortie ][ Verse. ][Évén.]
│                                     │
│ Derniers mouvements                │
│ ◆ Offrande culte    +50 000  07:12 │
│ ◆ Location sono     -30 000  hier │
│                         Tout voir →│
├─────────────────────────────────────┤
│  [Accueil] [Finance] [Évén.] [Admin][Param]  BottomNav (figé)
└─────────────────────────────────────┘
```

### Composants concrets
| Bloc | Implémentation |
|------|---------------|
| Héros compact | Une seule carte (pas le gros bloc de P1) : résultat + delta vs mois préc. (calculé via `getPeriodRange("mois", prevMonth)`). |
| Tendance | `AreaChart` recharts 2 series (Entrées / Sorties) sur 6 mois, 140px. |
| Répartition | `PieChart` recharts (par `transaction.category`) — 60% Offrandes, 25% Donations, 15% Autres (mapping à construire dans `dataLayer`). |
| Budget par événement | Progress bars existants, mais agrégés dans une card (top 3 événements avec budget). |
| Top 5 | `PieChart` horizontal bar (recharts `BarChart` vertical) des 5 postes de dépense. |

### Effort & risque
- **Effort** : 1.5 session (6-8 h), ~400 lignes, 100% recharts (déjà présent dans le bundle).
- **Risque** : **moyen**. La répartition par catégorie suppose que les transactions ont `category` (à vérifier au champ) — sinon P3 devient « top 5 par libellé ». La densité peut écraser un écran 390 px si on ne gère pas le scroll (recommandation : 2 sections chartes max).
- **Ce qui manque** : pas de vie du système (sync, annexes), pas d'actions (le stream unifié de P2 est plus utile au quotidien).

---

## Combinaison recommandée (ce que je ferais en B5)

Les 3 propositions **ne sont pas exclusives** — P2 est un *gouffre fonctionnel*
(sélecteur d'org + stream unifié + rapports reçus), P1 est le *look premium*,
P3 est la *densité analytique*. La combinaison optimale (et ce que je proposerais
en B5 si tu validationnes) :

```
P2 (structure)   =  OrgSwitcher + Bannière org + Stream unifié + Rapports reçus
       +
P1 (hero)        =  Carte héro executive (le gros bloc, sombre)
       +
P3 (chard)       =  1 SEULE charte (tendance 6M AreaChart, 96px)
                    + sparklines dans les CaisseCards
```

→ **Structure P2, héro P1, une charte P3** = le dashboard devient un vrai poste de
commandement multi-org avec l'esthétique premium de P1, sans la surcharge de P3.
Ce que je ne ferais PAS : les 3 charts de P3 (trop dense à 390 px) ni le stream
unifié de P2 s'il devient un « journal de tout » (il faut le limiter à 5 items max
+ CTA « Tout voir »).

---

## Décision (à trancher avant B5)

| Option | Effort | Bénéfice | Quand |
|--------|--------|---------|-------|
| **P1 seul** | 4-6 h | Look premium immédiat, zéro risque | Si l'objectif est juste « ne plus être basique » |
| **P2 seul** | 8-14 h | Poste de commandement, multi-org en scène | Si l'objectif est de montrer le produit (demo, client) |
| **P3 seul** | 6-8 h | Densité analytique, cockpit | Si l'objectif est le pilotage financier fin |
| **P2 + P1 + 1 charte P3** (reco) | 10-14 h | Le meilleur des 3, structure + look + 1 charte | Session B5 complète |

---

## Ancres techniques partagées (toutes options)

- **Fichiers touchés** : `src/pages/Dashboard.tsx` (refonte), `src/components/HeroFinanceCard.tsx` (nouveau), `src/components/OrgSwitcher.tsx` (nouveau, P2 seulement), `src/components/TrendChart.tsx` (nouveau, wrapper recharts 1 chart), `src/lib/hooks/useUnifiedTodos.ts` (nouveau, P2 seulement), `src/lib/hooks/usePowerSyncStatus.ts` (si inexistant, vérifier d'abord — sinon créer).
- **Tokens** : `--card` (mode sombre héro), `--surface`, `--surface-hover`, `--border`, `--accent-primary`, `--data-income/expense/pending/advance/planified`, `--z-10/20/30`, `--shadow-card/--shadow-accent`, `--on-accent`.
- **Charges** : recharts (déjà), lucide-react (déjà), framer-motion (vérifier — sinon, animations via CSS only `active:scale-95` déjà en place).
- **Tests à ajouter (Cypress)** : 1 spec `dashboard-v2.cy.ts` couvrant (a) sélecteur d'org bascule sans 404, (b) héro affiche le bon chiffre, (c) stream unifié liste ≥1 item, (d) rapports reçus s'affiche si ≥1 non lu, (e) anchors existants intacts.
- **Critères de sortie B5** : (1) `tsc --noEmit` vert, (2) `vitest` 14/14 existants + nouveaux, (3) capture 390×844 light/dark, (4) `DashboardSkeleton` intaractif (chargement), (5) 0 changement de `BottomNav`.

---

*Document de référence B4→B5. La sélection d'option (P1 / P2 / P3 / mix) est faite
par l'utilisateur, après ce document, avant le lancement de l'implémentation B5.*
