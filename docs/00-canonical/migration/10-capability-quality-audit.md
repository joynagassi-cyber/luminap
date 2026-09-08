# Capability Quality Audit

**Date:** 2026-09-08
**Scope:** 5 capabilities — workflow, lifecycle, relationship, resource, security
**Verdict:** Architectural preparation with measurable quality gaps

---

## A. Workflow

### Responsabilit&eacute; r&eacute;elle
M&eacute;canisme g&eacute;n&eacute;rique de guards de transition d'&eacute;tat. Enregistre des pr&eacute;dicats par type de ressource et les applique avant mutation.

### Contrat
```typescript
class WorkflowService {
  register(resource: string, guard: WorkflowGuard): void
  check(resource, currentStatus, targetStatus): GuardResult
  transition<T>(resource, entity, targetStatus, context?): Promise<{success, reason?}>
}
```

### D&eacute;pendances
- `@/types` → `Transaction`, `TransactionStatus` (domaine)
- Aucune d&eacute;pendance PS, store, ou UI
- **GREEN** — ind&eacute;pendante de fait (pas de d&eacute;pendance church directe)

### Consumers
| Consumer | M&eacute;thode | Type |
|----------|-------------|------|
| `useLocalStore.ts:231` | `workflow.check('transaction', ...)` | DIRECT |
| `useLocalStore.ts:250` | `workflow.check('transaction', ..., 'DELETED')` | DIRECT |
| `useLocalStore.ts:267` | `workflow.check('transaction', ..., 'DELETED')` | DIRECT |
| **Total** | **3 appels** | — |

### Multi-domain test
| Domaine | Test conceptuel |
|---------|----------------|
| Church | Transaction workflow — OK (guard enregistre) |
| School | `workflow.register('grade', gradeGuard)` — possible |
| Company | `workflow.register('project', projectGuard)` — possible |
| NGO | `workflow.register('grant', grantGuard)` — possible |

### Persistence
Aucune — pure business logic.

### Audit/Security/Policy
Workflow consomme permission indirectement (les guards bloquent, les pages utilisent security).
**Correct.**

### Invariants
- APPROVED immutable (guard en place dans store)
- **CODE ONLY** — aucun test d'ex&eacute;cution

### Duplication
Aucune.

### Score

| Crit&egrave;re | Score | Justification |
|---------------|-------|---------------|
| Architecture | 4/5 | Guard registry pattern correct. L&acute;interface est g&eacute;n&eacute;rique. |
| Ind&eacute;pendance m&eacute;tier | 4/5 | `WorkflowGuard` prend `TransactionStatus` en param&egrave;tre — l&eacute;g&egrave;rement耦合. |
| Contrat | 4/5 | API claire, singleton, extensible. |
| Isolation persistence | 5/5 | Aucune d&eacute;pendance externe. |
| R&eacute;utilisabilit&eacute; | 3/5 | Peut &ecirc;tre r&eacute;utilis&eacute;, mais seul guard enregistr&eacute; est transaction. |
| Consommation r&eacute;elle | 3/5 | 3 appels, tous depuis le store. Pas de consumer UI direct. |
| Testabilit&eacute; | 2/5 | Aucune test. Guard testable mais non v&eacute;rifi&eacute;. |
| **Total** | **25/35** | |

### Classification
**GOOD BUT PARTIAL** (25/35)

Le m&eacute;canisme est bien con&ccedil;u mais le guard `transactionGuard` utilise `TransactionStatus` (domaine) plut&ocirc;t qu'un type g&eacute;n&eacute;rique `string`. À corriger pour une v&eacute;ritable ind&eacute;pendance.

---

## B. Lifecycle

### Responsabilit&eacute; r&eacute;elle
Service g&eacute;n&eacute;rique d'archive/restore avec politiques par entit&eacute;, persistance PowerSync, et audit.

### Contrat
```typescript
interface LifecyclePolicy {
  canArchive(entityId, context?): Promise<{ok, reason?}>
  canRestore(entityId, context?): Promise<{ok, reason?}>
  onArchive?(entityId): Promise<void>
  onRestore?(entityId): Promise<void>
}
class LifecycleService {
  register(entityType, policy): void
  archive(entityType, entityId, reason, actorId): Promise<void>
  restore(entityType, entityId, reason, actorId): Promise<void>
  listArchived(filters?): Promise<any[]>
  isLifecycleActive(entityType, entityId): Promise<boolean>
}
```

