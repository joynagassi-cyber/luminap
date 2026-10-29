# Receipt — R129 : P0 « écran muet » (audience JWT PowerSync refusée)

**Date** : 2026-10-29
**Branche** : `fix/powersync-replication-r80` (PR #115)
**Priorité** : P0 (toute l'app bloquée sur squelettes de chargement)

## 1. Symptôme

Pour tout utilisateur connecté, les pages restaient sur un **squelette de
chargement perpétuel** (écran muet) : `/members`, `/events`, `/reports`,
`/finance`, `/sessions`, `/forms`… Les specs Cypress « cloud » échouaient sur
`Expected to find element: h1, h2, h3` (le contenu réel n'était jamais rendu).

## 2. Cause racine (mesurée, reproductible)

L'instance PowerSync Production (`6a9dd96302481fb31b945823`) **rejette tout
jeton d'utilisateur Supabase** :

```
POST /sync/stream  (JWT utilisateur réel, ES256, kid=e6d0da61-…)
→ 401 PSYNC_S2105 — Unexpected "aud" claim value: "authenticated"
```

Supabase **impose** `aud: "authenticated"`. Le service config déclare un
collecteur JWKS **explicite** (`client_auth.jwks_uri`) **sans**
`requiresAudience`. Lecture du code du service PowerSync :

- `KeyStore.verifyJwt` : `audiences = keyOptions.requiresAudience ?? options.defaultAudiences` ;
- `compound-config-collector.ts` : `defaultAudiences = client_auth.audience` ;
- le collecteur **Supabase auto-dérivé** (hostname de réplication) porte
  `requiresAudience: ["authenticated"]` (`StaticSupabaseKeyCollector`), mais le
  collecteur JWKS **explicite** (même URL, même `kid`) le **masque** lors de la
  sélection de clé (`getCachedKey` renvoie la 1ʳᵉ clé de `kid` correspondant).

Avec `additional_audiences: []` → **aucune audience autorisée** → rejet de
chaque jeton.

## 3. Chaîne d'impact (pourquoi un « écran muet »)

PowerSync jamais `connected` → `markPowerSyncReady()` jamais appelé →
`_psReady = false` → les pages gardent leur contenu derrière
`isPowerSyncReadyNow()` (famille R52, **voulu** : ne pas afficher un verdict
vide faux) → **squelette perpétuel**.

## 4. Preuves

| Sonde | Résultat |
|---|---|
| `POST /sync/stream` (JWT utilisateur réel) | **401 PSYNC_S2105** |
| corps invalide + jeton bidon | `400 FST_ERR_CTP_INVALID_JSON_BODY` (parseur avant auth → un 400 ne prouve rien) |
| jeton legacy HS256 | `401 PSYNC_S2101` (clé absente) |
| navigateur `__psDb.currentStatus.dataFlow.downloadError` | `PSYNC_S2105` |
| `/members` (`data-screen-state`) | `loading` (jamais `ready`) |

**Convergence indépendante** : 2 agents Cloud ont isolé la même cause
(PRs #116 et #117, non fusionnées).

## 5. Correctifs

### (a) Config (dépôt — déploiement par le propriétaire, cf. E5)
`powersync/service.yaml` : `client_auth.additional_audiences: ["authenticated"]`.
Après `powersync deploy service-config`, `POST /sync/stream` doit répondre
**200** et les specs « cloud » redevenir lisibles.

### (b) Produit — filet de sécurité « zéro écran muet » (livré, borné)
Ne dépend pas du déploiement ; garantit qu'aucune page ne reste muette :

1. `src/lib/dataLayer.ts` :
   - état `_psUnavailable` + `markPowerSyncUnavailable()` +
     `subscribePowerSyncUnavailable()` + `isPowerSyncUnavailableNow()` ;
   - `useReplicaUnavailable()` (hook réactif) ;
   - **borne de disponibilité** (30 s) dans `usePowerSyncStatus` : si la
     réplique n'est pas prête, elle est déclarée indisponible.
2. `src/components/SyncUnavailableBanner.tsx` (monté dans `App.tsx`) :
   au-delà de la borne, affiche « Synchronisation indisponible… » +
   bouton « Réessayer » (reconnexion best-effort), **hors** du flux de route
   (n'altère pas `data-screen-state`).

## 6. Vérification

| Gate | Résultat |
|---|---|
| `npx tsc -b --force` | **0 erreur** |
| `npx eslint` (fichiers touchés) | **0 erreur** |
| `npx vitest run` | **1647/1647** (dont 4 nouveaux tests) |
| Crawler P0 `zero-black-screen.cy.ts` | **64/64** |
| Specs offline (`local-smoke`, `local-dashboard`, `nav-bottom`) | **8/8** |
| Bannière prouvée en réel | spec dédié : `[data-sync-unavailable="true"]` visible en **45 s** |

Non-vacuité : sans `markPowerSyncUnavailable`/bannière, les tests échouent.

## 7. Action propriétaire (E5)

Déployer le service config (`PS_ADMIN_TOKEN` requis, absent de cet
environnement) puis re-mesurer. Le filet produit (b) protège les utilisateurs
dès maintenant.
