# Receipt — R127 : intention d'organisation depuis une URL d'entrée web

- **Phase** : 2 (routage / deep links, P0)
- **Date** : 2026-10-28
- **Branche** : `agent/r127-web-entry-org`
- **Défaut visé** : R127

## Symptôme

Ouvrir sur le **web** `https://…/dashboard?org=B` alors que l'organisation
active est A affichait le dashboard de A : aucune proposition de bascule. Le
même lien sur mobile (deep link natif) produisait bien `org-switch-required`.

## Preuve du défaut

`linkOrgId` (l'entrée du résolveur qui produit `org-switch-required`) n'était
alimenté que par `useAppUrlOpen`, gardé par
`if (!Capacitor.isNativePlatform()) return;`. Aucun code web n'appelait
`parseDeepLink` sur `window.location`.

## Correctif

| Fichier | Changement |
|---|---|
| `src/lib/routeResolver.ts` | nouveau `webEntryOrgIntent(url, activeOrgId)` (même `parseDeepLink` + allowlist) ; exemption `ORG_PARAM_LOCAL_CONSUMERS` |
| `src/App.tsx` | le `sync()` d'intention lit `window.location.href`, persiste l'intention, l'expose à `resolveRoute` |

## Tests et non-vacuité

- `route-resolver.test.ts` : 7 tests (intention produite ; `org-switch-required`
  effectif ; pas d'intention si org déjà active ; fail-open sans org active ;
  pas de paramètre ; exemption `?org=` local ; URL invalide).
- `route-state-wiring.test.ts` : garde anti-dérive (App.tsx appelle
  `webEntryOrgIntent`).
- **Non-vacuité** : retirer le câblage → 1 échec.

## Gates

| Gate | Résultat |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx eslint` (fichiers touchés) | 0 erreur |
| `npx vitest run` | **1586/1586** (128 fichiers) |

## Suivi R127.b — unification de la décision web/natif

Le natif gardait sa propre condition de bascule (`link.orgId !== getOrganizationId()`),
sans l'exemption `?org=` local : `/invitation/emit?org=B` déclenchait une
bascule sur mobile mais pas sur le web. La décision est extraite en
`orgSwitchIntentFromLink(link, activeOrgId)` et **les deux plateformes
l'appellent**. 3 tests supplémentaires figent l'égalité de décision web/natif.

Suite après unification : **1589/1589**.
