# Receipt — R125 : lien profond d'invitation (`/invitation/claim`)

- **Phase** : 2 (routage / deep links, P0 « zéro écran noir »)
- **Date** : 2026-10-28
- **Branche** : `agent/r125-deeplink-invitation`
- **Défaut visé** : R125

## Symptôme

Un lien profond vers l'écran de réclamation d'invitation n'ouvrait jamais cet
écran : il était silencieusement réécrit en `/dashboard`. Le parcours d'adhésion
par lien (QR/lien partagé) était donc inerte, alors que la matrice deep link
déclare `/invitation/claim` comme cible légitime.

## Preuve du défaut (avant correctif, mesurée)

```
parseDeepLink("lumina://invitation/claim?code=AB12")
  → {"path":"/dashboard","returnTo":null,"orgId":null,"code":"AB12"}

isAllowedReturnTo("/invitation/claim") → false
```

Trois causes cumulées :

1. `RETURN_TO_ALLOWLIST` était dérivé de `ROUTE_REGISTRY.filter(r => r.pattern
   !== "*" && r.kind === "app")` — les routes **publiques** en étaient exclues,
   dont `/invitation/claim`.
2. `code` était extrait de **n'importe quelle** URL → un `?code=` d'invitation
   était traité comme un code OAuth (échange PKCE sur un code d'invitation →
   échec).
3. `parseDeepLink` ne conserve que le chemin : le code du lien était perdu à la
   navigation, même après autorisation de la route.

## Correctif

| Fichier | Changement |
|---|---|
| `src/lib/routeResolver.ts` | allowlist = toutes les routes internes (hors `*`) ; `code` limité à `/auth/callback` ; nouveau champ `invitationCode` limité à `/invitation/claim` |
| `src/hooks/useAppUrlOpen.ts` | reporte `invitationCode` dans l'URL cible (`/invitation/claim?code=…`) |
| `src/pages/InvitationClaim.tsx` | préremplit le champ code depuis `location.search` (soumission toujours explicite) |

La garde anti-redirection ouverte est conservée : chemin absolu commençant par
`/`, jamais `//`, et le parseur ne retient jamais l'hôte.

## Tests et non-vacuité

- `src/lib/__tests__/route-resolver.test.ts` : 4 tests ajoutés (routes publiques
  acceptées, catch-all refusé, lien d'invitation atteint l'écran, anti-open-redirect
  conservé).
- `src/pages/__tests__/InvitationClaim-deeplink.test.tsx` : 2 tests de
  comportement (préremplissage depuis `?code=`, absence de valeur inventée).
- **Non-vacuité** : rétablir `kind === "app"` → 2 échecs ; retirer le
  préremplissage → 1 échec.

## Gates

| Gate | Résultat |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx eslint` (fichiers touchés) | 0 erreur (warnings préexistants) |
| `npx vitest run` | **1572/1572** (128 fichiers) |
