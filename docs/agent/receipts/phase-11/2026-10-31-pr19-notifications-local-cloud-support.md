# Phase 11 — notifications push : LOCAL (device) + CLOUD (OneSignal) + support

- **Date** : 2026-10-31
- **Branche** : `feat/notifications-local-cloud-support`
- **PR** : #175
- **Priorité** : P1 (directive « notifications push local + cloud + support »)
- **Statut** : terminé (portes vertes, non-vacuité prouvée par mutation)

## Le défaut (mesuré)

Le chemin d'envoi **cloud** était **mort**. `NotificationCapability.sendNotification`
faisait exactement deux choses :

1. `INSERT INTO notifications` (persistance PowerSync → liste in-app) ;
2. `service.setTags(...)` (intention de ciblage sur le joueur local).

Aucun appel réseau n'était émis : l'edge function `supabase/functions/onesignal-notify`
existait mais n'était **jamais invoquée**. `notifyRole` (`src/lib/authOneSignal.ts`)
était décrit comme un *stub client* et n'était branché nulle part. Conséquence
produit : les notifications **apparaissaient dans l'historique in-app** mais
**aucun push n'était délivré** — l'utilisateur ne recevait jamais rien sur son
téléphone.

De plus, il n'existait **aucun** chemin de notification **locale** (device) :
un rappel hors-ligne était impossible.

## Livrable

| Fichier | Rôle |
|---|---|
| `src/lib/cloudPush.ts` (nouveau) | Chemin d'envoi **unique** vers l'edge function (JWT + tags). Import **paresseux** de `@/lib/auth` (qui lève à l'import si l'env manque) → importer ce module est toujours sûr. **Ne lève jamais**. |
| `src/adapters/native/LocalNotificationAdapter.ts` (nouveau) | Notifications **locales** via `@capacitor/local-notifications@7.0.7` : `schedule`/`cancel`/`getPending`/`createChannel`/`addActionListener`. No-op sûr hors natif, plugin mockable pour les tests. |
| `src/adapters/native/index.ts` | Export du nouvel adaptateur. |
| `src/capabilities/notification/index.ts` | `sendNotification` déclenche désormais l'**envoi cloud réel** ; ajout de `scheduleLocalNotification`/`cancelLocalNotification` (canal Android 8+). |
| `src/lib/authOneSignal.ts` | `notifyRole` délègue au module `cloudPush` partagé (suppression du code mort + import inutilisé). |
| `src/pages/SettingsNotifications.tsx` | Bouton **notification de test** (local + cloud) + bloc **Support** (Signaler un problème → `/settings/health`, Aide → `/help`). |

## Garanties de conception

- **Le push ne casse jamais l'écriture qui le déclenche** : la ligne in-app est
  écrite **avant** l'appel cloud ; `sendCloudPush` avale toute erreur et renvoie
  un résultat (`{ sent, reason }`) au lieu de lever.
- **Pas de relais ouvert** : l'edge function exige un JWT valide et, sans
  ciblage, réserve le broadcast à un admin central (déjà en place, vérifié).
- **Import sûr** : `cloudPush` n'a aucun effet de bord au chargement (auth en
  import dynamique).

## Tests (non-vacuité prouvée)

- `src/lib/__tests__/cloudPush.test.ts` — 5 tests : envoi nominal (URL/JWT/corps),
  `no-config`, `no-session`, refus `rejected`, erreur réseau `error`.
- `src/adapters/native/__tests__/LocalNotificationAdapter.test.ts` — 9 tests :
  détection native, permission, `schedule` (id natif / no-op / erreur),
  `cancel`, `getPending`, `addActionListener`.
- `src/capabilities/__tests__/notification.test.ts` — 3 tests ajoutés : le
  câblage cloud est **réellement** déclenché (cibles/org transmises), no-op local
  hors natif, ordre in-app → cloud.

**Mutation mesurée** : retirer la garde `if (!this._isNative)` de `schedule()`
fait échouer le test « no-op hors natif » (1 échec constaté) — les gardes ne
sont donc pas sans effet.

## Portes

- `npx tsc -b` → **exit 0**
- `npx eslint .` → **0 erreur** (warnings de style existants)
- `npx vitest run` → **2080/2080 tests, 194 fichiers**
- Cypress `zero-black-screen.cy.ts` (crawler, hors-ligne) → **66/66**, dont
  `/notifications` et `/settings/notifications` (vérifié **en local**)

## Note d'honnêteté

Deux échecs unitaires observés en début de session (`route-registry-drift`,
`maker-checker-ui`) étaient **déjà corrigés en amont** sur `main` (commit
`ed66828`, PR concurrentes #163–#173). La branche a été **rebasée sur `main` à
jour** : tout est vert. Aucun de ces deux échecs n'était causé par ce travail.
