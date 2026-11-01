# Receipt — R12 : client Supabase unique (fin du « Multiple GoTrueClient »)

- **Date** : 2026-10-31
- **Branche** : `agent/r140-audit-append-only`

## Défaut

Deux `createClient` coexistaient :

1. `src/lib/auth.ts` — propriétaire de la session persistée
   (`persistSession:true`, `autoRefreshToken:true`, `flowType:"pkce"`).
2. `src/integrations/supabase/client.ts` — client **sans options d'auth**,
   partageant la même clé `sb-<ref>-auth-token`.

Deux `GoTrueClient` sur la même clé de stockage → warning
« Multiple GoTrueClient instances detected » et **course possible** sur la
session (le client « aveugle » pouvait rafraîchir/écrire la même clé).

## Correctif

`src/integrations/supabase/client.ts` **ré-exporte** l'instance unique :

```ts
export { supabase } from "@/lib/auth";
```

Aucun import circulaire (le module est une feuille). `SupabaseConnector` reste
un client **non persistant** (`persistSession:false`, `autoRefreshToken:false`)
→ il ne revendique pas la clé de session, donc pas de conflit.

## Preuve

- `npx tsc -b` → **0**.
- Importateurs vérifiés : `storageService.ts` (Storage), `orgBootstrap.ts`
  (`auth.getSession` + `functions.invoke`), `SettingsPersonalisation.tsx`
  (Storage) — compilent et 24 tests associés passent.

## Garde anti-récurrence

`src/lib/__tests__/supabase-single-client-guard.test.ts` (3 tests) :
- interdit `createClient(` dans `integrations/supabase/client.ts` ;
- exige `persistSession:true` + `autoRefreshToken:true` dans `auth.ts` ;
- si `SupabaseConnector` crée un client, exige la non-persistance.

## Limite assumée

Le warning est **runtime** (navigateur) ; non reproductible en CI sans exécution
réelle (cf. R98). Le correctif est vérifié statiquement (graphe d'imports +
garde).

## Gates

- `npx tsc -b` → **0** ; `npx vitest run` → **1757/1757** (162 fichiers)
