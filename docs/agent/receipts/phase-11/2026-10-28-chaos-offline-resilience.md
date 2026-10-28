# Phase 11 — catalogue de chaos : résilience hors-ligne / stockage

- **Date** : 2026-10-28
- **Branche** : `agent/phase-11-chaos-offline`
- **Priorité** : P2 (robustesse ; contrat Phase 11 §5.4 « catalogue de chaos »)
- **Statut** : terminé (portes vertes, non-vacuité prouvée)
- **Périmètre** : **tests + ce receipt uniquement**. Aucun code applicatif
  modifié (conforme à la consigne : un défaut trouvé est documenté, pas corrigé).

## Livrable

`src/lib/__tests__/chaos-offline-resilience.test.ts` — **13 tests** (jsdom),
couvrant **5 scénarios** du catalogue de chaos (le contrat en exige ≥ 4).

Mocks limités aux **frontières de plateforme** (jamais la logique testée) :

| Frontière mockée | Raison |
|---|---|
| `@supabase/supabase-js` | transport réseau (le vrai exige un serveur) |
| `@/lib/powersync` | handle SQLite/WASM non instanciable en jsdom |
| `@/lib/auth` | singleton Supabase non montable hors navigateur |
| `@/store/useLocalStore` | store Zustand (effet de rendu, hors sujet) |

La logique exercée est **réelle** : `parseJsonbValue`, `loadOnboardingState`,
`getStoredThemeId` / `persistThemeId`, `ensureLocalDataOwnedBy`, `orgContext`
(réactivité mémoire), `SupabaseConnector.pushCrudTransaction` (garde FATAL),
`usePowerSyncIndicator`.

## Scénarios couverts

1. **Base locale corrompue** — dégradation contrôlée :
   - `parseJsonbValue("[{", [])` ne lève pas et renvoie le repli ;
   - `loadOnboardingState` sur JSON corrompu → état par défaut ;
   - `getStoredThemeId` sur `getItem` qui lève → `null` ;
   - `persistThemeId` sur `setItem` qui lève → pas d'exception ;
   - **[DÉFAUT DOCUMENTÉ]** `useAppConfig` (voir ci-dessous).