### D&eacute;pendances
- `@/types` → `ArchivableEntity`
- `@/lib/powersync` → `getPowerSyncDatabase()`
- `@/lib/orgContext` → `getOrganizationId()`
- `@/lib/audit` → `auditLogRepo`
- **YELLOW** — d&eacute;pend de l'infrastructure existante (PS, audit, org)

### Consumers
| Consumer | M&eacute;thode | Type |
|----------|-------------|------|
| `useLocalStore.ts:715` | `lifecycle.archive('Group', ...)` | DIRECT |
| `useLocalStore.ts:732` | `lifecycle.restore('Group', ...)` | DIRECT |
| `useLocalStore.ts:988` | `lifecycle.archive('Member', ...)` | DIRECT |
| `useLocalStore.ts:999` | `lifecycle.restore('Member', ...)` | DIRECT |
| `Archives.tsx:61` | `lifecycle.restore(...)` | DIRECT |
| `lifecycle/adapters.ts` | 6 d&eacute;l&eacute;gations | INDIRECT |
| **Total** | **8+ appels** | |

### Multi-domain test
| Domaine | Test conceptuel |
|---------|----------------|
| Church | Group/Member/Event/Account — OK |
| School | Document/User/Class — possible si enregistr&eacute; dans registry |
| Company | Project/Employee/Asset — possible |
| NGO | Beneficiary/Project/Volunteer — possible |

Le registry doit &ecirc;tre aliment&eacute; par chaque domaine. Par d&eacute;faut, 4 entit&eacute;s Church sont dans `ENTITY_TABLE`.

### Persistence
**COUPLED** — appels directs `db.execute()` &agrave; l'int&eacute;rieur de la capability.
Pas d'abstraction repository. Le store doit aussi sync manuellement l'&eacute;tat local.

### Audit/Security/Policy
Appelle `auditLogRepo.write()` et `getOrganizationId()`. Les politiques (canArchive/canRestore) sont fournies par les callers.
**Correct** — la capability ne d&eacute;finit pas ses propres permissions.

### Invariants
- Archive/restore écrit dans audit_entries
- Policy check avant chaque op&eacute;ration
- **CODE + DOCUMENT** — invariants document&eacute;s mais non test&eacute;s

### Duplication
**Probl&egrave;me identifi&eacute;:** `archiveService.ts` (legacy) et `lifecycle/index.ts` contiennent tous deux une logique d'archive/restore redondante.
- `ArchiveRegistry` dans `archiveService.ts` fait presque la m&ecirc;me chose
- `LifecycleService` dans capability fait la m&ecirc;me chose avec policy interface
- **M&eacute;me table mapping** (`ENTITY_TABLE` vs `ENTITY_STORE_MAP`)
- `Archives.tsx` utilise la capability mais les store methods utilisent &eacute;galement la capability (double write)

### Score

| Crit&egrave;re | Score | Justification |
|---------------|-------|---------------|
| Architecture | 4/5 | Policy pattern correct. G&egrave;re events (CANCELLED) vs autres (ARCHIVED). |
| Ind&eacute;pendance m&eacute;tier | 4/5 | `ArchivableEntity` est g&eacute;n&eacute;rique. Pas de termes church dans le code. |
| Contrat | 4/5 | Interface claire, extensible. |
| Isolation persistence | 2/5 | Appel direct `db.execute()` — pas d'abstraction repository. |
| R&eacute;utilisabilit&eacute; | 4/5 | G&eacute;n&eacute;rique mais n&eacute;cessite registry d&eacute;velopp&eacute; par domaine. |
| Consommation r&eacute;elle | 4/5 | 8+ appels, 2 consumers directs. |
| Testabilit&eacute; | 2/5 | Aucun test. Polices non enregistr&eacute;es actuellement. |
| **Total** | **25/35** | |

### Classification
**GOOD BUT PARTIAL** (25/35)

Architecture solide mais persistance coupl&eacute;e directement &agrave; PowerSync. Doublon avec `archiveService.ts` existant.

---

## C. Relationship

### Responsabilit&eacute; r&eacute;elle
Gestion des memberships de groupe via PowerSync. C'est un wrapper tr&egrave;s fin autour de `addGroupMembershipPS`/`removeGroupMembershipPS`.

