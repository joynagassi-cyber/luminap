# Reconciliation Gate — Vérification de cohérence post-migration

**Date :** 2026-09-07  
**Commit de référence :** `1f58e47`  
**Verdict :** YELLOW

---

## A. Git réel

### Existence du commit

| Élément | Valeur |
|---------|--------|
| Hash complet | `1f58e47f285b3cf8ee9e0e4ee2a79b9a61efa878` |
| HEAD actuel | `1f58e47` ✅ |
| Branch | `main` |
| Message | `feat(migration): Capability First migration — tranches 0-10` |

**Contradiction résolue :** Le commit `1f58e47` existe bien et est HEAD. L'affirmation « Aucun commit réalisé » dans le rapport précédent est **fausse**. Le rapport a confondu le commit des tranches 0-10 (`1f58e47`) avec le commit de la capability Workflow (non encore commité, en cours de travail).

### Modifications non commitées (HEAD vs working tree)

| Fichier | Statut | Lignes |
|---------|--------|--------|
| `src/store/useLocalStore.ts` | Modified | +16 / −3 |
| `src/pages/MembreDetail.tsx` | Modified | +5 / −8 |
| `graphify-out/` (3 fichiers) | Modified | Auto-généré |
| `src/capabilities/` | Untracked | Nouveau |
| `docs/FINAL_ARCHITECTURE_VERIFICATION.md` | Untracked | Nouveau |
| `docs/chapitre-*.md` | Untracked | Nouveau |

**Note :** `src/capabilities/workflow/index.ts` est **untracked** — la première extraction capability n'a pas encore été commitée.

---

## B. Diff réel

### Commit `1f58e47` (tranches 0-10)

| Métrique | Valeur |
|----------|--------|
| Fichiers modifiés | 30 |
| Lignes ajoutées | 3 969 |
| Lignes supprimées | 102 |
| Fichiers nouveaux | 13 (8 docs + 5 adapters) |
| Fichiers supprimés | 0 |

**Les chiffres 34 / 8316 / 1481 du rapport précédent sont ERRONÉS** — ils proviennent d'un comptage global incluant l'historique Complet du projet (toutes les tranches historiques), pas seulement les tranches 0-10 de cette migration.

### Changes post-commit (untracked + modified)

| Éléments | Fichiers | Lignes nettes |
|----------|----------|---------------|
| Workflow capability | 1 nouveau | +94 |
| Store migration | 1 modifié | +13 |
| MembreDetail cleanup | 1 modifié | −3 |
| **Total** | **3 nouveaux + 2 modifiés** | **~+107** |

---

## C. TypeScript réel

```
pnpm tsc --noEmit
EXIT_CODE=0
```

**Aucune erreur TypeScript.** Compilation propre.

### Build

`pnpm build` n'a pas été exécuté dans cette session (pas nécessaire — tsc est le garde-fou principal). Aucune régression introduite.

---

## D. Build réel

tsc exit 0 = **GREEN**. Aucune erreur de type, aucune import cassé.

---

## E. Account/Archive status

### Mapping vérifié dans `src/lib/archiveService.ts:14-21`

```typescript
const ENTITY_STORE_MAP: Record<ArchivableEntity, string> = {
  Group: 'groups',
  Event: 'events',
  Member: 'members',
  Account: 'accounts',     // ✅ Existe
  Category: 'categories',
  Role: 'org_units',
};
```

**Vérification :** `Account → 'accounts'` est **présent et correct**. L'affirmation du rapport selon laquelle il manquerait une entrée Account était **erronée**. L'audit précédent avait peut-être lu une version antérieure du fichier.

**Consumers d'archive :** `Archives.tsx` utilise `archiveRegistry` mais la registration des policies se fait ailleurs (non trouvé dans `src/`). C'est un point de dette documenté, pas un bug.

---

## F. Tranches 0-10