2. **Changement d'utilisateur** — aspect **non couvert** par
   `local-data-ownership.test.ts` : le contexte d'organisation **en mémoire**.
   `ensureLocalDataOwnedBy("user-b")` après A purge le stockage **ET** oublie
   l'org en mémoire (`hasResolvedOrganization()` → `false`). Même compte → no-op
   (l'org mémoire est préservée).
3. **Droit révoqué hors-ligne** — `pushCrudTransaction` :
   - `42501` (RLS) → op **jetée** (`continue`), `transaction.complete()`
     appelé (la file avance, pas de blocage), échec journalisé en `warn` ;
   - classe `23` (contrainte) → idem FATAL ;
   - erreur réseau `503` (non-FATAL) → **re-throw** pour retry,
     `complete()` **non** appelé (l'op reste en file).
4. **Mutation dupliquée / double écriture** — idempotence : rejouer la même op
   (même `id`) produit 2 upserts identiques ciblant `onConflict: "id"` (PK
   PowerSync). Caractérisation R3 : la garde d'idempotence **existe** au niveau
   transport (upsert par PK), pas de double comptage côté base.
5. **Offline long** — `usePowerSyncIndicator` : une erreur pendant l'offline
   (`syncError` non nul, `online=false`) **se rétablit** à `syncError=null` /
   `online=true` après reconnexion (état non bloqué) ; un statut neutre
   n'invente pas d'erreur.

## Non-vacuité (preuve de mutation)

Scénario 3, 1er test. Mutation appliquée : l'assertion
`expect(tx.complete).toHaveBeenCalledTimes(1)` remplacée par `…(0)` (assertion
inversée). Résultat — le test **échoue**, donc il teste bien quelque chose :

```
FAIL  chaos 3 … > 42501 (RLS) : l'op est jetée, la transaction avance …
AssertionError: expected "vi.fn()" to be called +0 times, but got 1 times
 ❯ chaos-offline-resilience.test.ts:257:25
 Test Files  1 failed (1)
      Tests  1 failed | 12 passed (13)
```

Fichier restauré ensuite → **13/13 verts**. (Copie de restauration :
`/tmp/chaos-backup.ts`, hors dépôt.)

## Défaut réel documenté (non corrigé) — `useAppConfig` ne dégrade pas

**Localisation** : `src/lib/dataLayer.ts`, `useAppConfig()` (~l. 2931).

**Code fautif** :

```ts
useEffect(() => {
  const stored = localStorage.getItem("lumina-config");
  if (stored) {
    setConfig(JSON.parse(stored));   // ← JSON.parse NON gardé
  }
}, []);
```

**Reproduction** (déjà figée par le test « [DÉFAUT DOCUMENTÉ] ») :

```ts
localStorage.setItem("lumina-config", "{pas du json");
renderHook(() => useAppConfig());   // → SyntaxError (JSON.parse)
```

Sortie mesurée en jsdom :

```
useAppConfig threw: Expected property name or '}' in JSON at position 1 (line 1 column 2)
```

**Impact** : `lumina-config` corrompu (quota tronqué, écriture interrompue,
migration partielle) fait **lever** le hook pendant le rendu. Le composant
consommateur (`TopHeader`, `Dashboard`, `SettingsProfile`, `FeatureSidebar`)
est alors remplacé par l'`ErrorBoundary` de route (`lazy-route.tsx`) → page
entière en erreur, alors que la consigne de chaos exige une **dégradation
contrôlée**. C'est la même classe de défaut que `boot-storage-resilience`
(lectures de boot non gardées), mais sur le chemin **applicatif** (après
montage), donc hors du périmètre du correctif de boot précédent.

**Comportement attendu (non implémenté ici)** : envelopper le `JSON.parse` dans
un `try/catch` et retomber sur la config par défaut (comme `loadOnboardingState`
/ `getStoredThemeId` le font déjà). Non corrigé : la consigne interdit de
modifier le code applicatif dans cette tâche. Le test fige le comportement
**actuel** pour rendre le défaut visible et reproductible ; il devra être
inversé (`not.toThrow()`) le jour du correctif.

## Portes (avant conclusion)

| Commande | Résultat | Code de sortie |
|---|---|---|
| `npx tsc -b` | 0 erreur | **0** |
| `npx eslint src/` | 0 erreur (1642 warnings préexistants) | **0** |
| `npx vitest run` | 1479 passés, 6 ignorés (116 fichiers) | **0** |

Environnement : Node v24.21.0, pnpm 11.27.1, `.env.local` local (gitignoré)
posé pour satisfaire les gardes `import.meta.env` (cf. piège mémoire « worktrees
isolés n'ont pas `.env.local` »).

## Honnêteté (R12)

- `[Prouvé]` : les 5 scénarios passent sur le **vrai** chemin de code (mocks
  aux frontières seulement).
- `[Prouvé]` : la non-vacuité du scénario 3 (journal du run rouge ci-dessus).
- `[Prouvé]` : le défaut `useAppConfig` (reproduction + message d'erreur mesuré).
- `[Non prouvé ici]` : la persistance SQLite réelle / le worker WASM PowerSync
  (non exécutables en jsdom) — couverts par les specs Cypress `cloud-sync`.

## Non-objectifs

- Aucune correction applicative (consigne explicite) : le défaut
  `useAppConfig` est documenté, pas réglé.
- `docs/agent/PROGRESS.md` et `docs/agent/COVERAGE_MATRIX.md` non modifiés.
- Déploiement PowerSync (E1) et suite Cypress (E2/R98) : hors périmètre.

---

_Créé par un agent IA (OpenHands) pour le compte du propriétaire._