### Contrat
```typescript
class RelationshipService {
  addMembership(groupId, memberId, role, actorId): Promise<string>
  removeMembership(membershipId, actorId): Promise<void>
  isMember(groupId, memberId): Promise<boolean>  // STUB — retourne toujours false
}
```

### D&eacute;pendances
- `@/lib/dataLayer` → `addGroupMembershipPS`, `removeGroupMembershipPS`
- **RED** — d&eacute;pend de `dataLayer` qui contient la logique membership
- **YELLOW** — `MembershipRole` = `'MEMBRE' | 'RESPONSABLE'` (termes church)

### Consumers
| Consumer | M&eacute;thode | Type |
|----------|-------------|------|
| `useLocalStore.ts:1009` | `relationship.addMembership(...)` | DIRECT |
| `useLocalStore.ts:1018` | `relationship.removeMembership(...)` | DIRECT |
| **Total** | **2 appels** | — |

### Multi-domain test
| Domaine | Test conceptuel |
|---------|----------------|
| Church | GroupMembership — OK (cas d'usage actuel) |
| School | `addMembership(classId, studentId, 'STUDENT')` — possible |
| Company | `addMembership(deptId, employeeId, 'EMPLOYEE')` — possible |
| NGO | `addMembership(projectId, volunteerId, 'VOLUNTEER')` — possible |

Le mod&egrave;le est g&eacute;n&eacute;rique, mais `MembershipRole` est restreint &agrave; 2 valeurs church.

### Persistence
**COUPLED** — d&eacute;l&egrave;gue &agrave; `dataLayer` qui appelle PowerSync directement.
Pas d'abstraction repository dans la capability.

### Audit/Security/Policy
Aucune politique, aucun audit. La capability ne fait que transmettre.
**Neutre** — correct pour un wrapper, mais manque de valeur ajout&eacute;e.

### Invariants
- `isMember` retourne toujours `false` (STUB)
- **CODE ONLY** — comportement actuel document&eacute;

### Duplication
Aucune — c'est un wrapper pur.

### Score

| Crit&egrave;re | Score | Justification |
|---------------|-------|---------------|
| Architecture | 3/5 | Wrapper acceptable mais trop fin. `isMember` stub. |
| Ind&eacute;pendance m&eacute;tier | 3/5 | `MembershipRole` = `'MEMBRE'|'RESPONSABLE'` — church terms. |
| Contrat | 3/5 | API minimale, pas de validation, pas d'audit. |
| Isolation persistence | 2/5 | D&eacute;l&egrave;gue tout &agrave; `dataLayer`. |
| R&eacute;utilisabilit&eacute; | 3/5 | Mod&egrave;le g&eacute;n&eacute;rique, mais roles hardcod&eacute;s. |
| Consommation r&eacute;elle | 2/5 | 2 appels seulement, tous depuis le store. |
| Testabilit&eacute; | 2/5 | Aucun test. `isMember` stub non test&eacute;. |
| **Total** | **18/35** | |

### Classification
**STRUCTURAL PREPARATION** (18/35)

Nom inappropri&eacute;: c'est en r&eacute;alit&eacute; `GroupMembershipCapability`. Trop sp&eacute;cifique pour s'appeler "Relationship". `isMember` stub est un bug architectural.

---

## D. Resource

### Responsabilit&eacute; r&eacute;elle
Acc&egrave;s g&eacute;n&eacute;rique &agrave; toute entit&eacute; PowerSync via une interface unifi&eacute;e avec filtrage et pagination.

### Contrat
```typescript
class ResourceService {
  get<T>(entityType, id): Promise<T|null>
  list<T>(entityType, query?): Promise<ResourceResult<T>>
  listArchived<T>(entityType, query?): Promise<ResourceResult<T>>
  exists(entityType, id): Promise<boolean>
}
interface ResourceQuery { filter?, sortBy?, sortOrder?, limit?, offset? }
interface ResourceResult<T> { items: T[], total: number, hasNext: boolean }
```

### D&eacute;pendances
- `@/lib/powersync` → `getPowerSyncDatabase()`
- `@/lib/orgContext` → `getOrganizationId()`
- **GREEN** — aucune d&eacute;pendance church
- Mapping table interne (Group→groups, Event→events, etc.)

### Consumers
| Consumer | M&eacute;thode | Type |
|----------|-------------|------|
| `Archives.tsx:25` | `resource.listArchived<Group>('Group')` | DIRECT |
| `Archives.tsx:26` | `resource.listArchived<Member>('Member')` | DIRECT |
| `Archives.tsx:27` | `resource.listArchived<Event>('Event')` | DIRECT |
| **Total** | **3 appels** | — |

### Multi-domain test
| Domaine | Test conceptuel |
|---------|----------------|
| Church | Group/Member/Event/Account — OK |
| School | `resource.list<Student>('Student', {filter:[...]})` — possible |
| Company | `resource.list<Employee>('Employee')` — possible |
| NGO | `resource.list<Project>('Project')` — possible |

Fonctionne pour n'importe quelle entit&eacute; avec `org_id`.

### Persistence
**COUPLED** — appels directs `db.execute()`. Pas d'abstraction repository.
Map table hardcod&eacute;e dans `toTableName()`.

### Audit/Security/Policy
Aucune. C'est une couche de lecture.
**Correct** — resource ne doit pas d&eacute;tenir de permission.

### Invariants
- Toujours filtrer par `org_id`
- Conversion snake_case → camelCase automatique
- **CODE ONLY**

### Duplication
Aucune — capability unique pour la lecture.

### Score

| Crit&egrave;re | Score | Justification |
|---------------|-------|---------------|
| Architecture | 5/5 | Pattern g&eacute;n&eacute;rique bien con&ccedil;u. G&eacute;rique, filtrage, pagination. |
| Ind&eacute;pendance m&eacute;tier | 5/5 | Aucun terme church. `entityType` est une string arbitraire. |
| Contrat | 5/5 | API propre, typ&eacute;e, document&eacute;e. |
| Isolation persistence | 2/5 | Appel direct `db.execute()`. |
| R&eacute;utilisabilit&eacute; | 5/5 | Universal — fonctionne pour n'importe quel entity type. |
| Consommation r&eacute;elle | 2/5 | 3 appels, 1 consumer (Archives.tsx). Sous-utilis&eacute;. |
| Testabilit&eacute; | 2/5 | Aucun test. |
| **Total** | **26/35** | |

### Classification
**GOOD BUT PARTIAL** (26/35)

Architecture la plus propre des 5 capabilities. Sous-consomm&eacute;e mais bien conçue. Le seul point faible est la persistance coupl&eacute;e.

---

## E. Security

### Responsabilit&eacute; r&eacute;elle
RBAC &agrave; base de matrice statique avec hi&eacute;rarchie de r&ocirc;les. **Duplique `src/lib/rbac.ts`** — m&ecirc;me matrice, m&ecirc;mes r&ocirc;les, m&ecirc;mes labels.

### Contrat
```typescript
class SecurityService {
  hasPermission(role, permission): boolean
  hasRole(role, resource, action): boolean
  hasHigherOrEqualRole(userRole, requiredRole): boolean
  getRolePermissions(role): Permission[]
  getRolesWithPermission(permission): Role[]
  getRoleLabel(role): string
  getRoleLabels(): Record<Role, string>
  getSortedRoles(): Role[]
  isSpiritualLeader(role): boolean        // CHURCH-SPECIFIC
  canManageFinance(role): boolean          // CHURCH-SPECIFIC
}
```

### D&eacute;pendances
- `@/types` → `Role`
- **RED** — `PERMISSION_MATRIX` contient `'cotisation:manage'` (church)
- **RED** — r&ocirc;les church: `PASTEUR_PRINCIPAL`, `PASTEUR_ASSOCIE`, `PASTEUR_JEUNESSE`
- **RED** — m&eacute;thodes `isSpiritualLeader()` et `canManageFinance()`

### Consumers
| Consumer | M&eacute;thode | Type |
|----------|-------------|------|
| `TransactionDetail.tsx:160` | `security.hasRole(role, 'transaction', 'approve')` | DIRECT |
| `TransactionDetail.tsx:169` | `security.hasRole(role, 'transaction', 'reject')` | DIRECT |
| `TransactionDetail.tsx:198` | `security.hasRole(role, 'transaction', 'delete')` | DIRECT |
| `Groups.tsx:189` | `security.hasRole(role, 'group', 'delete')` | DIRECT |
| `EventDetail.tsx:428` | `security.hasRole(role, 'event', 'delete')` | DIRECT |
| **Total** | **5 appels** | — |

### Multi-domain test
| Domaine | Test conceptuel |
|---------|----------------|
| Church | Roles church + `cotisation:manage` — OK pour Church |
| School | `PASTEUR_*` roles inutilisables. `cotisation:manage` inappropri&eacute;. |
| Company | Roles church non transf&eacute;rables. Impossible sans refonte. |
| NGO | M&ecirc;me probl&egrave;me. |

**Bloquant:** La matrice est church-centric. `cotisation:manage` n'a pas d'&eacute;quivalent universel.

### Persistence
Aucune. Pure evaluation.

### Audit/Security/Policy
La capability EST le syst&egrave;me de permission. C'est sa responsabilit&eacute; s&eacute;mantique.
**Correct** dans son r&ocirc;le, mais la matrice est church-specific.

### Invariants
- `checkPermission` dans `rbac.ts` est un stub (toujours `true`) — **la capability security est inutilis&eacute;e par les gates RBAC actuels**
- Les 3 pages utilisent `security.hasRole()` directement, pas `checkPermission()`
- **CODE ONLY** — les 3 pages font des checks, mais le stub `checkPermission` n'est pas utilis&eacute;

### Duplication
**Probl&egrave;me critique:**
- `security/index.ts` d&eacute;finit `PERMISSION_MATRIX`, `ROLE_LABELS`, `ROLE_HIERARCHY`
- `rbac.ts` d&eacute;finit les **m&ecirc;mes** constantes
- `security` a `isSpiritualLeader()` et `canManageFinance()`
- `rbac.ts` a aussi `isSpiritualLeader()` et `canManageFinance()`
- Les deux fichiers sont identiques sur 80% du contenu
- `canAccess()` dans `rbac.ts` n'est jamais appel&eacute;

### Score

| Crit&egrave;re | Score | Justification |
|---------------|-------|---------------|
| Architecture | 3/5 | Duplique `rbac.ts`. Double d&eacute;finition = dette. |
| Ind&eacute;pendance m&eacute;tier | 2/5 | `cotisation:manage`, `PASTEUR_*`, `isSpiritualLeader()` — church-centric. |
| Contrat | 4/5 | API propre, bien typ&eacute;e. |
| Isolation persistence | 5/5 | Aucune d&eacute;pendance persistence. |
| R&eacute;utilisabilit&eacute; | 2/5 | Roles church intransposables. |
| Consommation r&eacute;elle | 4/5 | 5 appels directs dans 3 pages. |
| Testabilit&eacute; | 2/5 | Aucun test. Stub `checkPermission` non test&eacute;. |
| **Total** | **22/35** | |

### Classification
**STRUCTURAL PREPERATION** (22/35)

Duplication critique avec `rbac.ts`. Rôles church non portables. `cotisation:manage` bloque la r&eacute;utilisabilit&eacute; multi-domaine.

---

## Cross-Capability Findings

### 1. Duplication Security ↔ RBAC
`src/capabilities/security/index.ts` et `src/lib/rbac.ts` contiennent les m&ecirc;mes d&eacute;finitions (PERMISSION_MATRIX, ROLE_LABELS, ROLE_HIERARCHY, isSpiritualLeader, canManageFinance). Cela cr&eacute;e deux sources de v&eacute;rit&eacute; qui divergeront in&eacute;vitablement.

### 2. Doublon Lifecycle ↔ ArchiveService
`LifecycleService` (capability) et `ArchiveRegistry` (legacy `archiveService.ts`) font la m&ecirc;me chose:
- M&ecirc;me `ENTITY_TABLE` / `ENTITY_STORE_MAP`
- M&ecirc;me logique archive/restore
- `Archives.tsx` utilise la capability mais le store utilise &eacute;galement la capability (double commit)
- Aucune politique n'est enregistr&eacute;e (`register()` n'est jamais appel&eacute;)

