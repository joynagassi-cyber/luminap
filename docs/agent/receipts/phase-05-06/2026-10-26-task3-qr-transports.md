# Receipt — Tâche 3 : transports d'invitation (émission QR + code + fichier)

- **Date** : 2026-10-26
- **Branche** : `agent/task3-qr-transports`
- **Tâche** : vérifier la génération QR + code d'invitation et que les 4
  transports de claim partagent le même moteur (émission, encodage QR,
  code `LUM-XXXXXX`).
- **Statut** : **terminé** (vérification + filet anti-régression).

## Les 4 transports de claim (vérifiés)

| # | Transport | Entrée | Parse |
|---|---|---|---|
| 1 | Code manuel | `IonInput` `LUM-XXXXXX` | recherche locale puis payload |
| 2 | QR (caméra) | `CameraScanner` (ZXing) | `parseQRPayload` |
| 3 | Collage | `IonInput` texte/JSON | `parseQRPayload` |
| 4 | Fichier `.json` | `<input type="file">` | `importInvitationFromFile` = `parseQRPayload` |

Les transports 2, 3, 4 convergent vers `parseQRPayload` puis
`invitation.claimInvitation` (moteur unique). Le transport 1 reconstruit le
payload depuis la ligne locale.

## Émission (vérifiée)

- `generateCode()` : `LUM-` + 6 caractères de l'alphabet sans ambiguïté
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ni `I`, `O`, `0`, `1`), tiré de
  `crypto.getRandomValues` (jeton porteur → jamais `Math.random`).
- `buildQRPayload()` : payload **v2** (scope granulaire `resource`/`id`,
  `grants`, `tags`).
- `InvitationEmit.tsx` : le code affiché est celui **persisté** (retourné par
  `createInvitation`, jamais régénéré) ; `invitationId` rempli après l'écriture
  PS ; QR rendu avec contraste **fixe** (`#ffffff`/`#000000`).
- `parseQRPayload` exige un `invitationId` non vide → le payload n'est
  partageable qu'**après** l'écriture PS (comportement voulu, verrouillé).

## Livrable

Nouveau test `src/capabilities/__tests__/invitation-emit-transport.test.ts`
(10 tests) — **couvre la chaîne d'émission qui n'était pas testée** :

- format du code + absence de caractères ambigus ;
- payload v2 : champs, scope granulaire (`resource`/`id`), `groupId` seulement
  en scope GROUP, `grants`/`tags` ;
- **round-trip** `buildQRPayload` → JSON → `parseQRPayload` (fidélité du canal
  émetteur→réclamant) ;
- refus d'un payload non persisté (`invitationId` vide) ;
- transport fichier = même parse que le QR ;
- refus d'un payload v2 incomplet ; acceptation d'un v1 (rétrocompatibilité).

## Gates

| Gate | Résultat |
|---|---|
| `npx tsc -b` | 0 erreur |
| `npx vitest run` | **1289/1289** (93 fichiers) — 1279 + 10 |
| `npx eslint` (nouveau fichier) | 0 erreur (11 warnings `any` de test) |

## Honnêteté (R12)

- **[Prouvé]** : la chaîne d'émission produit un payload v2 complet et
  round-trip fidèle ; les 4 transports partagent le même moteur de parse.
- **[Limite]** : le décodage caméra (ZXing) n'est pas testé unitairement
  (matériel) ; il est couvert par l'assertion de forme du payload + la
  cohérence `parseQRPayload`. Le test d'UI (rendu du QR) relève de Cypress.
- **[Non fait]** : UI d'émission du scope granulaire (R112) — le payload le
  transporte, mais aucun contrôle ne le renseigne.
