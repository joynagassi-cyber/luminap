# Receipt — PR1 : journal d'audit consultable (détail d'entrée)

- **Phase** : 11 (durcissement robustesse/intégrité)
- **Priorité** : P0 (intégrité — sans détail, la trace n'est pas un audit)
- **Branche** : `agent/pr1-audit-journal-detail`
- **Date** : 2026-10-31

## Défaut

`/trace` listait les entrées d'audit (action, entité, date) mais chaque ligne
rendait un `ChevronRight` **MORT** (aucun gestionnaire de clic). Les champs
`before_state`, `after_state`, `actor_role_at_time` et `comment` étaient **lus**
par `useAuditEntries()` (`src/lib/dataLayer.ts`) mais **jamais affichés**.

Conséquence : un utilisateur voyait « Modifié » sans jamais savoir **ce qui**
avait changé, **par qui** (rôle au moment de l'action) ni **pourquoi**
(commentaire). Auditer une action sensible était **impossible** — c'est l'écart
d'intégrité fermé ici.

## Correctif

1. Nouveau composant `src/components/AuditEntryDetail.tsx` :
   - affiche le **rôle au moment de l'action** (via `ROLE_LABELS`) et le
     **commentaire** ;
   - calcule un **DIFF** `before_state` → `after_state` (décodage tolérant :
     `null`, chaîne `"null"` historique, JSON valide, texte brut) ;
   - ne liste que les clés **réellement changées** quand les deux états sont des
     objets (ajouté / retiré / modifié) ;
   - libellés français explicites : **« Créé »** sans `before_state`,
     **« Supprimé »** sans `after_state` ;
   - un JSON **illisible** n'écrase pas l'écran : la valeur brute est affichée
     et l'erreur est instrumentée via `captureClientError` (R88).
2. `src/pages/Trace.tsx` : la ligne morte devient un **bouton** accessible
   (`aria-expanded`, `aria-controls`) qui déplie le détail. La liste, les filtres
   et la recherche restent inchangés ; le garde `isPowerSyncReadyNow()` (R52)
   n'est pas touché.
3. Design tokens uniquement (`var(--...)`) ; aucun nouveau tableau ni migration ;
   l'écriture d'audit n'est pas modifiée.

## Preuves

- `src/pages/__tests__/Trace-detail.test.tsx` : **4 tests**, tous verts.
  - dépliage accessible (`aria-expanded`/`aria-controls`, panneau présent) ;
  - champ modifié affiché ancien → nouveau, clé **inchangée non listée** ;
  - « Créé » sans `before_state`, « Supprimé » sans `after_state` ;
  - JSON illisible : pas de crash + valeur brute affichée + `captureClientError`.
- **Non-vacuité vérifiée (2 mutations)** :
  1. retirer `<AuditEntryDetail entry={entry} />` du rendu → **4/4 échecs** ;
  2. retirer uniquement la branche de DIFF (`audit-diff`) → **2/4 échecs**
     (champ modifié + libellés de diff).
  Source restaurée après chaque mutation.
- `npx tsc -b --noEmit` → **0 erreur**
- `npx eslint` → **0 erreur** (warnings préexistants inchangés)
- `npx vitest run` → **1761/1761**, 163 fichiers
- `npx vite build` → **OK**

## Fichiers

- `src/components/AuditEntryDetail.tsx` (nouveau)
- `src/pages/Trace.tsx`
- `src/pages/__tests__/Trace-detail.test.tsx` (nouveau)
- `src/pages/Tutorial.tsx` (entrée Phase 13 « Trace d'activité »)
- `docs/agent/COVERAGE_MATRIX.md` (1 ligne)