### 3. Store comme Orchestrateur Central
`tous` les consumers de capabilities passent par `useLocalStore.ts`:
```
UI Page → useLocalStore → Capability → PowerSync
```
M&ecirc;me si 3 pages acc&egrave;dent directement &agrave; `security`, le flux principal reste store-centric.

### 4. Relationship est un Wrapper Trop Fin
Avec seulement 2 appels et un stub `isMember()`, la capability n'apporte pas de valeur ajout&eacute;e par rapport &agrave; un appel direct &agrave; `dataLayer`.

### 5. Workflow Type Coupling
`WorkflowGuard` prend `TransactionStatus` (type domaine) au lieu d'un `string` g&eacute;n&eacute;rique. Le pattern est g&eacute;n&eacute;rique mais le type l'est moins.

---

## Store & Zustand Analysis

### R&ocirc;le r&eacute;el du store
Le store est **application state + orchestration**, pas un legacy facade:
- Il d&eacute;l&egrave;gue les op&eacute;rations PS aux capabilities
- Il g&egrave;re l'&eacute;tat local UI (immediate feedback)
- Il orchestre les side-effects (sync store local + PS)

`useLocalStore` n'est PAS un Runtime Service — c'est un state manager Zustand conforme &agrave; l'architecture.

### Chemin r&eacute;el
```
UI Page → useLocalStore → Capability → PowerSync
   OR
UI Page → Capability (security only, 3 pages)
```

