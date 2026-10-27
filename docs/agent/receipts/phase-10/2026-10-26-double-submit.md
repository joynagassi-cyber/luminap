# Receipt — Phase 10 : anti double-soumission des actions financières (PM17)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-10-ux`
- **Défaut visé** (pre-mortem PM17) : un double-clic/double-tap rapide sur une
  action financière (approuver / rejeter / supprimer / contre-transiger) exécute
  le handler **deux fois** avant que React ne re-rende — `disabled={submitting}`
  ne protège qu'**après** le re-rendu. Résultat : double écriture.

## Mesure (avant)

- `TransactionDetail.tsx` : 4 handlers `async` (`handleApprove`,
  `handleRejectConfirm`, `handleDelete`, `handleReverse`) appelés directement par
  `onClick`, **sans garde synchrone** ni `disabled`.
- Aucun test ne couvrait la fenêtre de double-clic.

## Livré

- `src/hooks/useSubmitGuard.ts` : garde anti double-soumission. Un `useRef`
  (mutation **synchrone**, lue immédiatement) bloque le 2ᵉ appel concurrent ;
  `submitting` (état async) ne sert qu'à l'affichage. Réarmement garanti par
  `finally` (un échec ne bloque pas définitivement).
- `src/pages/TransactionDetail.tsx` : les 4 actions financières passent par
  `guard.run(...)` et les boutons portent `disabled={guard.submitting}`.
- `src/hooks/__tests__/useSubmitGuard.test.tsx` (3, jsdom) : **2 clics = 1 seul
  appel** ; bouton désactivé pendant l'exécution ; réarmement après échec.

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (useSubmitGuard) | **3/3** |
| `vitest run` (suite) | **1251/1251** (86 fichiers) |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

## Suite (twin bugs)

La garde est générique et peut être appliquée aux autres écrans financiers
(`Versement`, `Cotisations`, `Giving`, `GroupCotisation`) — à étendre dans un
prochain cycle.
