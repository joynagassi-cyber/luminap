# Receipt — R122 : re-parentage sous une annexe (profondeur non plafonnée)

- **Date** : 2026-10-28
- **Phase** : 3 (multi-organisation / fédération)
- **Branche** : `agent/r122-reparent-depth`
- **Statut** : ✅ CORRIGÉ

## Défaut (produit)

`Federation.tsx` : le sélecteur de **création** offre « toute org visible »
(`allOrgs`) ; le sélecteur de **re-parentage** n'offrait que les **racines**
(`rootOrgs`). Conséquence : impossible de déplacer une organisation **sous une
annexe existante** — la fédération se trouvait plafonnée à une profondeur de 1
via l'UI, contre le contrat Phase 3 (« profondeur/largeur non plafonnées »).

Second défaut : la liste n'excluait pas les **descendants** de l'org déplacée →
des cibles créant un cycle étaient proposées (refusées ensuite, sans explication).

## Correctif

Primitive pure `reparentTargets(orgId, rows)` dans `src/lib/orgTree.ts` : toute
organisation sauf self et descendants (via `wouldCreateCycle`, même source de
vérité que l'écriture). `Federation.tsx` l'utilise pour peupler le sélecteur.

## Garde anti-dérive

`src/lib/__tests__/org-tree.test.ts` (+6 tests) :

1. propose les annexes (pas seulement les racines) ;
2. exclut l'organisation elle-même ;
3. exclut les descendants ;
4. cohérence : toute cible proposée passe `assertReparentAllowed` ;
5. câblage : la page utilise `reparentTargets(reparentOrg, allOrgs)` ;
6. câblage : les options du sélecteur viennent de `reparentCandidates`.

**Non-vacuité prouvée** : retour au code fautif → 2 échecs ; restauré → 17/17.

## Gates

- `npx vitest run` : **1557/1557** (125 fichiers)
- `npx tsc -b` : 0 erreur
- `npx eslint` (fichiers touchés) : 0 erreur
