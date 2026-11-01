# Edge Function `report-error` — erreurs client → GitHub Issues

Proxy serveur entre le **système d'observabilité** de l'app et **GitHub Issues**
sur `joynagassi-cyber/luminap`. Chaque incident intercepté côté client (crash,
erreur métier, base de données, synchronisation, performance) produit un rapport
contextuel, dédupliqué puis transformé en Issue portant le label déclencheur
**`openhands`** — que l'automatisation cloud OpenHands détecte et corrige.

## Pourquoi une edge function (et pas un appel direct) ?

Le jeton GitHub est un **secret** : il ne doit JAMAIS être embarqué dans le
bundle web ni dans l'APK. La fonction détient le jeton côté serveur et joue le
rôle de proxy contrôlé :

1. exige un **appelant authentifié** (JWT Supabase valide) — un endpoint ouvert
   permettrait à n'importe qui de spammer des Issues ;
2. valide le **dépôt cible** contre une allowlist (`ALLOWED_REPOS`) — pas
   d'injection de repo ;
3. **déduplique** : une Issue ouverte portant la même signature n'est pas
   recréée (fenêtre 6 h) ;
4. crée l'Issue avec le label `openhands`.

## Contrat

`POST /functions/v1/report-error`

```jsonc
// En-tête : Authorization: Bearer <access_token Supabase>
{
  "repo": "joynagassi-cyber/luminap",   // optionnel (allowlist)
  "report": {
    "kind": "lumina-error-report",
    "signature": "abc123",               // dédup client + serveur
    "type": "crash|functional|database|sync|performance",
    "message": "…",
    "stack": "…",
    "componentStack": "…",               // ErrorBoundary React
    "source": "onerror|unhandledrejection|error-boundary|powersync-fatal|slow-operation|…",
    "generatedAt": "2026-11-01T19:00:00.000Z",
    "appVersion": "1.2.1",
    "environment": "production",
    "platform": "web",
    "route": "/sante",
    "online": true,
    "session": { "authenticated": true, "role": "TREASURER" },
    "breadcrumbs": [{ "at": 1793559400000, "category": "ui", "message": "clic sur X" }],
    "context": { "code": "42501" }
  }
}
```

Réponses : `{ ok: true, issueNumber, issueUrl }` ou
`{ ok: true, deduped: true, issueNumber }` ; erreurs `{ error }` avec le statut
HTTP (400 / 401 / 405 / 502 / 503).

## Secrets (jamais dans le dépôt)

```
supabase secrets set GITHUB_TOKEN=<PAT portée issues:write>
# optionnels :
supabase secrets set GITHUB_REPO=joynagassi-cyber/luminap
supabase secrets set GITHUB_TRIGGER_LABEL=openhands
```

## Déploiement

```
supabase functions deploy report-error
```

Le **label `openhands` doit exister** sur le dépôt, sinon GitHub rejette la
création d'Issue (422). Il est créé une seule fois :

```
curl -X POST -H "Authorization: Bearer <token>" \
  https://api.github.com/repos/joynagassi-cyber/luminap/labels \
  -d '{"name":"openhands","color":"5319E7"}'
```

## Politique de confidentialité (CRITIQUE)

Le dépôt est **public** : tout ce qui entre dans une Issue est publié. Le
rapport est expurgé **côté client** (`redact` + `scrubIdentities`) avant envoi :
aucun e-mail, nom, identifiant utilisateur ou organisation, ni contenu
utilisateur libre. Cette fonction ne fait que relayer un rapport déjà nettoyé.

## Tests

`issue.ts` est **pur** (aucun import Deno) et testé par
`src/lib/__tests__/report-error-issue.test.ts`. La garde d'intégration
`src/lib/__tests__/error-to-issue-integration-guard.test.ts` verrouille
statiquement : absence de `GITHUB_TOKEN` côté `src/`, présence du label, de
l'allowlist et de la vérification d'authentification.
