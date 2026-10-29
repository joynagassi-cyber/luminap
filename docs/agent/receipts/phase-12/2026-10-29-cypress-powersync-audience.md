# Receipt — Phase 12 : cause racine des specs Cypress « cloud » (audience JWT PowerSync)

- **Date** : 2026-10-29
- **Branche** : `fix/cypress-sync-infra`
- **Objet** : la suite Cypress E2E « cloud » ne peut pas être verte — cause racine
  **infrastructure**, hors code applicatif. Ce receipt documente la preuve et le
  correctif à déployer (décision propriétaire).

## Verdict en une ligne

**La réplication PowerSync est réparée (R80), mais l'instance Production
`6a9dd96302481fb31b945823` rejette TOUT jeton d'utilisateur Supabase avec
`401 PSYNC_S2105 — Unexpected "aud" claim value: "authenticated"`.** Tant que
ce réglage n'est pas corrigé côté PowerSync Cloud, **toute** spec qui dépend
d'une vraie réplique (lecture de `profiles`, `organizations`, `events`,
`members`, `form_definitions`, …) échoue — quel que soit le code de l'app.

## Preuve reproductible (agent → PowerSync, hors navigateur)

```bash
# 1) Jeton utilisateur RÉEL (compte org E2E, identifiants fournis par le propriétaire)
TOKEN=$(curl -s -X POST \
  "https://hhgovvrnalibhgpakswi.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh" \
  -H "Content-Type: application/json" \
  -d '{"email":"lumina-org-e2e@lumina.dev","password":"E2e-Lumina!1"}' | jq -r .access_token)

# 2) Corps de sync VALIDE (forme qui passe l'authentification sur une instance saine)
curl -s -o - -w " [%{http_code}]\n" -X POST \
  "https://6a9dd96302481fb31b945823.powersync.journeyapps.com/sync/stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"streams":{"subscriptions":[]}}'
```

Résultat (mesuré 5×, déterministe) :

```
[401] {"error":{"code":"PSYNC_S2105","status":401,
       "description":"Unexpected \"aud\" claim value: \"authenticated\"",
       "name":"AuthorizationError"}}
```

Le jeton est **valide et signé** (clés asymétriques ES256, JWKS public) :

```
claims: {"aud":"authenticated","iss":"https://hhgovvrnalibhgpakswi.supabase.co/auth/v1",
         "role":"authenticated","exp":…,"sub":"87afea21-…"}
header: {"alg":"ES256","kid":"e6d0da61-2e90-4a90-ad9c-b034f6aa78b9","typ":"JWT"}
JWKS:   kid=e6d0da61-… alg=ES256  (https://…/.well-known/jwks.json)
```

Preuves complémentaires :

| Sonde | Résultat | Interprétation |
|---|---|---|
| Corps **invalide** (`not-json`) + jeton bidon | `400 FST_ERR_CTP_INVALID_JSON_BODY` | le parseur de corps répond **avant** l'auth → un 400 ne prouve pas que l'auth passe |
| Corps **valide** + jeton utilisateur réel | `401 PSYNC_S2105` (aud) | l'auth est bien évaluée et rejette sur l'`aud` |
| Jeton legacy HS256 (`anon`, `aud=authenticated`) | `401 PSYNC_S2101` (kid introuvable) | l'instance utilise les **clés asymétriques**, pas le secret legacy |
| Aucun jeton | `401 PSYNC_S2106` (auth requise) | comportement nominal |
| Jeton non-JWT | `401 PSYNC_S2101` (malformé) | comportement nominal |

## Cause racine

Le service config **déployé** sur l'instance a `additional_audiences: []` et
n'accepte donc pas l'audience `authenticated` que Supabase émet pour les
jetons d'utilisateur. La doc PowerSync est explicite :

> **`PSYNC_S2105` : JWT payload is missing a required claim "aud"** — « This
> error occurs when using manual JWKS configuration without specifying an
> audience. **Add `authenticated` to your audience configuration.** »
> <https://docs.powersync.com/configuration/auth/supabase-auth>

Le fichier versionné `powersync/service.yaml` (source de vérité) porte la même
lacune (ligne 36) :

