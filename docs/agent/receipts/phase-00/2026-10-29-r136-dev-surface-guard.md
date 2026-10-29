# Receipt — R136 : garde anti-fuite de la surface de diagnostic PowerSync

- **Date** : 2026-10-29
- **Branche** : `agent/r136-dev-surface-guard`
- **Classe** : exposition conditionnelle non gardée + rectificatif documentaire
  (R85 périmé).

## Défaut

`publishDevDiagnostics()` (`src/lib/powersync/index.ts`) écrit sur `window` :

| Global | Nature |
|---|---|
| `__psDb` | handle PowerSyncDatabase |
| `__psConnector` | connector Supabase |
| `__psSupabaseClient` | **client Supabase** (écritures avec la session user) |
| `__psFlushCrudUpload` | déclencheur d'upload de la file |

La **seule** protection est `if (!import.meta.env.DEV) return;`. Aucune garde ne
vérifiait que cette ligne reste en tête, ni qu'aucun autre site n'écrit ces
globals. Une perte lors d'un refactor aurait exposé un client Supabase en
production, silencieusement.

## Correctif

`src/lib/__tests__/powersync-dev-surface-guard.test.ts` (2) :

1. la garde `DEV` existe **et précède** toute écriture des 4 globals (chacun
   défini après le `return` anticipé) ;
2. aucun autre fichier source n'écrit ces globals (`win.<g> =` / `window.<g> =`).

## Gates (mesurés localement)

| Gate | Commande | Sortie | Extrait |
|---|---|---|---|
| Garde R136 | `vitest run powersync-dev-surface-guard` | **0** | `2 passed` |
| Non-vacuité (mutation) | neutralisation de `if (!import.meta.env.DEV) return;` | **1 failed** | `garde … introuvable dans publishDevDiagnostics` |

## Rectificatif annexe (R85 — honnêteté R12)

R85 (étape 4) affirmait que `window.__psConnector` restait « à exposer
(modification produit ~3 lignes, à confirmer) ». **Faux aujourd'hui** :
`window.__psConnector = _connector` est présent depuis `d86d12b` (`git log -S`).
Étape 4 de R85 corrigée inline.

## Risque résiduel

- Résidu réel de R85 inchangé : **environnemental** (worker WASM PowerSync non
  fiable en headless → la file ne peut être vidée par aucun test headless).
  Hors périmètre.
