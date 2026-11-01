# Receipt — Phase 11 : Transfert de propriété guidé (PR14) — anti-orphelin

- **Date** : 2026-10-31
- **Branche** : `agent/pr14-ownership-transfer` (base `main` @ `7869477`)
- **Proposition source** : PR14 (« Transfert de propriété guidé — ownership
  transfer »), priorité P2, dépend de la Phase 4 (RBAC).
- **Statut** : terminé (PR brouillon ouverte).

## Problème

Rien ne permettait de **passer l'organisation à un autre administrateur** de
façon sûre. Le « propriétaire de référence » n'existait nulle part : le départ
d'un propriétaire laissait l'organisation sans personne pour la réadministrer.
La classe de défaut visée est **anti-orphelin** : l'organisation ne doit jamais
se retrouver avec **zéro administrateur**, y compris si une écriture échoue en
cours de transfert.

## Décisions d'intégration (réutilisation, pas de monde parallèle)

| Décision | Justification |
|---|---|
| Propriétaire de référence = réglage `org_settings` (clé `owner_profile_id`) | Socle **existant** (PR8/PR13), déjà synchronisé (stream `org_settings`) et protégé par la permission canon `admin:settings`. **Aucune table/colonne nouvelle.** |
| Attribution du rôle `ADMIN` et rétrogradation via `assignMemberRole` (`src/lib/orgAdmin.ts`) | Le helper d'écriture existant ; **jamais de SQL brut depuis l'UI**. |
| Éligibilité d'une cible = rôle canonique détenant `admin:roles` (`PERMISSION_MATRIX`) | Réutilise la décision RBAC unique (`hasPermission`), pas de liste de rôles en dur. |
| Gate d'accès = `useCanAccessMulti(user, org, "admin", "roles")` | La **même** décision que `/admin/roles` (fédération ∪ legacy). |

## Livré

| Fichier | Rôle |
|---|---|
| `src/lib/ownershipTransfer.ts` | Cœur **pur** : `planOwnershipTransfer`, `assertTransferAllowed` (+ `OwnershipTransferError` typée FR), `planKeepsAnAdmin` (invariant anti-orphelin), `isEligibleCandidate`/`isAdminCapableRole`. Application `applyOwnershipTransfer` (ports injectables, **abandon au premier échec**) + `defaultTransferPorts` (helpers réels) + lecture `loadOwnershipCandidates`/`loadOwnerOfRecord`. |
| `src/pages/TransferOwnership.tsx` | Écran guidé 4 étapes : choisir → revue des conséquences → type-to-confirm → résultat. Gate `admin:roles` ; état vide gardé par `isPowerSyncReadyNow()` + `ListSkeleton` (R52). |
| `src/lib/orgSettings.ts` | + `ORG_SETTING_KEYS.ownerProfileId` (clé de réglage). |
| `src/ionic/routes/admin.tsx`, `src/lib/routeResolver.ts` | Route `/admin/transfer-ownership` (routeur **ET** registre — anti-dérive). |
| `src/pages/Settings.tsx` | Lien entrant « Transférer la propriété » (icône Crown). |
| `cypress/e2e/zero-black-screen.cy.ts`, `docs/agent/deeplinks.matrix.json` | Crawler + matrice de liens profonds (65 → 66 routes). |
| `src/lib/__tests__/ownership-transfer.test.ts` | 16 tests (cœur pur + application, non-vacuité vérifiée). |
| `src/pages/__tests__/TransferOwnership.test.tsx` | 8 tests de comportement de la page (jsdom). |
| `src/pages/Tutorial.tsx` | Section « Transférer la propriété » (Phase 13). |
| `docs/agent/COVERAGE_MATRIX.md` | 1 ligne (Phase 11). |
| `docs/agent/PROGRESS.md` | 1 ligne (Phase 11, PR14). |

## Comportement

1. **`planOwnershipTransfer(current, candidates)`** — **PURE**. Refus (validation
   **avant toute mutation**) : `NO_CANDIDATES` (aucune cible éligible),
   `SELF_TRANSFER` (cible = propriétaire), `TARGET_NOT_ELIGIBLE`. Sinon produit
   les étapes **ordonnées** : `GRANT_ADMIN` (si la cible n'est pas déjà admin) →
   `SET_OWNER` → `DEMOTE_PREVIOUS` (seulement si l'ancien propriétaire portait
   `ADMIN`). L'ordre garantit qu'un administrateur existe **avant** toute
   rétrogradation.
2. **`assertTransferAllowed`** lève une `OwnershipTransferError` typée (code +
   message FR) — utilisée par l'UI pour refuser sans écrire.
3. **`applyOwnershipTransfer(plan, ports)`** — **atomique en intention** : au
   premier échec, l'application **s'arrête** (les étapes suivantes ne sont pas
   exécutées) et renvoie `{ ok:false, failedStep, appliedSteps, message }`. Les
   ports réels réutilisent `assignMemberRole` et `setOrgSetting` ; `setOwner`
   **lève** si l'écriture du réglage échoue → l'UI n'annonce jamais un succès à
   tort.
4. **UI** — gate `admin:roles` ; « Accès réservé aux administrateurs » pour un
   non-admin. Le bouton « Transférer la propriété » reste **désactivé** tant que
   le nom saisi ne correspond pas exactement à la cible (type-to-confirm). Succès
   et échec sont tracés dans le journal d'audit (avant/après `ownerProfileId`).

## Preuve — non-vacuité (vérifiée)

Retirer chacune des branches du correctif fait échouer un test précis, puis la
source est restaurée :

| Mutation | Test(s) qui échoue(nt) |
|---|---|
| retirer le `if (eligible.length === 0)` (`NO_CANDIDATES`) | 3 tests (refus sans candidats + `assertTransferAllowed`) |
| retirer le `if (current.targetId === current.currentOwnerId)` (`SELF_TRANSFER`) | 1 test (auto-transfert) |
| retirer le `if (!target.isAdmin)` (étape `GRANT_ADMIN`) | 4 tests (plan ordonné + application) |
| remplacer le `return { ok:false, … }` du `catch` d'`applyOwnershipTransfer` par une poursuite silencieuse | 3 tests (abandon sur échec, org intacte) |
| forcer `canConfirm = true` dans la page | 2 tests (type-to-confirm) |

Relevé : `ownership-transfer.test.ts` **16/16**, `TransferOwnership.test.tsx`
**8/8** après restauration.

## Portes (gates)

- `npx tsc -b --force --noEmit` → **0 erreur**.
- `npm run lint` (eslint) → **0 erreur**.
- `npx vitest run` → **1817 passés, 6 ignorés** (170 fichiers).
- `npm run build` → **succès**.

## Notes / limites

- Aucune migration : le transfert réutilise `org_settings` (`owner_profile_id`)
  et `org_memberships`. La clé `owner_profile_id` est un **réglage** (JSON),
  donc rien à ajouter au schéma PowerSync ni au stream `org_settings`.
- Le propriétaire de référence est un **réglage**, pas une colonne : il est
  écrit via PowerSync (`BYPASSRLS`) comme les autres réglages ; les politiques
  REST directes de `org_settings` exigent `admin:settings`.
- Déploiement serveur : aucun (feature 100 % client + réglage synchronisé).
