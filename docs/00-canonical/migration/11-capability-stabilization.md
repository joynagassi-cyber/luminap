# Capability Stabilization

> Date: 2026-09-08
> Tests: 132/132 passing (↑16) | TypeScript: exit 0
> Verdict: **B. STABLE BUT PARTIAL**

---

## A. Architecture Actuelle

5 capabilities opérationnelles dans `src/capabilities/`:

| Capability | Lignes | Consumers Store | Consumers UI | Score | Classification |
|---|---|---|---|---|---|
| workflow | 94 | 3 | 0 | 25/35 | PARTIAL |
| lifecycle | 218 (+77 adapters) | 4 | 1 | 25/35 | PARTIAL |
| relationship | 66 | 2 | 0 | 18/35 | WRAPPER |
| resource | 271 | 0 | 1 | 26/35 | REAL |
| security | 72 | 0 | 3 | 22/35 | STRUCTURAL |

**Aucune dépendance circulaire.** Aucune capability n'importe une autre capability ou une page/component.

---

## B. Workflow

- **Patron**: Guard registry par type de ressource
- **Problème**: `WorkflowGuard` prend `TransactionStatus` (domaine) au lieu de `string` générique
- **Classification**: PARTIAL — mécanisme correct mais type couplé

---

## C. Lifecycle

- **Patron**: Policy interface avec canArchive/canRestore + audit
- **Problème**: Doublon avec `archiveService.ts` (ArchiveRegistry)
- **Action**: `archiveService.ts` marqué @deprecated
- **Classification**: PARTIAL — architecture solide mais persistance couplée

---

## D. Relationship

- **Patron**: Wrapper fin autour de group_memberships
- **Problème**: `isMember()` ne filtrait pas par org_id
- **Action**: Correction du filtrage org_id + commentaire documentant le sous-ensemble
- **Classification**: WRAPPER — nom trop large, actuellement GroupMembershipCapability

---

## E. Resource

- **Patron**: Accès générique typed à toute entité PowerSync
- **API**: get, list, listByStatus, listArchived, exists
- **Classification**: REAL — architecture la plus propre des 5 capabilities

---

## F. Security

- **Patron**: Facade thin sur `src/lib/rbac.ts`
- **Actions**: `canAccess()` supprimé (dead code), fonctions church-specific marquées JSDoc
- **Classification**: STRUCTURAL PREPARATION — source de vérité unique dans rbac.ts

---

## G. Graphe de Dépendances

```
workflow ← (rien)
lifecycle ← (rien)
relationship ← (rien)
resource ← (rien)
security ← (rien)
```

Toutes les dépendances vont vers le bas (infrastructure). **0 cycle.**

---

## H. Store Responsibility Map

| Responsabilité | Type | Capability Cible |
|---|---|---|
| Transaction CRUD + workflow guards | A+C | workflow + resource |
| Member CRUD + lifecycle | A+C | relationship + lifecycle |
| Group CRUD + lifecycle | A+C | relationship + lifecycle |
| Cotisation logic | B | Activity (future) |
| Versement creation | B | Workflow (future) |

**Prochaine migration recommandée**: Transaction CRUD du store vers workflow + resource.

---

## I. Couplage Persistence

| Capability | Couplage |
|---|---|
| workflow | NONE |
| security | NONE |
| relationship | COUPLED (→ dataLayer → PS) |
| resource | COUPLED (db.execute directs) |
| lifecycle | COUPLED (db.execute directs) |

**Recommandation**: Acceptable pour la phase de stabilisation. Tests utilisent mock de `getPowerSyncDatabase()`.

---

## J. Business Pack Independence

| Capability | Church | School | Company | NGO |
|---|---|---|---|---|
| workflow | ✅ | ✅ | ✅ | ✅ |
| lifecycle | ✅ | ✅ | ✅ | ✅ |
| relationship | ⚠️ | ✅ | ✅ | ✅ |
| resource | ✅ | ✅ | ✅ | ✅ |
| security | ❌ | ❌ | ❌ | ❌ |

**Security est le seul blocage** pour la portabilité multi-domaine.

---

## K. Garde-fous Ajoutés

1. **ESLint**: Règle `no-restricted-imports` pour interdire imports UI depuis capabilities
2. **Test**: `no-cross-imports.test.ts` — 16 tests vérifiant l'absence de dépendances croisées et de cycles
3. **Documentation**: Règle "nouvelle capability" documentée dans chaque fichier
4. **Marquage**: Fonctions church-specific marquées avec JSDoc

---

## L. Risques Résiduels

| Risque | Sévérité | Statut |
|---|---|---|
| Duplication security/rbac | ÉLEVÉ | **CORRIGÉ** — rbac.ts est la source unique |
| Lifecycle doublon | MOYEN | **CORRIGÉ** — archiveService.ts déprécié |
| Relationship isMember | MOYEN | **CORRIGÉ** — filtrage org_id ajouté |
| Security church-centric | MOYEN | Documenté — nécessite refonte Business Pack |
| Workflow type coupling | FAIBLE | Documenté comme limitation |

---

## M. Prochaine Étape

**A. Migrer les transactions du store vers workflow + resource**

Les transactions sont le cœur métier de Lumina. Le pattern store→workflow→PS est déjà établi (3 appels existants). Étendre aux CRUD complètes renforce l'architecture sans créer de nouvelle capability.

---

## N. Actions Exécutées

| # | Action | Fichiers |
|---|---|---|
| 1 | Supprimer `canAccess()` dead code | `src/lib/rbac.ts` |
| 2 | Marquer church-specific functions | `src/lib/rbac.ts` |
| 3 | Règle architecturale security | `src/capabilities/security/index.ts` |
| 4 | Déprécier archiveService.ts | `src/lib/archiveService.ts` |
| 5 | Corriger isMember avec org_id | `src/capabilities/relationship/index.ts` |
| 6 | Règle ESLint no-restricted-imports | `eslint.config.js` |
| 7 | Test architecture (no-cross-imports) | `src/capabilities/__tests__/no-cross-imports.test.ts` |
| 8 | Corriger mocks relationship | `relationship.test.ts`, `setup.ts` |

---

## O. Règle d'Arrêt

- ✅ Tests 132/132 passing (↑16)
- ✅ TypeScript exit 0
- ✅ Build: erreur pré-existante non liée (Redirect react-router)
- ✅ Rapport créé
- ✅ Aucune nouvelle capability créée
- ✅ Aucune migration SQL effectuée

**STOP**
