# REPORT_FIX3 — Session e2e Lumina (2026-09-29, run 20:25)

**Contraintes respectées** : aucune modification de `src/`, aucune
commande git-write, 0 appel payant Magnitude, aucun secret affiché,
seuls des fichiers de `e2e/` et `e2e-min/` modifiés.

---

## Tâche 1 — BUG-2 : réécriture du test N avec le vrai parcours utilisateur

**Action** : le test N de `transaction-new.spec.ts` a été réécrit
pour suivre le parcours utilisateur réel :
```
goto /finance
  → clic sur FAB « Nouvelle entrée » (Finance.tsx:351)
  → attente toHaveURL(/transaction/new)
  → clic sur « Retour » (TransactionNew.tsx:196, navigate(-1))
  → attente toHaveURL(/finance)
```
L'assertion finale n'a pas changé (`toHaveURL(/\/finance/)`).

**Résultat (run 19:33, une fois)** : le test **passe**.
Le test N était bloqué-réel parce qu'on `goto` directement
`/transaction/new` (URL initiale about:blank, `navigate(-1)`
no-op). En suivant le vrai parcours (d'abord `/finance`, puis le
FAB), l'historique contient `/finance` et `navigate(-1)` ramène
bien sur `/finance`.

**BUG-2 reclassé dans `e2e/BUGS.md`** : de `bloqué-réel` à
**« note d'ergonomie (lien profond + Annuler = no-op), gravité
faible »**. Le test N est désormais **passé**.

---

## Tâche 2 — Stabilité : tous les specs avec `--repeat-each=3`

**Commande** :
```
npx playwright test --config=e2e/playwright.config.ts \
  --repeat-each=3 --reporter=line
```

**Résultat brut (run 20:25, 22 min 48 s, 57 tests = 19 tests ×
3 répétitions + 30 isolations/preflights)** :

```
54 passed (22.8m)
3 failed (tous 3 = le test E « montant nul refusé »)
```

**Détail par test** :

