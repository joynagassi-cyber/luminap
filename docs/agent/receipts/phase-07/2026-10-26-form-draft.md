# Receipt — Phase 7 : brouillon de saisie longue (PM7)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-07-form-draft`
- **Défaut visé** (pre-mortem PM7, priorité **36**) : une session qui expire (ou
  un écran qui se ferme) pendant qu'un utilisateur remplit un formulaire long
  lui fait **tout retaper** — aucune sauvegarde de brouillon n'existait
  (`grep -rn "draft|brouillon|autosave" src/pages/FormFill.tsx` → rien).

## Livré

- `src/hooks/useFormDraft.ts` (nouveau) — état de saisie persistant :
  - `useFormDraft(key, initial, enabled)` → `{ value, setValue, restored, discard }` ;
  - `readDraft` / `writeDraft` / `clearDraft` (clés `lumina-draft:*`, donc
    balayées par la purge de changement de compte PM18 et la réinitialisation
    locale PM15) ;
  - n'écrase **pas** le brouillon restauré au premier rendu.
- `src/pages/FormFill.tsx` — brouillon `form:${id}` ; avis « Brouillon
  restauré » + bouton « Recommencer » ; brouillon effacé après soumission
  réussie.

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (useFormDraft) | **6/6** |
| `vitest run` (suite) | **1270/1270** (90 fichiers) |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

## Reste (assumé)

Le hook est générique ; il est branché sur le formulaire le plus long
(`FormFill`). Les formulaires financiers (`TransactionNew`) ont des champs
dépendants d'entités (catégories, caisses, événements) qui se chargent de
façon asynchrone — un brouillon doit y être réconcilié avec ces listes avant
d'être généralisé. Non fait ici pour ne pas livrer une restauration partielle
trompeuse.
