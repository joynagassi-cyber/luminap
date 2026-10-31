# Receipt — Phase 11 / PR15 + PR16 : statistiques d'usage anonymisées & centre d'aide étendu

- **Date** : 2026-10-31
- **Branche** : `agent/pr15-16-help-usage`
- **Livrables** : PR15 (« Statistiques d'usage anonymisées », `docs/agent/PROPOSALS.md`,
  catégorie pilotage, P3) et PR16 (« Centre d'aide / tutoriel étendu », catégorie
  adoption, dépend de la Phase 13, P3). Les deux sont regroupés dans **un seul
  lot** (cheap + même zone « aide / insight »).

---

## PART A — PR15 : statistiques d'usage anonymisées

### Problème

Aucun moyen de savoir **quelles fonctionnalités servent réellement** — donc
aucun pilotage produit. La contrainte forte : ne **jamais** collecter de donnée
personnelle (ni identifiant utilisateur, ni organisation, ni nom, ni texte).

### Ce qui a été livré

| Fichier | Rôle |
|---|---|
| `src/lib/usageStats.ts` | **Cœur pur**. Compteurs d'événements d'usage `{ "screen:dashboard": 12 }`. `recordUsage(id)`, `getUsageStats()`, `clearUsageStats()`, `sanitizeUsagePayload()`, `recordScreenUsage(path)`. Persistance `localStorage` (clé `lumina-usage-stats`), **lecture tolérante** (JSON corrompu ⇒ `{}`), **écriture best-effort** (jamais d'exception), carte **bornée** (`MAX_TRACKED_FEATURES = 50`, `MAX_FEATURE_COUNT = 1e6`). |
| `src/App.tsx` | `UsageStatsBridge` : enregistre l'usage des **écrans clés** à chaque navigation (liste blanche, jamais l'URL exhaustive). Non bloquant. |
| `src/pages/SettingsGestion.tsx` | `recordUsage("action:export-json" | "action:export-csv")` au moment de l'export. |
| `src/pages/Health.tsx` | Section « Statistiques d'usage » (lecture seule) : libellés FR, compteurs, état vide FR, bouton « Réinitialiser ». |
| `src/lib/__tests__/usage-stats.test.ts` | 20 tests purs (comptage, bornes, tolérance, anonymat, non-bloquant, kill switch). |
| `src/pages/__tests__/health-usage-stats.test.tsx` | 3 tests jsdom (rendu, libellés, réinitialisation persistée). |

### Anonymat — garanties

1. **Forme d'identifiant stricte** : `^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$`
   (rejette `@`, espaces, majuscules, texte libre).
2. **Liste blanche de namespaces** : seuls `screen` et `action`. Sans elle,
   une clé comme `user:42` ou `email:jean` serait acceptée — c'est le défaut
   corrigé pendant l'implémentation (voir « Non-vacuité »).
3. **`sanitizeUsagePayload`** : ne conserve QUE `{ featureId valide: nombre > 0 }`.
   Appliqué à l'écriture **et** à la lecture, donc un stockage altéré à la main
   (PII injectée) est nettoyé à la relecture.
4. **Aucun horodatage, aucun ordre d'action, aucun lien vers un compte.**

### Kill switch

Drapeau `usage-stats` (`featureFlags`, **fail-open** : absent ⇒ actif). Coupé,
`recordUsage` devient un no-op ; la lecture locale reste possible.

---

## PART B — PR16 : centre d'aide étendu

### Problème

`/help` n'offrait qu'une liste statique ; le tutoriel (Phase 13, 20 sections)
n'était pas interrogeable → adoption limitée.

### Ce qui a été livré

