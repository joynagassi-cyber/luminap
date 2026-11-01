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

1. identifie l'**appelant** — JWT utilisateur vérifié (`auth.getUser`) **ou**
   anonyme (voie pré-login) ;
2. applique un **plafond par appelant** (rate-limiting) — un endpoint public ne
   doit pas permettre de spammer des Issues ;
3. valide le **dépôt cible** contre une allowlist (`ALLOWED_REPOS`) — pas
   d'injection de repo ;
4. **déduplique** : une Issue ouverte portant la même signature n'est pas
   recréée (fenêtre 6 h) ;
5. crée l'Issue avec le label `openhands`.

## Voie pré-login (anonyme) — rate-limitée

Les incidents les plus précieux surviennent **avant la connexion** (crash de
l'écran d'auth, échec du flux d'invitation, perte réseau au boot) — et un
utilisateur qui ne parvient pas à se connecter ne pourrait jamais les remonter.
La fonction n'exige donc **plus** de JWT (`verify_jwt: false`) et distingue deux
voies :

| Appelant | Identification | Plafond / heure | Bucket |
| --- | --- | --- | --- |
| Authentifié | `auth.getUser(token)` OK | `USER_MAX_PER_HOUR` (20) | `user:<uuid>` |
| Anonyme | pas de JWT, ou JWT expiré/invalide | `ANON_MAX_PER_HOUR` (5) | `ip:<sha256(salt+ip)>` |

- L'IP n'est **jamais** stockée en clair : seul un hachage salé tronqué l'est
  (`IP_HASH_SALT`, secret optionnel). L'en-tête `cf-connecting-ip` (posé par
  Cloudflare, non falsifiable) est préféré à `x-forwarded-for`.
- La vérification JWT est faite **dans la fonction** (et non par la passerelle) :
  un en-tête `Authorization` forgé n'obtient jamais la voie « authentifiée » —
  il retombe sur le plafond serré.
- Le comptage passe par la RPC `register_anonymous_report` (SECURITY DEFINER,
  EXECUTE réservé au `service_role`). **Sans `SUPABASE_SERVICE_ROLE_KEY`, la
  voie anonyme est REFUSÉE** (503) : on ne l'expose jamais sans plafond.
- Le comptage est **fail-open** : si la RPC est indisponible, la déduplication
  par signature reste le garde-fou (mieux vaut un doublon qu'une erreur perdue).

### Risque résiduel (accepté, borné)

La voie anonyme est un point d'écriture public : un tiers peut faire créer une
Issue dont il contrôle le texte (le dépôt est public). Le risque est **borné**
par le plafond par IP (5/h), la déduplication par signature, l'allowlist de
dépôt et la troncature des champs (`buildIssueBody` : message 4 000, stack
12 000, titre 110 caractères). Si l'abus devient un problème réel, réduire
`ANON_MAX_PER_HOUR` ou exiger un jeton de capacité (`Turnstile`) plutôt que de
refermer la voie — la capture pré-login est la valeur principale du dispositif.

## Contrat

`POST /functions/v1/report-error`

```jsonc
// En-tête : Authorization: Bearer <access_token Supabase>  (OPTIONNEL)
//           apikey: <clé publishable>                       (toujours requis par la passerelle)
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
HTTP (400 / 405 / **429** / 502 / 503).

## Secrets (jamais dans le dépôt)

```
supabase secrets set GITHUB_TOKEN=<PAT portée issues:write>
# optionnels :
supabase secrets set GITHUB_REPO=joynagassi-cyber/luminap
supabase secrets set GITHUB_TRIGGER_LABEL=openhands
supabase secrets set IP_HASH_SALT=<sel aléatoire pour le hachage des IP>
```

> `SUPABASE_SERVICE_ROLE_KEY` est auto-injecté par la plateforme — requis pour le
> rate-limiting de la voie anonyme.

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

`issue.ts` et `throttle.ts` sont **purs** (aucun import Deno) et testés par
`src/lib/__tests__/report-error-issue.test.ts` et
`src/lib/__tests__/report-error-throttle.test.ts`. La garde d'intégration
`src/lib/__tests__/error-to-issue-integration-guard.test.ts` verrouille
statiquement : absence de `GITHUB_TOKEN` côté `src/`, présence du label, de
l'allowlist, de la vérification d'authentification **et** de la voie anonyme
rate-limitée (bucket = hash d'IP, plafond serré, refus sans `service_role`).