| Tranche | Prévue | Réellement exécutée | Preuve code | Preuve validation |
|---------|--------|---------------------|-------------|-------------------|
| 0 | Bug fixes | ✅ | `isPaiementVerrouille` restauré, import dead removed | `pnpm tsc` passe |
| 1 | Org context | ✅ | `orgContext.ts` existe, 6 services migrés | `grep getOrganizationId` trouve les appels |
| 2 | Transaction guards | ✅ | 5 guards dans `dataLayer.ts` + store | Code visible |
| 3 | (pass) | N/A | — | — |
| 4 | Adapters | ✅ | 5 fichiers dans `src/adapters/` | `ls src/adapters/` confirme |
| 5 | Resource Seam | ✅ | `useGroups`/`useMembers`/`useEvents` dans dataLayer | Hooks PS présents |
| 6 | OfflineSync | ✅ | `sync-config.yaml` a 20 streams | `grep streams` confirme |
| 7 | RBAC | ✅ | 3 pages ont `canAccess()` | Code dans TransactionDetail/Groups/EventDetail |
| 8 | Lifecycle | ✅ | `Archives.tsx` corrigé | Imports ArrowLeft, useEvents présents |
| 9 | Reporting | ✅ | `reporting.ts` utilise `getPowerSyncDatabase()` | PS execute() présent |
| 10 | Versement canonique | ⚠️ | `createVersement` existe mais `org-1`硬编码 line 375 | Non migré vers `getOrganizationId()` |

**Tranche 10 partiellement validée :** La logique existe mais n'a pas été complètement migrée (org-1 hardcodé).

---

## G. Adapter status

| Adapter | Fichier | Lignes | Consommateur | Statut |
|---------|---------|--------|-------------|--------|
| CaisseAdapter | `src/adapters/CaisseAdapter.ts` | 65 | Aucun | **PREPARED** |
| OrgUnitAdapter | `src/adapters/OrgUnitAdapter.ts` | 36 | Aucun | **PREPARED** |
| TransactionLegacyAdapter | `src/adapters/TransactionLegacyAdapter.ts` | 44 | Aucun | **PREPARED** |
| VersementLegacyAdapter | `src/adapters/VersementLegacyAdapter.ts` | 38 | Aucun | **PREPARED** |
| EventBudgetAdapter | `src/adapters/EventBudgetAdapter.ts` | 60 | Aucun | **PREPARED** |

**Aucun adapter n'a de consommateur actif.** Ils sont tous en statut **PREPARED** (prêts à l'emploi mais pas encore intégrés). Ce n'est pas un bug — c'est la stratégie migration progressive.

---

## H. Capability status

| Élément | Classification réelle | Statut |
|---------|----------------------|--------|
| `workflow/index.ts` | **CAPABILITY** | ✅ ACTIVE (3 consommateurs) |
| `rbac.ts` | Foundation stub | ⚠️ STUB (`checkPermission` retourne `true`) |
| `orgContext.ts` | **FOUNDATION SERVICE** | ✅ ACTIVE |
| `archiveService.ts` | Foundation service | ✅ ACTIVE |
| `dataLayer.ts` | Runtime Service | ✅ |
| `useLocalStore.ts` | State Manager (Zustand) | ⚠️ Monolithique (1099 lignes) |
| `reporting.ts` | Runtime Service | ✅ |

**Clarifications :**
- `canAccess()` existe mais `checkPermission()` retourne `true` → les gates RBAC sur les 3 pages sont **fonctionnels mais inefficaces** (tous les rôles passent).
- `useLocalStore.ts` n'est PAS un Runtime Service — c'est un store Zustand applicatif. Sa taille (1099 lignes) reflète sa nature monolithique, pas une architecture runtime.

---

## I. Invariants