```yaml
client_auth:
  supabase: true
  supabase_jwt_secret:
    secret_ref: supabase_jwt_secret
  additional_audiences: []      # ← doit contenir "authenticated"
  allow_temporary_tokens: true
```

Le schéma du service config confirme que `additional_audiences` est bien
« Additional valid audiences for JWT validation » (tableau de chaînes).

## Impact sur la suite Cypress (mesuré en local, xvfb, spec par spec)

Le serveur de dev est vert pour ce qui **ne dépend pas** de PowerSync
(`local-dashboard.cy.ts` → **2/2**) ; tout ce qui lit la réplique échoue :

| Spec | Résultat mesuré | Échec |
|---|---|---|
| `sessions.cy.ts` | 0 passing / 3 failing | `button[aria-label^="Re-ouvrir"]` jamais trouvé → `listUserOrgs` lit la table `organizations` **vide** (réplique jamais peuplée) |
| `members.cy.ts` | 1 passing / 2 failing | `h1,h2,h3` jamais trouvé → `/members` reste sur `MembersSkeleton` (garde `isPowerSyncReadyNow()` = `false`) |
| `forms-v2.cy.ts` | 0 passing / 1 failing | `Expected to find content: 'E2e Forms v2'` |
| `persistence.cy.ts` | 0 passing / 1 failing | `Expected to find content: 'Event Persist F5'` |
| `cross-tenant.cy.ts` | 0 passing / 1 failing | `au moins une page visible: expected 0 to be above 0` |
| `local-dashboard.cy.ts` (offline, sans cloud) | **2 passing** | — (témoin : l'app est saine hors réplique) |

L'app **ne reçoit jamais** de données : la base locale SQLite reste vide, donc
les gardes `isPowerSyncReadyNow()` (R52.m) affichent correctement des squelettes
au lieu de verdicts vides faux — mais les specs attendent des données réelles.
La trace du dev server est sans ambiguïté (79 occurrences en un run) :

```
[PowerSync]: Could not POST streaming to /sync/stream - 401 - Unauthorized:
{"error":{"code":"PSYNC_S2105","status":401,
 "description":"Unexpected \"aud\" claim value: \"authenticated\""}}
```

## Correctif (à déployer par le propriétaire)

L'`aud` du jeton est **imposé par Supabase** (`authenticated`) : la seule
correction est côté PowerSync. Deux voies équivalentes :

1. **Tableau de bord** — Client Auth → *Use Supabase Auth* décoché si l'on est
   en JWKS manuel → JWKS URI = `https://hhgovvrnalibhgpakswi.supabase.co/auth/v1/.well-known/jwks.json`
   → **Add `authenticated` as an accepted JWT Audience** → Save and Deploy.
2. **CLI** — appliquer `docs/agent/patches/powersync-service-audience.patch`
   (ajoute `authenticated` à `additional_audiences`) puis
   `powersync deploy service-config`.

> Le fichier `powersync/service.yaml` **n'a pas été modifié** dans cette PR
> (interdiction explicite : config déployée). Le correctif est livré sous forme
> de patch + consignes, prêt à déployer.

## Ce qui n'est PAS en cause (hypothèses testées et écartées)

- **Réplication arrêtée** : réparée (R80). Ce n'est plus la cause.
- **Mot de passe `postgres` rotaté** : concernait la réplication (réparée),
  pas l'auth client.
- **`sync-config.yaml` (streams, R80)** : hors sujet — le rejet est sur l'`aud`
  du JWT, avant toute évaluation de stream.
- **Code applicatif** : `SupabaseConnector.fetchCredentials()` renvoie bien
  `{ endpoint, token: session.access_token }` ; le jeton envoyé est correct.
- **Bug de sélecteur de spec** : non — les specs attendent des données que la
  réplique ne peut pas fournir.

## Suite

- Bloquant **propriétaire** (jeton admin PowerSync / accès tableau de bord).
- Après déploiement, re-mesurer : `sessions`, `members`, `forms-v2`,
  `persistence`, `cross-tenant` doivent passer **sans modification de spec**.
- Aucune modification de `cypress/support/*` n'a été nécessaire (l'infra de
  login/session est saine) — donc **aucun conflit** avec l'agent parallèle.
