# A8 — Arbitrage IonTabs (go / no-go)

Date : 4 nov. 2026 · Statut : **recommandation NO-GO, en attente de validation**
Porte de sortie de la phase A8 (audit §4) : « Décision documentée ».

## 1. Question posée

Faut-il migrer la navigation basse maison (`BottomNav`) vers
`IonTabs` / `IonTabBar` ? C'est la dernière exception ouverte de la règle
« Ionic d'abord » (`docs/ui-exceptions.md`, ligne `BottomNav` :
« Évaluation go/no-go prévue en **A8** (compatibilité routeur à prouver) »).

## 2. État actuel (mesuré le 4 nov. 2026)

- **Routeur déjà Ionic** : `IonReactRouter` + un seul `IonRouterOutlet`
  racine, **pile de navigation unique**, 76 `<Route>` (`src/App.tsx` + 12
  modules `src/ionic/routes/`), navigation par `navigate()` (push).
- **`BottomNav`** (312 lignes, HTML natif) porte cinq responsabilités
  *produit*, pas seulement visuelles :
  1. onglets **configurables par l'utilisateur** (1 à 4 features épinglées,
     persistées — `src/lib/features.ts`, réglage « Features &
     navigation »), avec repli sur la liste par défaut si le réglage
     persisté ne résout aucun onglet ;
  2. bouton « Menu » ouvrant `FeatureSidebar` (toutes les features par
     catégorie, avatar/nom, Profil/Paramètres) ;
  3. **FAB contextuel** à destination déterministe par route (masqué là où
     la page expose déjà son action) ;
  4. préchargement du chunk de la vue avant `navigate()`
     (`ensureNavViewChunk`) — garde anti-écran-noir pendant les transitions
     Ionic, verrouillée par `cypress/e2e/nav-bottom.cy.ts` (309 lignes :
     chaque onglet mène à sa page, aucun écran noir, budget de perf) ;
  5. règles d'affichage : barre masquée sur les formulaires (P2-6),
     safe-area basse via `--ion-safe-area-bottom` **forcé à 0 sur Android
     natif** (MainActivity rembourre déjà la WebView — P1-3), z-index sous
     les modales (M15).
- **Historique** : la barre a déjà été construite sur
  `IonTabBar`/`IonTabButton`, puis **réécrite en HTML natif**. Raison
  documentée en tête de `src/components/BottomNav.tsx` : sous React 19,
  les enfants React de ces custom elements pouvaient ne pas être rendus
  dans le light DOM (barre vide, boutons sans icône) selon l'ordre de
  définition des custom elements.

## 3. Option 1 — IonTabs complet (piles par onglet)

Ce qu'il faudrait :

- restructurer les 76 routes en piles par onglet (le patron canonique
  Ionic React préfixe les routes par onglet) — or les onglets sont
  **dynamiques** (n'importe quelle feature peut être épinglée) : la table
  de routes devient dynamique, et les pages de détail doivent rester
  joignables depuis plusieurs piles ;
- réécrire les URL ou ajouter un schéma de préfixe → impact sur les liens
  profonds (notifications), sur les `cy.visit('/finance')` des 41 specs
  Cypress, et sur tout lien stocké ;
- réimplémenter autour d'`IonTabBar` ce qu'IonTabs n'absorbe pas :
  onglets dynamiques, pseudo-onglet « Menu » qui ouvre un tiroir au lieu
  de naviguer, FAB contextuel, masquage sur formulaires ;
- re-prouver la garde anti-écran-noir (préchargement de chunk) dans le
  modèle à piles, et la non-double-compensation du safe-area Android.

Gains réels : piles par onglet (bouton Retour matériel par onglet, re-tap =
retour à la racine, état et scroll conservés par onglet). Contreparties :
toutes les vues visitées restent montées — mémoire sur les appareils
d'entrée de gamme visés, abonnements PowerSync maintenus en vie sur des
vues cachées, alors que le modèle de rafraîchissement (A5) a été construit
pour la pile unique.

**Aucun défaut utilisateur ne motive ce changement** : l'audit A8 dit
« évaluer » ; il ne constate ni plainte sur le bouton Retour, ni perte
d'état entre écrans.

## 4. Option 2 — IonTabBar seul (coquille visuelle, routeur inchangé)

- Gain : ondulation Material et rendu « natif » de la barre uniquement.
- Coûts/risques : réintroduit exactement la combinaison (enfants React
  projetés dans des custom elements) qui a déjà produit une barre vide
  ici (§2) ; le safe-area intégré d'`IonTabBar` double-compenserait le
  rembourrage Android natif (à neutraliser) ; les cinq responsabilités
  produit restent portées à la main.
- Verdict : cosmétique, risque déjà payé une fois. **Écartée.**

## 5. Risque transversal : React 19 × custom elements Ionic

Deux précédents payés dans ce dépôt, même classe d'interopérabilité :

- `IonTabBar` : enfants non rendus en light DOM → réécriture HTML (§2) ;
- `IonAlert` : `inputs={undefined}` posé comme **propriété** par le
  runtime React, écrasant le défaut `[]` du cœur Ionic → alertes vides,
  confirmations destructrices cassées de #404 à #411 (correctif `[]` +
  garde de non-régression #415).

Toute réintroduction d'un composant à enfants projetés doit donc être
prouvée en build de production sur appareil, pas supposée.

## 6. Recommandation : NO-GO

Conserver `BottomNav` (exception documentée) :

1. aucun défaut à corriger — le gain est un « ressenti natif » non
   demandé, sans plainte associée ;
2. le modèle produit (onglets configurables + Menu + FAB contextuel) ne
   se projette pas sur IonTabs sans le combattre ;
3. le coût est une restructuration du routage (76 routes, 41 specs,
   liens profonds) là où la règle « Ionic d'abord » vise à *réduire* le
   code et le risque — ici elle les augmenterait ;
4. deux incidents d'interopérabilité React 19 × Ionic déjà payés sur
   cette surface exacte (§5).

Conditions de réexamen : retours utilisateurs sur le bouton Retour ou la
perte d'état entre onglets ; onglets devenus fixes (fin de la
configuration utilisateur) ; montée de version majeure Ionic/React
changeant la donne d'interopérabilité.

## 7. Si GO malgré tout : critères de la preuve de concept

L'audit prévoit un PoC sur 2 onglets. Sortie minimale exigible :

- rendu stable des icônes/libellés (light DOM) en **build de
  production**, démarrage à froid, sur appareil Android réel ;
- 2 onglets à piles indépendantes + page de détail + **lien profond**
  (notification) atterrissant dans la bonne pile ;
- bouton Retour matériel conforme (pile de l'onglet, puis sortie) ;
- aucune régression sur les gardes existantes : `nav-bottom.cy.ts`
  (écran noir, budget de chunks), safe-area (checklist §4.10), mémoire
  mesurée après visite des 4 onglets sur appareil d'entrée de gamme ;
- plan de migration des URL (redirection des anciennes) et des 41 specs.

## 8. Décision

- Recommandation de l'évaluation : **NO-GO** (§6).
- Décision : à valider par Joy.
- Après validation : mettre à jour la ligne `BottomNav` de
  `docs/ui-exceptions.md` (« Évaluation go/no-go prévue en A8 » → issue
  retenue + pointeur vers cette note) et clore la phase A8.