Le store reste syst&eacute;matiquement devant les capabilities pour les op&eacute;rations en &eacute;criture.

---

## Verdict Final

### Workflow: PARTIAL
Architecture g&eacute;n&eacute;rique correcte, mais type coupl&eacute; &agrave; `TransactionStatus` et seul 1 guard enregistr&eacute;.

### Lifecycle: PARTIAL
Bonne architecture avec policies, mais doublon avec `archiveService.ts` et persistance coupl&eacute;e.

### Relationship: WRAPPER
Nom trop large. C'est `GroupMembershipCapability`. `isMember` stub. Trop fin pour &ecirc;tre une vraie capability.

### Resource: REAL (presque)
Architecture la plus propre. 26/35 — manque seulement l'isolation persistence et la consommation.

### Security: STRUCTURAL PREPARATION
Duplication critique avec `rbac.ts`. Roles church intransposables. `canAccess()` du legacy n'est jamais utilis&eacute;.

---

## CAPABILITY ARCHITECTURE = B. SOLIDE MAIS PARTIELLE

### Justification
- 1 capability R&E;ELLE (Resource, presque)
- 2 capabilities GOOD BUT PARTIAL (Workflow, Lifecycle)
- 1 structural preparation (Security)
- 1 wrapper (Relationship)
- TypeScript compile 0 erreur
- Aucune d&eacute;pendance IndexedDB dans les capabilities
- `org-1` absent des capabilities (isol&eacute; dans `orgContext.ts`)

