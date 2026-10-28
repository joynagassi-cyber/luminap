# Receipt — Phase 08 : R115 — surface RPC des fonctions de trigger refermée

- **Date** : 2026-10-28
- **Branche** : `agent/phase-08-r115-trigger-rpc-surface`
- **Risque** : R115 (durcissement R103 contourné par 2 migrations ultérieures)
  → CORRIGÉ.

## Défaut visé (classe, pas instance)

Une migration qui **recrée** une fonction de trigger (ou la fonction de
règlement) hors du chemin de durcissement R103 **rouvre** la surface RPC. Le
test anti-régression R103 existant ne pouvait pas le voir : il **concatène**
toutes les migrations et cherche un motif *quelque part* — il ne modélise pas
l'**ordre**, donc une migration ultérieure qui régresse l'état reste invisible.

## Les deux instances (mesurées le 2026-10-28, base dev `hhgovvrnalibhgpakswi`)

| # | Fonction | Migration | Constat |
|---|---|---|---|
| A | `denorm_child_org_id`, `denorm_cascade_org_id` | `20261027000001` | créées **après** le balayage générique `20261026000005` → `SECURITY DEFINER` + `has_function_privilege('anon', oid, 'EXECUTE') = true` |
| B | `settle_invitation_claim` | `20261027000011` | recréée depuis le corps **pré-R103** (`20261024000004`) → garde `pg_trigger_depth() = 0` **perdue** |

Preuve advisor avant : `anon_security_definer_function_executable` = **3**
(denorm ×2 + `keep_alive_ping`).

## Exploitabilité — mesure honnête (R12)

Un appel direct d'une fonction `RETURNS trigger` est refusé par PostgreSQL
lui-même :

```
set local role anon;
select public.denorm_cascade_org_id();
-- ERROR 0A000: trigger functions can only be called as triggers
```

→ La surface (A) **n'est pas** une vulnérabilité exploitable (faux positif de
la classe R97). Pour (B), le `REVOKE EXECUTE` de R103 tenait toujours
(`42501 permission denied for function settle_invitation_claim`), donc
l'escalade n'était **pas** rouverte — seule la défense en profondeur (2e
niveau) l'était.

Le correctif est néanmoins appliqué : cohérence avec R103, et protection contre
un futur `GRANT EXECUTE` / `SECURITY INVOKER` qui rendrait (A) réel.

## Correctif

`supabase/migrations/20261028000001_harden_trigger_function_rpc_surface.sql`

1. `CREATE OR REPLACE FUNCTION settle_invitation_claim` — corps **identique** à
   `20261027000011` (org_id dans l'INSERT des grants), seule la garde
   `pg_trigger_depth() = 0` est ré-ajoutée ;
2. `REVOKE EXECUTE … FROM PUBLIC` puis `… FROM anon, authenticated` (la
   redéfinition réinitialise les privilèges par défaut) ;
3. rejoue le **balayage générique** (DO block `prorettype = 'trigger'`,
   idempotent) → referme toute fonction de trigger définie jusqu'ici.

Rollback : `rollback/20261028000001_rollback.sql` (réouvre la surface).

## Preuves après (mesurées en base)

| Contrôle | Résultat |
|---|---|
| `count(*)` fonctions de trigger exécutables par anon/authenticated | **0** |
| Appel direct `settle_invitation_claim('0000…')` (rôle `postgres`) | `42501 settle_invitation_claim: appel direct interdit` |
| **Flux légitime** (INSERT invitation + INSERT claim, tx annulée) | `claim=CONFIRMED, used_count=1` — la garde ne casse pas le trigger |
| Advisor `anon_…` | **3 → 1** (`keep_alive_ping` seul, volontaire : endpoint anti-pause public) |
| Advisor `authenticated_…` | **9 → 7** |
| Résidus (invitations de test / claims orphelins) | **0 / 0** |

## Garde anti-régression (le vrai correctif de classe)

`src/lib/__tests__/revoke-trigger-functions.test.ts` (4 tests) : rejoue les
migrations **dans l'ordre** (événements `create` / `sweep` / `revoke`) et
modélise l'état final :

- une redéfinition de fonction de trigger **réinitialise** ses privilèges
  (donc « non révoquée ») ;
- un balayage générique révoque tout ce qui est défini **jusqu'ici** ;
- un `REVOKE … ON FUNCTION public.X` révoque X.

Invariants : aucune fonction de trigger `SECURITY DEFINER` non révoquée ; la
**dernière** définition de `settle_invitation_claim` porte `pg_trigger_depth()`.

**Non-vacuité prouvée** : sans `20261028000001` → **3/4 échecs** ; avec → **4/4**.

## Gates

- `npx vitest run` : suite complète (voir PROGRESS.md).
- `npx tsc -b` : 0 erreur.
- `eslint` : 0 erreur.
