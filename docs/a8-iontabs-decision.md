# A8 — `IonTabs` : décision go / no-go

**Date** : 4 novembre 2026 · **Phase** : A8 du plan §4 · **Décision** : **NO-GO**

C'est une décision, pas une tâche. Ce document existe pour que la question
« pourquoi ne pas utiliser `IonTabs`, alors que la règle est *Ionic d'abord* ? »
trouve une réponse sans avoir à refaire l'analyse.

---

## Ce que la règle « Ionic d'abord » demande réellement

La règle impose de **vérifier** le composant Ionic avant d'écrire un composant
maison, et d'écrire l'exception quand on s'en écarte. Elle n'impose pas
d'adopter Ionic quand l'adoption dégrade mesurablement le produit.

`IonTabs` a donc été examiné, et il est refusé pour trois raisons indépendantes,
chacune vérifiable dans ce dépôt.

---

## 1. Routeur : conflit de propriété

`IonTabs` ne fonctionne pas sans `IonRouterOutlet` propre à chaque onglet : il
**possède la navigation**. Il doit décider quelle pile d'écrans est active, et
`IonTabBar` doit être le composant qui change d'onglet.

Ce dépôt utilise `react-router-dom` (`MemoryRouter` / `BrowserRouter`,
`useNavigate`, `useLocation`) : c'est lui qui possède la navigation, et les
écrans lisent `pathname` pour se positionner.

Adopter `IonTabs` impliquerait de faire cohabiter deux propriétaires de la
navigation — un cas connu pour produire des historiques incohérents (retour
arrière qui revient sur un onglet, URL et pile visuelle désynchronisées).

**Preuve** : `src/components/BottomNav.tsx:32-38` — `useNavigate()` +
`useLocation()` pilotent la barre.

---

## 2. React 19 : rendu non déterministe des enfants de custom elements

La barre actuelle a **déjà été** construite sur
`IonTabBar` / `IonTabButton` (`src/components/BottomNav.tsx:19-27`) et a été
réécrite en `<button>` natifs :

> « Historiquement construite sur IonTabBar/IonTabButton/IonButton (custom
> elements Ionic) : avec React 19, les enfants React de ces éléments pouvaient
> ne pas être rendus dans le light DOM (barre vide, boutons sans icône) selon
> l'ordre de définition des custom elements. »

Ce n'est pas une hypothèse : c'est un incident constaté, avec une barre vide en
production. `package.json` épingle `react ^19.2.8`. Revenir à `IonTabs`
reviendrait à réintroduire la cause du bug, en pariant que l'ordre de
définition des custom elements est désormais toujours favorable — un pari que
rien dans le dépôt ne documente.

Le rejet est d'autant plus solide que les autres composants Ionic adoptés en A7
(`IonSegment`, `IonToggle`, `IonSearchbar`) ne sont **pas** concernés : leur
contenu est rendu par Ionic lui-même dans son shadow root, pas par React dans
leur light DOM.

---

## 3. Budget de performance : la marge est mince

`docs/agent/perf-budget.json` (mesuré le 27 oct., garde active dans
`perf-budget.test.ts`) :

| Mesure | Valeur | Budget | Marge |
|---|---|---|---|
| requêtes au premier rendu | 20 | 28 | **8** |
| poids brut premier rendu | 2 284,5 kB | 2 560 kB | 276 kB |
| poids gzip premier rendu | 577,5 kB | 650 kB | 72,5 kB |

`IonTabs` + `IonTabBar` + `IonTabButton` + `IonRouterOutlet` ajoutent des
chunks Ionic au **premier rendu** — c'est-à-dire exactement le chemin mesuré. Le
commentaire de `src/utils/load-ionic-core.ts` rappelle qu'un import statique de
`@ionic/core` avait déjà fait passer le premier rendu à **39 requêtes contre un
budget de 28**. La marge de 72 kB gzip n'est pas une invitation à empiler des
composants dont on a déjà mesuré le coût.

---

## Ce que cette décision ne dit pas

- Elle ne dit pas que `IonTabs` est mauvais : c'est le bon choix pour une
  application Ionic **dont Ionic possède le routeur**.
- Elle ne dit pas que la barre maison est parfaite. Elle est en `<button>`
  natifs, avec `role="tablist"`/`role="tab"` : le comportement attendu d'onglets
  (activation, état sélectionné, ordre de tabulation) est porté par du HTML
  standard, ce qui est aussi une garantie d'accessibilité.

## Conditions de réexamen

La décision serait à rouvrir si l'une de ces conditions change :

1. le routeur de l'application devient `IonRouterOutlet` (migration complète) ;
2. React cesse de poser problème sur les enfants de custom elements, **avec une
   preuve de test** et non une montée de version supposée suffisante ;
3. le budget de performance est relevé volontairement, décision tracée.

Aucune des trois n'est remplie au 4 novembre 2026.

---

## État final des phases du plan §4

| Phase | État | Référence |
|---|---|---|
| A0 | gabarit documentaire | `docs/audit-permissions.md` |
| A1–A3 | livrées | #404 |
| A4 | livrée | #404 |
| A5 | livrée | #404 |
| A6 | livrée | #412 (toaster unique) |
| A7 | livrée | #412 (`IonRefresher`), #416 (`IonToggle`, `IonSearchbar`), #417 (`IonSegment`) |
| A8 | **décidée : no-go** | ce document |

**Non prouvé ici** : le comportement sur appareil Android réel (aucun émulateur
dans l'environnement de développement) et le protocole de test manuel
Android 12–15 du plan, qui reste à exécuter.
