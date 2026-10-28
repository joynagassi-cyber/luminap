# Receipt — R126 : `returnTo` transmis et consommé

- **Phase** : 2 (routage / deep links, P0)
- **Date** : 2026-10-28
- **Branche** : `agent/r125-deeplink-invitation`
- **Défaut visé** : R126

## Symptôme

Un lien profond (ou un onglet) vers une route protégée, ouvert par un
utilisateur non connecté, aboutissait toujours à `/dashboard` après connexion :
la cible d'origine était perdue. Le résolveur calculait pourtant bien un
`returnTo` allowlisté.

## Preuve du défaut

`resolveRoute("/finance", { isAuthenticated: false })` →
`{ outcome: "needs-auth", returnTo: "/finance" }` — mais `RouteGuard` faisait
`<Navigate to="/auth" replace />` (sans `returnTo`) et `AuthPage` ne lisait
aucun `returnTo`. Le champ était donc produit puis jeté (famille « filet
déclaré, jamais câblé »).

## Correctif

| Fichier | Changement |
|---|---|
| `src/App.tsx` | `needs-auth` → `/auth?returnTo=<encodeURIComponent(outcome.returnTo)>` |
| `src/lib/routeResolver.ts` | nouveau `readReturnToFromSearch()` (relit **et revalide** via `isAllowedReturnTo`) |
| `src/pages/AuthPage.tsx` | `proceedAfterAuth` revient au `returnTo` allowlisté ; l'onboarding forcé reste prioritaire |

## Tests et non-vacuité

- `route-resolver.test.ts` : 4 tests (`needs-auth` produit le `returnTo` ;
  lecture + validation ; refus des redirections ouvertes `//evil.com` /
  `https://evil.com` ; absence de paramètre).
- `route-state-wiring.test.ts` : garde anti-dérive (App.tsx transmet, AuthPage
  consomme).
- **Non-vacuité** : retirer les deux câblages → 2 échecs.

## Gates

| Gate | Résultat |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx eslint` (fichiers touchés) | 0 erreur |
| `npx vitest run` | **1578/1578** (128 fichiers) |