| Fichier | Rôle |
|---|---|
| `src/lib/tutorialContent.ts` | **Source unique** du contenu : `SECTIONS` extraites de `Tutorial.tsx` (`TUTORIAL_SECTIONS`), + primitives pures `normalizeForSearch` (NFD, accents), `sectionHaystack`, `searchSections`, `searchFaq`, + FAQ `HELP_FAQ` (8 Q/A FR). |
| `src/pages/Tutorial.tsx` | Importe désormais `TUTORIAL_SECTIONS` / `SectionData` depuis le module partagé (aucune duplication). |
| `src/pages/Help.tsx` | Barre de recherche (filtre sections **et** FAQ), résultats cliquables → `/tutoriel`, message FR « Aucun résultat », liste « Questions fréquentes ». |
| `src/lib/__tests__/tutorial-search.test.ts` | 16 tests purs (normalisation, filtrage, requête vide = tout, FAQ). |
| `src/pages/__tests__/Help-search.test.tsx` | 8 tests jsdom (rendu, filtre, accents, « Aucun résultat », FAQ). |

### Règle « pas encore lu ≠ vide » (R52)

Le corpus est **statique** (toujours chargé), mais « Aucun résultat » n'est
affiché **que** si la requête est non vide **et** le corpus disponible
(`corpusLoaded`). Une requête vide n'affiche jamais ce message. Test dédié.

---

## Non-vacuité (vérifié, puis restauré)

Chaque mutation a fait passer le test correspondant au **rouge**, puis la source
a été restaurée.

**PR15**

1. Retrait de l'incrément dans `recordUsage` ⇒ **5 tests** de
   `usage-stats.test.ts` échouent.
2. Retrait du filtre de namespace (`isValidFeatureId` n'exigeait que le motif) ⇒
   `sanitizeUsagePayload` conserve `user:42` ⇒ test « nettoyage » échoue.
   *(défaut réellement observé et corrigé pendant l'implémentation)*
3. Remplacement de `{usageEntries.length === 0 ? …}` par `{true ? …}` dans
   `Health.tsx` ⇒ **2 tests** de `health-usage-stats.test.tsx` échouent.
4. Retrait de `clearUsageStats()` de `resetUsage` ⇒ le test « Réinitialiser »
   échoue sur l'assertion de persistance (`getUsageStats() === {}`).

**PR16**

5. Retrait de `.normalize("NFD").replace(/[\u0300-\u036f]/g, "")` ⇒ **3 tests**
   échouent (dont « insensible aux accents »).
6. Remplacement du `return sections.filter(...)` de `searchSections` par
   `return sections` ⇒ **2 tests** échouent (le filtrage disparaît).
7. Rendre `matchedSections` toujours égal à `TUTORIAL_SECTIONS` dans `Help.tsx`
   ⇒ **3 tests** de `Help-search.test.tsx` échouent.
8. Ne jamais rendre la liste FAQ (`matchedFaq.length > 0` → `false`) ⇒
   **3 tests** échouent (dont « FAQ rendue »).

> Note mesurée : retirer la seule garde `if (!q) return sections;` n'est **pas**
> observable (une aiguille vide matche tout) — ce n'est donc pas retenu comme
> preuve de non-vacuité ; la preuve 6 couvre réellement le filtrage.

---

## Gates

- `npx tsc -b --force --noEmit` : **OK** (exit 0)
- `npm run lint` : **OK** (0 erreur ; warnings pré-existants inchangés)
- `npx vitest run` : **OK** — 172 fichiers, 1842 passed | 6 skipped
- `npm run build` : **OK** (exit 0)

---

## Limites

- PR15 **n'envoie rien** hors de l'appareil : le module fournit
  `sanitizeUsagePayload` (le seul payload exportable serait `{ featureId: count }`),
  mais aucun transport distant n'est câblé (pas de dépendance télémétrie). C'est
  volontaire : la feature est utile localement (pilotage via l'écran Santé) sans
  ouvrir de flux réseau.
- PR16 réutilise le contenu du tutoriel ; les FAQ **par écran** restent dans
  leurs sections, la FAQ du centre d'aide est **transversale** (8 questions).
