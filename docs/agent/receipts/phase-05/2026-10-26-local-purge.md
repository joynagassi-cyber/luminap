# Receipt — Phase 5 : purge des données locales au changement de compte (PM18)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-05-local-purge`
- **Défaut visé** (pre-mortem PM18, impact **5**) : les données locales vivent
  dans le NAVIGATEUR, pas par compte. `lumina-config` (nom d'église),
  `lumina-firstName` / `lumina-lastName` (Profil), `lumina-role`,
  `lumina-active-org`, le thème et l'état d'onboarding ne sont **jamais**
  réécrits au login. Un compte B qui se connecte sur l'appareil d'un compte A
  voyait donc l'église, le nom et le rôle de A — et héritait même, en mémoire,
  de l'organisation de A (`_orgId` est résolu au chargement du module depuis
  `lumina-active-org`).

## Mesure (avant)

- `deleteAllLocalData()` **existe** mais n'était **appelé nulle part**
  (`grep -rn deleteAllLocalData src/` → seulement sa définition).
- Aucune clé ne mémorisait QUEL compte possédait l'appareil → impossible de
  détecter un changement d'utilisateur.

## Livré

- `src/lib/dataLayer.ts` :
  - `ensureLocalDataOwnedBy(userId)` : au 1er login d'un compte DIFFÉRENT,
    purge les clés `lumina-*` + l'organisation en mémoire, puis mémorise le
    nouveau propriétaire (`lumina-local-owner`). Même compte → no-op (le cache
    hors-ligne est préservé).
- `src/lib/orgContext.ts` : `resetOrganizationId()` (oublie `_orgId` + la clé).
- `src/context/AppContext.tsx` : appelle `ensureLocalDataOwnedBy(profile.id)`
  **avant** de résoudre le contexte d'organisation.
- `src/lib/__tests__/local-data-ownership.test.ts` (4, jsdom).

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (local-data-ownership) | **4/4** |
| `vitest run` (suite) | **1258/1258** (88 fichiers) |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

## Reste (assumé)

La purge est déclenchée au boot / changement d'auth (AppContext). Un compte qui
change SANS repasser par le boot (bascule « Mes comptes » dans la même session)
reste couvert car `authService.setState` déclenche `notifyListeners` →
`checkAuth` se rejoue. Un test E2E de changement d'utilisateur réel reste à
écrire (dépend d'un second compte E2E stable).
