# Receipt — Phase 9 : R89.a corrigé (identifiants de catégories canoniques)

Date : 2026-10-26
Branche : `agent/phase-09-sync-categories`

## Défaut (CRITIQUE) — rappel et preuve
`transactions.category_id` porte une clé étrangère vers `categories(id)`.
Le client écrivait des identifiants littéraux (`cat-dime`, `cat-offrande`, …)
tandis que le serveur ne contenait que `cat-1 … cat-9`. Chaque upload offline
échouait donc en `23503` et **aucune donnée financière ne quittait l'appareil**.

Preuve (avant correctif, transaction annulée) :
```
INSERT INTO categories (...) VALUES ('cat-dime', …);          -- manquant
INSERT INTO transactions (… category_id='cat-dime' …);        -- 23503 REFUSÉ
```
Preuve (après correctif, transaction annulée) :
```
fk_ok = 1   (category_id='cat-dime' résout la FK)
```

## Cause racine
Deux référentiels d'identifiants divergents, sans garde :
- client : `src/packs/church/index.ts` (ids littéraux) ;
- serveur : `cat-1 … cat-9` (seed historique, `cat-1` absent du dépôt).
Aucun test ne détectait la divergence.

## Correctif (minimal, dans le gel)
1. **Source unique** `src/lib/canonicalCategories.ts` (9 catégories, ids +
   clés + libellés + types).
2. **Seed serveur idempotent**
   `supabase/migrations/20261026000006_seed_canonical_categories.sql`
   (`ON CONFLICT (id) DO NOTHING`) + rollback garde-fou (refuse si des
   transactions référencent encore une catégorie).
3. **Pack aligné** : `churchSeedData()` construit ses catégories depuis la
   source unique (plus de divergence picker ↔ écriture).
4. **Call sites** : `versement-service`, `cotisation-service`, `EventDetail`,
   `EventBudgetAdapter`, `EventNew` utilisent `DEFAULT_CATEGORY_ID` /
   `CANONICAL_CATEGORIES` au lieu de littéraux.
5. **Garde anti-dérive** `src/lib/__tests__/canonical-categories-drift.test.ts`
   (4 tests) : la migration, le seed local et la source unique doivent
   coïncider ; le seed serveur doit rester idempotent.

## Preuves
```
$ npx tsc -b --noEmit            → 0
$ pnpm exec vitest run           → 0   1211/1211 (79 fichiers, +4)
$ pnpm run lint                  → 0   0 erreur
$ pnpm run build                 → 0
$ migration appliquée (dev)      → success
$ SELECT count(*) … canonical    → 9 identifiants canoniques présents
$ INSERT tx (cat-dime) … ROLLBACK→ fk_ok = 1   ← la FK résout
```

## Limite assumée (honnêteté R12)
- `categories.id` est une clé primaire **globale** (pas par organisation) :
  les 9 lignes canoniques n'existent qu'une fois et servent toutes les
  organisations. Le correctif définitif (identifiants par organisation, ex.
  `org_id:cat-key`) est proposé séparément (voir PROPOSITIONS).
- **R89.b** (descente / `PSYNC_S2305`) n'est PAS corrigé : il exige un
  déploiement PowerSync Cloud (`PS_ADMIN_TOKEN` absent). Reste une escalade.
- Le test bout-en-bout réel (upload via PowerSync) reste impossible sans
  PowerSync déployé ; la preuve ici est la résolution de la FK côté Postgres.

## Addendum — garde anti-dérive des streams PowerSync (même phase)

`ON_DEMAND_STREAMS` (client) et les streams `auto_subscribe: false`
(`sync-config.yaml`) coïncidaient (12) mais sans garde. Ajout de
`sync-streams-drift.test.ts` (2 tests) qui verrouille l'égalité. Une dérive
laisserait une table vide en silence (ex. `organizations` → « Mes comptes »
vide) ou ferait échouer `subscribe()`.