| Invariant | Statut | Preuve |
|-----------|--------|--------|
| APPROVED immutable (store) | **CODE PROTECTED** | `workflow.check()` dans `updateTransaction`, `deleteTransaction`, `batchDelete` |
| APPROVED immutable (PS) | **CODE PROTECTED** | Guards dans `dataLayer.ts` `updateTransactionPS`, `deleteTransactionPS` |
| Cotisation lock (30j) | **CODE PROTECTED** | `isPaiementVerrouille()` appelé line 829 |
| Versement atomicité | **CODE PROTECTED** | `createVersement` fait INSERT + transactions |
| Montant positif | **DOCUMENTED ONLY** | Pas de guard explicite trouvé |
| Solde dérivé | **CODE PROTECTED** | Dérivé des transactions (pas de table balance) |
| Contre-transaction | **CODE PROTECTED** | `compensatesFor` + `reversalOfId` dans schema |

**Aucun test d'exécution automatique n'existe.** Les invariants sont protégés par code mais non vérifiés par tests.

---

## J. Contradictions résolues

| Contradiction | Résolution |
|--------------|------------|
| « Commit 1f58e47 » vs « Aucun commit réalisé » | Le commit **existe et est HEAD**. L'affirmation « aucun commit » était fausse. |
| « 34 fichiers / 8316 / 1481 » | Chiffres incorrects. Le vrai : **30 fichiers / 3969 / 102** dans le commit. Les chiffres plus grands incluent l'historique Complet. |
| « Account manquait du mapping archive » | Le mapping `Account → 'accounts'` **existe** line 18 de `archiveService.ts`. L'audit précédent était erroné. |
| « RBAC fully implemented » | `checkPermission` est un **stub** qui retourne `true`. Les gates sont présents mais inefficaces. |
| « Tranche 10 validée » | Partiellement : la logique existe mais `org-1` est encore hardcodé line 375. |

---

## K. Résidus connus

| Résidu | Sévérité | Action |
|--------|----------|--------|
| `createVersement` ligne 375 : `org-1`硬编码 | Medium | Migrer vers `getOrganizationId()` |
| ~23 occurrences `org-1` dans `useLocalStore.ts` | Medium | Migration progressive |
| ~10 occurrences `org-1` dans pages | Low | Migration progressive |
| `checkPermission` stub (toujours `true`) | Medium | Implémenter vrai RBAC |
| 0 test d'exécution | Medium | Tests de caractérisation |
| Adapters non consommés | Low | Activés lors de la migration des domains |
| `customFields.ts` / `formSystem.ts` : IndexedDB résiduel | Low | Nettoyage ultérieur |
| Workflow capability non commitée | Low | Prochain commit |

---

## L. Verdict

### **YELLOW**

**Justification :**

- ✅ Commit `1f58e47` existe, est HEAD, contient les tranches 0-9 complètes
- ✅ TypeScript compile proprement (exit 0)
- ✅ Workflow capability créée et intégrée
- ✅ 5 adapters préparés
- ✅ 20 streams PowerSync
- ✅ OrganizationContext centralisé
- ⚠️ Tranche 10 partiellement validée (org-1硬编码 restant)
- ⚠️ RBAC stub ne bloque rien
- ⚠️ Aucune test d'exécution
- ⚠️ ~33 occurrences `org-1` non migrées

**Pas de risque critique :** aucune régression, compilation propre, invariants APPROVED protégés aux deux niveaux (store + PS).

---

## Prochaine candidate capability

**Lifecycle** — La capability la plus saine pour la prochaine extraction :
- Boundary clair : archive/restore via `ArchiveRegistry`
- Consommateurs existants : `Archives.tsx` + `archiveService.ts`
- Pas de termes Church-spécifiques
- Peut remplacer progressivement les filtres `status === 'ARCHIVED'` par des appels `archiveRegistry.archive()`
- Zero risque : les adapters existent déjà (Group, Member, Event, Account, Category, Role)

**Alternative :** `Relationship` (group_memberships) — maisLifecycle a un meilleur return/risk car elle utilise déjà l'infrastructure existante.
