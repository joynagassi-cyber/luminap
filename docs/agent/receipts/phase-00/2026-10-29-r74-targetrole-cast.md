# Receipt — R74 : casts `as any` inutiles sur `targetRole`

- **Date** : 2026-10-29
- **Branche** : `agent/r74-targetrole-cast`
- **Tâche** : réduire la partie actionnable de R74 (casts `as any` inutiles)
  sans trancher la décision de modèle (ADMIN / sémantique `action_type`).

## Mesure (2026-10-29)

`grep -rn 'targetRole: "..." as any' src/` → **7** occurrences :

| Fichier | Valeur | Valeur ∈ `Role` ? | Action |
|---|---|---|---|
| `Versement.tsx:101` | `"TREASURIER"` | **oui** | cast **retiré** |
| `EventNew.tsx:159` | `"TREASURIER"` | **oui** | cast **retiré** |
| `GivingCampaign.tsx:136` | `"TREASURIER"` | **oui** | cast **retiré** |
| `TransactionNew.tsx:200` | `"TREASURIER"` | **oui** | cast **retiré** |
| `InvitationClaim.tsx:184` | `"ADMIN"` | **non** | laissé (R109) |
| `InvitationEmit.tsx:140` | `"ADMIN"` | **non** | laissé (R109) |
| `FormFill.tsx:180` | `"ADMIN"` | **non** | laissé (R109) |

Les 4 casts `"TREASURIER" as any` étaient **inutiles** : la valeur appartient
déjà au type `Role`. Preuve : après retrait, `tsc -b` = **0**.

## Pourquoi ne pas toucher aux 3 `"ADMIN"`

`ADMIN` **n'appartient pas** à `Role` (`src/types/index.ts`). Retirer le `as any`
casserait le typecheck → forcerait à **ajouter** `ADMIN` au modèle, ce qui est
une **décision propriétaire** (R109 / D-S10-3 : ADMIN est un rôle DB-only, hors
canon). On ne tranche pas un choix de modèle par un changement de typage.

## Livrables

- 4 fichiers : retrait du cast inutile (`Versement`, `EventNew`,
  `GivingCampaign`, `TransactionNew`).
- `src/lib/__tests__/target-role-cast-guard.test.ts` (1) — garde anti-masquage :
  échoue si un `targetRole` portant une valeur **déjà valide** est casté `as any`.
  Le `Role` est **dérivé du source** (`src/types/index.ts`), pas recopié.
  Non-vacuité : la garde exige ≥1 cast présent (les 3 `"ADMIN"` la maintiennent
  non vide, donc elle ne peut pas passer « par vide »).

## Gates (mesurés localement)

| Gate | Commande | Sortie | Extrait |
|---|---|---|---|
| Typecheck | `npx tsc -b` | **0** | (aucune sortie) |
| Tests notif | `vitest run notification.test.ts Notifications-icon.test.tsx` | **0** | `24 passed` |
| Garde R74 | `vitest run target-role-cast-guard.test.ts` | **0** | `1 passed` |

## Honnêteté (R12)

- **[Prouvé]** : 4 casts retirables (tsc vert après retrait), garde verte.
- **[Probable]** : que la valeur `"TREASURIER"` soit le rôle voulu pour ces
  notifications (elle était déjà celle écrite en base via `as any`).
- **[Non vérifié]** : routage réel des notifications (aucun code ne lit
  `action_type` pour cibler — cf. R74/P-NEW-6).

## Risque résiduel

- La **sémantique** de `action_type` (rôle écrit dans une colonne « type
  d'événement ») reste ouverte → P-NEW-6, non bloquante.
- La décision ADMIN reste propriétaire → R109.
