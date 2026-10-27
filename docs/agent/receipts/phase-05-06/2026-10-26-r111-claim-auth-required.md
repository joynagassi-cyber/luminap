# Receipt — R111 : inscription obligatoire avant le claim d'invitation

- **Date** : 2026-10-26
- **Branche** : `agent/r111-claim-auth-required`
- **Tâche** : R111 (P1) — « invitation claim must sign-up first / use real Auth uid
  (not a random UUID) ».
- **Statut** : **terminé**.

## Défaut (rappel)

`claimInvitation` (`src/capabilities/invitation/index.ts`) générait un
`crypto.randomUUID()` pour le profil PENDING. Deux FK **NON deferrable**
rejettent cet id, et la RLS l'interdit :

- `profiles.id → auth.users(id)` ;
- `org_memberships.user_id → auth.users(id)` (posée par le trigger) ;
- `profiles_insert_self` : `initplan_uid() = id`.

Résultat mesuré : `23503` à l'upload ET au règlement, `42501` à l'insertion
locale → parcours « un invité réclame une invitation » **inopérant**.

## Correctif

1. **`src/capabilities/invitation/index.ts`** — `claimInvitation` :
   - exige une **session Auth** (`authService.getSession()`) ; sans session →
     `AUTH_REQUIRED` ;
   - `resulting_user_id = session.user.id` (`auth.uid()`), plus jamais d'UUID
     aléatoire ;
   - le profil local est un **UPSERT** qui n'écrit QUE `status='PENDING'`
     (role/org_id intacts — gardes `ROLE_IMMUTABLE`/`ORG_ID_IMMUTABLE`) ; la
     branche INSERT pose les défauts tolérés (`role='MEMBRE'`,
     `org_id='__no_org__'`, miroir de `handle_new_user`).
2. **`src/pages/InvitationClaim.tsx`** — inscription obligatoire visible :
   - bandeau « Créez d'abord votre compte » + CTA `/auth` quand aucune session ;
   - suivi de session via `authService.subscribe` ;
   - `handleConfirm` refuse sans session ; message dédié pour `AUTH_REQUIRED`.
3. **`src/pages/InvitationEmit.tsx`** — QR réellement scannable :
   - `bgColor`/`fgColor` **fixes** (`#ffffff`/`#000000`) ; l'ancien
     `bgColor="var(--text-primary)"` donnait un QR noir-sur-noir en thème clair
     (`#1a1a1a`) → illisible par la caméra ;
   - payload v2 complété (`scope.resource` / `scope.id`, `grants`, `tags`) —
     complétude de contrat (l'UI d'émission granulaire reste à faire, R112).

## Preuve du correctif (instance dev `hhgovvrnalibhgpakswi`, transaction annulée, 0 résidu)

Scénario, sous `ROLE authenticated` + `request.jwt.claims` :

| Étape | Résultat mesuré |
|---|---|
| Compte Auth réel `r111-proof@lumina.dev` | profil créé `ACTIVE`/`MEMBRE`/`__no_org__` |
| Gestionnaire (`TREASURIER` org-1) émet une invitation `ANCIEN` | `invitations_insert` accepté |
| Invité : profil → `PENDING` + claim `PENDING_SYNC` (`resulting_user_id` = id Auth) | `invitation_claims_insert` accepté (branche « profil non ACTIF ») |
| Règlement serveur `settle_invitation_claim` | `role=ANCIEN`, `org_id=org-1`, profil `ACTIVE`, claim `CONFIRMED`, `used_count=1`, `org_memberships=1` |

**Contre-cas** (l'ancien défaut) : insert d'un profil PENDING à UUID aléatoire
(absent de `auth.users`) → **`23503` `profiles_id_fkey`** — désormais impossible
depuis le client.

**Résidus vérifiés** : `auth_residue=0`, `inv_residue=0`, `claims_total=0`,
`orphan_pending=0`.

## Tests

- **Nouveau** : `src/capabilities/__tests__/invitation-claim-auth-required.test.ts`
  (verrou anti-régression : `AUTH_REQUIRED`, bannissement de
  `crypto.randomUUID()`, UPSERT `status='PENDING'` seul, bandeau d'inscription).
- **Mis à jour** : `src/capabilities/__tests__/invitation-file-transport.test.ts`
  (mock session Auth ; assert `userId = auth-user-1` ; nouveau cas
  `AUTH_REQUIRED`).

## Gates

| Gate | Résultat |
|---|---|
| `npx tsc -b` | **0 erreur** (exit 0) |
| `npx vitest run` | **1284/1284** (93 fichiers) |
| `npx eslint` (fichiers touchés) | **0 erreur** (warnings pré-existants) |
| Résidus en base | **0** |

## Honnêteté (R12)

- **[Prouvé]** : le flux corrigé aboutit de bout en bout sous RLS
  `authenticated` (rôle/org appliqués, claim CONFIRMED) ; l'ancien chemin est
  rejeté par la FK.
- **[Limite]** : la preuve SQL simule la session (`ROLE authenticated` +
  `request.jwt.claims`), pas un upload PowerSync réel (worker WASM indisponible
  en headless) — le chemin d'écriture est identique (`profiles` + `invitation_claims`).
- **[Non fait]** : UI d'émission du scope granulaire (R112) ; correctif n'exige
  **aucune migration** (RLS et trigger déjà en place).