---

## Prochaine &Eacute;tape Prioritaire

### A. Renforcer Security en d&eacute;duplicant avec rbac.ts

**Impact:** + / **Risque:** Moyen / **Valeur architecturale:** Haute

**Pourquoi:**
- La duplication `security/index.ts` ↔ `rbac.ts` est la plus grande dettes architecturale actuelle
- Les 3 pages utilisent `security.hasRole()` directement au lieu de `checkPermission()` du legacy
- La matrice church-centric bloque toute migration multi-domaine
- Corriger cette duplication permet de clarifier: est-ce que Security est la source de v&eacute;rit&eacute; ou est-ce que rbac.ts l'est?

**Action:**
1. Supprimer les d&eacute;finitions dupliqu&eacute;es de `security/index.ts`
2. Faire importer `security` depuis `rbac.ts` (ou inversement)
3. Uniformiser: soit `security` est la source, soit `rbac.ts` est la source
4. Retirer `cotisation:manage` de la matrice (move vers domain policy)
5. Retirer `isSpiritualLeader`/`canManageFinance` (move vers domain service)

**Alternatives rejet&eacute;es:**
- B. Extraire une capability manquante: pas prioritaire avant de nettoyer ce qui existe
- C. D&eacute;couper Resource: pas n&eacute;cessaire — c'est la plus saine
- D. Retirer Relationship: trop gros changement, peu de valeur
- E. Migrer un domaine legacy: pr&eacute;f&eacute;rer nettoyer d'abord

---

*Audit compl&eacute;t&eacute;. TypeScript: exit 0. Aucun commit cr&eacute;&eacute;. Aucune nouvelle capability cr&eacute;&eacute;e.*