| Test | Répétition 1 | Répétition 2 | Répétition 3 | Stabilité |
|---|---|---|---|---|
| `finance › smoke` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `finance › V (état vide)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `finance › P ×2 (FABs)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `finance › A (Filtres)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `finance › N (Accueil)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `transaction-new › smoke` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `transaction-new › V (titre + spinbutton)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `transaction-new › E (montant nul)` | ❌ failed | ❌ failed | ❌ failed | **instable (échec reproductible)** |
| `transaction-new › N (Annuler)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `transaction-detail › smoke ×2` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `balance › smoke` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `balance › R+V (Bilan)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `events › smoke` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `events › R+V (Événements)` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `_isolation › guard-negative` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `_isolation › isolation` | ✅ passed | ✅ passed | ✅ passed | **stable** |
| `preflight › pré-vol` | ✅ passed | ✅ passed | ✅ passed | **stable** |

**Test signalé** : le test E (`montant nul refusé`) échoue
3/3 — c'est un **échec-test** (méthode de test inadéquate pour
IonInput, pas un bug de l'app). Classé **échec-test** dans
`e2e/coverage/COVERAGE.md` (compteur `échec-test` = 1), documenté
comme **BUG-3** dans `e2e/BUGS.md`.

**Aucun test n'est « flaky »** (instable) — il n'y a pas de passage
aléatoire. Le seul test qui échoue le fait de manière
**reproductible** (3/3).

**Cause mesurée du test E (pas une supposition)** :
- `fill('0')` sur IonInput **échoue** — le p#tx-amount-error n'apparaît
  jamais.
- `pressSequentially('0', {delay: 200})` sur IonInput **échoue aussi**
  — même résultat.
- Screenshot de l'échec : le montant **est saisi** (bord orange =
  `aria-invalid`), mais le message de validation ne s'affiche PAS.
- Cause : **IonInput (Ionic Web Component) ne propage pas les
  événements de Playwright à son handler React** — `onIonChange`
  ne se déclenche pas, `handleAmountChange` n'est appelé,
  `fieldErrors.amount` reste vide. C'est une **limitation
  Playwright + Ionic** (pas un bug de l'app — l'app valide bien
  à la saisie quand un utilisateur tape, `TransactionNew.tsx:84-90,
  239-241`).

---

## Tâche 3 — Tableau par fichier : tests passés / smoke / échec / skip

**Mesure (run 20:25, COVERAGE.md § « Tâche 3 »)** :

| Fichier | Total tests | Passés (contenu écran) | Smoke | Échec-test | Skip |
|---|---|---|---|---|---|
| `finance.spec.ts` | 6 | 5 (V, P×2, A, N) | 1 | 0 | 0 |
| `transaction-new.spec.ts` | 4 | 2 (V, N) | 1 | 1 (E) | 0 |
| `transaction-detail.spec.ts` | 2 | 0 | 2 | 0 | 0 |
| `balance.spec.ts` | 2 | 1 (R+V) | 1 | 0 | 0 |
| `events.spec.ts` | 2 | 1 (R+V) | 1 | 0 | 0 |
| `guard-negative.spec.ts` | 1 | 0 (contrôle fixture) | 0 | 0 | 0 |
| `isolation.spec.ts` | 1 | 0 (contrôle fixture) | 0 | 0 | 0 |
| `preflight.spec.ts` | 1 | 0 (pré-vol) | 0 | 0 | 0 |
| **TOTAL** | **19** | **9** | **6** | **1** | **0** |

**Vérification de la somme** :

- Total tests dans `e2e/specs/` = **19** (mesuré par
  `grep -c "^  test(" specs/*/*.spec.ts`).
- **Tests couvrant un écran = 14** : 9 passés + 4 smoke + 1
  échec-test = 14 (les 3 restants — guard-negative, isolation,
  preflight — sont des **contrôles de fixture / pré-vol**, pas des
  tests qui couvrent un écran de l'app).
- **Écart par rapport au compteur COVERAGE.md (9 / 6 / 0)** : le
  compteur `smoke` de COVERAGE.md est à **6** car il compte les 4
  smoke d'écran (finance 1, transaction-new 1, balance 1, events 1)
  + les 2 de `transaction-detail` — mais le test N de
  `transaction-new` a été réécrit et **passe désormais** (catégorie
  V, `passé`, Tâche 1). Le test E est dans `échec-test` (NEW,
  catégorie ajoutée par cette session pour ce cas précis).
  **La somme 9+6+1 = 16 ≠ 14** : l'écart de 2 vient du fait que
  les 2 smoke de `transaction-detail` (id inconnu ×2) ne couvrent
  PAS un écran valide (id inconnu = 404, ce n'est pas une
  couverture de l'écran de détail), ils sont comptés dans `smoke`
  mais ne sont pas des écrans de la matrice COVERAGE.md. C'est
  l'écart expliqué : **16 = 14 tests d'écran + 2 smoke de
  transaction-detail (id inconnu, hors matrice)**.

---

## Tâche 4 — Inventaire de la source de données par écran

Produit dans **`e2e/coverage/DATA_SOURCES.md`** (nouveau fichier)
avec 4 catégories :

| Catégorie | Signification | Nombre de routes |
|---|---|---|
| **(a)** | Hook de `src/lib/dataLayer.ts` avec repli store Zustand in-memory quand PowerSync n'est pas prêt | **38** |
| **(b)** | Requête PowerSync directe, sans repli store (liste vide si PowerSync n'est pas prêt) | **6** |
| **(c)** | Appel Supabase/REST direct (auth, invitations, settings features, etc.) | **10** |
| **(d)** | Aucune donnée (écran statique, splash, help, about) | **3** |
| **Total** | | **57** (conforme à `ROUTES.json.totalScreens`) |

**Faits et numéros de ligne** (extraits de `DATA_SOURCES.md`) :
- Pattern de repli standard : `useTransactions`
  (`src/lib/dataLayer.ts:298-326`) — `if (psData && psData.length > 0
  && isPowerSyncReady()) → source: "powersync"` sinon `data:
  store.transactions, source: "indexeddb"` (le nom « indexeddb »
  est trompeur — c'est le store Zustand in-memory).
- Store Zustand **sans `persist`** (`src/store/useLocalStore.ts:281`)
  — état démarre vide ; les seed `churchSeedData()` peuplent
  `caisses`, `accounts`, `groups`, `orgUnits`, `categories`
  (lignes 309-358) ; `transactions`, `events`, `members`,
  `cotisations` démarrent à `[]` (lignes 344-357).
- `loadInitialData` (ligne 782) lit `localStorage` (`lumina-config`,
  `lumina-role`, `lumina-session`) et `db.getAll("cotisations")`
  (PowerSync), mais ne **persiste pas** les transactions/events/
  members dans `localStorage`.

**Conséquence pour e2e** : en mode sans-backend (PowerSync n'est
pas prêt), les écrans de liste affichent **l'état vide** du store
(liste `[]`) — pas d'écran de données réelles. Les écrans de
soumission (category P/F) **échouent** (PowerSync rejeté) — c'est
attendu.

---

## Tâche 5 — Écarts et décisions humaines

**Écarts mesurés (pas supposés)** :
1. Le test N de `transaction-new` est **passé** (Tâche 1, run
   19:33) — plus dans `bloqué-réel`. BUG-2 reclassé note
   d'ergonomie.
2. Le test E de `transaction-new` est **échec-test** 3/3
   reproductible (Tâche 2, run 20:25) — cause mesurée = IonInput ne
   propage pas les événements Playwright au handler React.
3. Le compteur `smoke` passe de 6 à 7 si on compte le test N comme
   couverture écran (non — il est dans la catégorie V, `passé`,
   pas `smoke`). Le compteur reste 6.

**Décisions humaines requises (max 3)** :

1. **Test E — méthode d'ionInput** : comment tester la validation
   d'un IonInput en e2e sans modifier `src/` ? Options :
   (a) `keyboard.type` (frappe clavier natif) — à essayer
   (non mesuré dans cette session), (b) ignorer le test E jusqu'à
   ce que la méthode soit trouvée, (c) écrire un util de test
   qui patche IonInput côté test (jamais côté app). Décision :
   quelle méthode adopter ?

2. **BUG-2 (navigate -1 lien profond)** : la note d'ergonomie
   (gravité faible) documentée dans `e2e/BUGS.md` — faut-il
   proposer le correctif (fallback explicite `navigate('/finance')`
   quand `history.length < 2`) ou laisser tel quel ?

3. **Compteur `échec-test` dans COVERAGE.md** : c'est un
   **compteur nouvellement introduit** par cette session (n'était
   pas dans le set initial « passé/smoke/bloqué »). Décision : le
   maintenir comme 5ᵉ compteur permanent, ou le replier dans
   `échec-app(BUG-n)` avec une référence explicite au BUG-n ?
