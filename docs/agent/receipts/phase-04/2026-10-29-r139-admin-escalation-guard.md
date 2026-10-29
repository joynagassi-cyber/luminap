# Phase 4 — R139 : garde anti-escalade par invitation vers `ADMIN`

- **Date** : 2026-10-29
- **Priorité** : P1 (escalade de privilèges ; introduite puis fermée dans le
  même lot que R109)
- **Statut** : **CORRIGÉ** (barrières 1 et 2 livrées + prouvées)
- **Migrations** : `20261029000003_guard_invitation_target_role` (+ rollback)

## Défaut

`invitations.target_role` n'était contraint par **aucun trigger** (mesure : 0
trigger non-interne). Un gestionnaire d'invitations (`can_manage_invitations` =
PASTEUR_PRINCIPAL / ANCIEN / TREASURIER) pouvait émettre une invitation
`target_role='ADMIN'` — donc octroyer, ou s'octroyer, le rôle suprême sans être
lui-même ADMIN.

## Correctif — deux barrières (défense en profondeur)

1. **Trigger `guard_invitation_target_role`** (BEFORE INSERT/UPDATE OF
   `target_role`) : rejette `target_role='ADMIN'` si l'acteur n'est pas ADMIN.
   Détecte l'acteur via **`initplan_uid()`** (JWT), **pas** `current_user` — dans
   une fonction `SECURITY DEFINER`, `current_user` = propriétaire, pas le client
   (piège mesuré : la 1re version laissait passer l'insert).
2. **Garde dans `settle_invitation_claim`** (voie PowerSync **et** REST) : au
   règlement — seul point où un rôle est réellement attribué — une invitation
   `ADMIN` dont l'émetteur n'est pas ADMIN est **REJETÉE**
   (`REJECTED_ROLE_ESCALATION`), rôle de la cible **inchangé**. Barrière
   décisive : le chemin d'écriture de l'app passe par PowerSync
   (`powersync_role`, BYPASSRLS, sans JWT) où le trigger (1) est aveugle.

La contrainte `invitation_claims_status_check` a été **étendue** pour accepter
`REJECTED_ROLE_ESCALATION` (sinon le rejet devenait une erreur SQL `23514`) ;
type TS `ClaimStatus` (`src/capabilities/invitation/index.ts`) + libellé UI
(`src/pages/InvitationManage.tsx`) alignés.

REVOKE de la fonction de trigger (surface RPC fermée, cf. R115) : elle
**n'apparaît pas** dans les advisors de sécurité.

## Preuves mesurées (instance DEV, 2026-10-29, transactions annulées / 0 résidu)

| Cas | Attendu | Mesuré |
|---|---|---|
| **Barrière 1** : PASTEUR_PRINCIPAL → invitation `ADMIN` (REST simulé) | refusé | **`42501` `ROLE_ESCALATION`** |
| **Barrière 1** : ADMIN → invitation `ADMIN` | accepté | **accepté** |
| **Barrière 2** : invitation `ADMIN` émise par un non-ADMIN → claim | rejeté | **`REJECTED_ROLE_ESCALATION`**, `role_avant=PASTEUR_PRINCIPAL role_apres=PASTEUR_PRINCIPAL` |
| **Barrière 2** : ADMIN→ADMIN → claim | confirmé | **`CONFIRMED`**, cible `ADMIN` |
| **Non-régression** : PASTEUR_PRINCIPAL → `MEMBRE` → claim | confirmé | **`CONFIRMED`**, cible `MEMBRE` |
| Résidus après tests | 0 | **0** (invitations/claims de test absents) |

## Gates

`tsc -b --noEmit` = 0 ; `eslint .` = **0 erreur** ; `vitest run` = **1677/1677**.
