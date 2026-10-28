# Receipt — Phase 11 : drapeaux de fonctionnalités (kill switches, PR7)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-11-feature-flags`
- **Risque** : R118
- **Livrables** : `src/lib/featureFlags.ts`, `src/lib/__tests__/feature-flags.test.ts`

## Tâche

Le contrat (Phase 1/11, proposition **PR7**) exige des **drapeaux de
fonctionnalités** : pouvoir désactiver une fonctionnalité défectueuse en
production **sans redéployer**. Vérification : `grep -rn "isFeatureEnabled"`
→ **0** ; aucun module n'existait.

## Implémentation

- `src/lib/featureFlags.ts` — décision **PURE** et **fail-open** :
  - `isFeatureEnabled(name)` retourne `true` sauf si un drapeau vaut
    explicitement `false` ;
  - entrées non booléennes, vides, JSON corrompu, tableau, scalaire → ignorées
    (jamais de coupure accidentelle) ;
  - deux sources fusionnées : surcharge locale (`lumina-flags`, prioritaire) puis
    config de build (`VITE_FLAGS`).

## Câblage réel (anti « filet déclaré, jamais câblé »)

La classe de défaut R105/R106/R107/R108 (garde présente, jamais alimentée) est
traitée : `initOneSignal` (`src/lib/onesignal.ts`) est gardé par
`isFeatureEnabled("notifications-push")`. Un test verrouille ce câblage pour
qu'il ne devienne pas mort.

## Preuve

`V: feature-flags.test.ts` — **16** tests :

| Groupe | Ce qui est prouvé |
|---|---|
| `parseFlags` | fail-open : vide/null/undefined/JSON corrompu/tableau/scalaire/non booléen |
| `isFeatureEnabled` | inconnu → actif ; `true` → actif ; `false` → coupé |
| surcharge locale | coupe, prime sur la config de build, retrait restaure |
| stockage indisponible | `setItem` qui lève → aucune exception |
| câblage | `initOneSignal` gardé par `notifications-push` |

Gates : `tsc -b` **0**, vitest **1534/1534** (121 fichiers), lint **0 erreur**.

## Reste propriétaire

Déclarer `VITE_FLAGS` au build si un kill switch doit être pilotable **à
distance** (sinon la surcharge reste locale, par appareil).
