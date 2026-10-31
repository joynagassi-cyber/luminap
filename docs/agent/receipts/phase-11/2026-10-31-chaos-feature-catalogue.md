# Phase 11 — catalogue de chaos ÉTENDU : toutes les fonctionnalités

- **Date** : 2026-10-31
- **Branche** : `agent/cypress-green`
- **Priorité** : P2 (robustesse ; contrat Phase 11 §5.4 « catalogue de chaos »)
- **Statut** : terminé (portes vertes, non-vacuité prouvée)
- **Périmètre** : tests + ce receipt + **un correctif applicatif de 1 ligne**
  (`featureFlags.parseFlags`, défaut réel trouvé par le chaos).

## Contexte

Le catalogue initial (`2026-10-28-chaos-offline-resilience.md`) couvrait la
résilience **hors-ligne / stockage** (5 scénarios). La directive exige un
catalogue de chaos sur **toutes** les fonctionnalités. Ce second catalogue
couvre les domaines produit restants.

## Livrable

`src/lib/__tests__/chaos-feature-catalogue.test.ts` — **38 tests** (purs, sans
mock), couvrant **7 domaines** supplémentaires (chaos 6 → 12).

| # | Domaine | Entrée de panne injectée | Dégradation contrôlée vérifiée |
|---|---|---|---|
| 6 | Rapports financiers | transaction sans montant / type inconnu / date invalide ; documents non-tableau ; entrée vide | totaux finis (jamais `NaN`), type inconnu ≠ dépense, rapport bien formé |
| 7 | Cotisations / cultes | dates limites (30 j), paiement partiel, statut d'avance | verrouillage exact, `don` jamais négatif, arithmétique entière, stats cohérentes |
| 8 | Export / sauvegarde | formule `=cmd`/`+`/`@` dans une valeur, entité non-tableau, aller-retour JSON | injection neutralisée, `[]` de repli, JSON relisible, nom de fichier sans PII |
| 9 | Fédération d'orgs | cycle direct, cycle transitif, **données déjà cycliques**, chaîne de 200, 500 enfants | détection exacte, terminaison garantie (garde anti-boucle), profondeur/largeur justes |
| 10 | Entrées hostiles | XSS stocké, évasion CSS `</style>`, NUL/ESC, 100 000 caractères | texte inerte, valeur CSS assainie, plafond de longueur (anti-DoS de rendu) |
| 11 | Configuration corrompue | JSON invalide, littéral `null`, type inattendu, version invalide | fail-open/fail-safe : aucun drapeau, aucun blocage, repli jsonb |
| 12 | Concurrence / idempotence | rejeu d'op, échec partiel de récupération, 10 000 lignes | échappement stable (pas de double apostrophe), rechargement best-effort, agrégat exact |

## Défaut réel trouvé et corrigé — `parseFlags("null")` lève

**Localisation** : `src/lib/featureFlags.ts`, `parseFlags()`.

**Contrat déclaré** (en-tête du module) : « Parse un objet de drapeaux en
ignorant toute entrée non booléenne (**fail-open**) ».

**Code fautif** :

```ts
obj = JSON.parse(trimmed);          // "null" → null (typeof "object")
...
if (typeof obj !== "object" || Array.isArray(obj)) return {};
//   null est typeof "object" et non-tableau → passe la garde
for (const [key, value] of Object.entries(obj)) { … }  // ← lève
```

**Reproduction mesurée** (test chaos 11, avant correctif) :

```
TypeError: Cannot convert undefined or null to object
 ❯ parseFlags src/lib/featureFlags.ts:45:37
```

**Impact** : `lumina-flags` contenant littéralement `null` (quota tronqué,
écriture interrompue, surcharge locale corrompue) fait **lever** `parseFlags`.
Appelé via `localFlags()` dans `isFeatureEnabled()` au rendu, il remplace le
composant consommateur par l'`ErrorBoundary` de route → page en erreur, alors
que le contrat exige une dégradation (aucun drapeau → tout ACTIF).

**Correctif** (1 ligne) : garde explicite `obj === null`.

```ts
if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return {};
```

**Test de non-régression ajouté** : `feature-flags.test.ts` →
« littéral JSON `null` → aucun drapeau (jamais d'exception) » (couvre aussi
`null`/`undefined` directs). L'ancien test ne vérifiait que `"{oops"`
(JSON invalide), qui lève **dans le `try`** et est donc attrapé — le cas
`"null"` passait sous le radar.

## Non-vacuité (preuve)

- Le test chaos 11 « drapeaux JSON corrompus » a **échoué au premier run**
  (`TypeError`), puis est passé après le correctif : le test exerce bien le
  chemin réel, il n'est pas tautologique.
- Le test « arbre PROFOND (200) » a également échoué au premier run (hypothèse
  erronée de ma part sur l'inclusion du nœud racine) → assertion corrigée
  après vérification du comportement réel de `computeDescendants`.

## Portes (avant conclusion)

| Commande | Résultat | Code de sortie |
|---|---|---|
| `npx tsc -b --force` | 0 erreur | **0** |
| `npx eslint <fichiers modifiés>` | 0 erreur (warnings `any` préexistants) | **0** |
| `npx vitest run` | **1840 passés** (avant : 1801 ; +39), 0 échec | **0** |

## Honnêteté (R12)

- `[Prouvé]` : les 7 domaines passent sur le **vrai** chemin de code (fonctions
  pures, aucun mock).
- `[Prouvé]` : la non-vacuité (deux tests rouges au premier run, journal
  ci-dessus).
- `[Prouvé]` : le défaut `parseFlags("null")` (message d'erreur mesuré).
- `[Non couvert ici]` : le rendu React sous panne de `useAppConfig` reste
  documenté non corrigé (hors périmètre de cette passe ; cf. catalogue initial).

## Non-objectifs

- Aucune modification de `docs/agent/PROGRESS.md`.
- Le défaut `useAppConfig` (JSON corrompu → throw) reste documenté, non corrigé
  (il appartient au périmètre du catalogue initial, qui le fige volontairement).

---

_Créé par un agent IA (OpenHands) pour le compte du propriétaire._
