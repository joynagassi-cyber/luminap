# Capability Seams — Frontières de Migration

> Date : 2026-09-07
> Objet : Identifier les frontières naturelles où insérer les adapters/facades

---

## 1. Méthodologie

Une **seam** (couture) est un point d'extension où on peut insérer un adapter sans modifier le code existant.
On distingue 3 types de seams :

| Type | Description | Exemple |
|------|-------------|---------|
| **Interface seam** | Une interface existe déjà, on change l'implémentation | `AuditLogRepository` |
| **Module seam** | Un module isolé, on remplace par un adapter | `archiveService.ts` → `ArchiveCapability` |
| **Injection seam** | Une dépendance injectée, on remplace l'instance | `OrganizationContext` → valeur |

---

## 2. Seams par Capability

### 2.1 Identity Capability

**Seam actuel** : `src/lib/auth.ts` expose `authService`
**Seam cible** : `IdentityCapability` → `authService` (adapter)

```
┌─────────────────────────────────────────────┐
│  AppRouter / AuthPage / AppContext          │
│         ↓                                   │
│  authService (src/lib/auth.ts)              │  ← seam: remplacer l'implémentation
│         ↓                                   │
│  Supabase Auth                              │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Extraire `authService` dans `src/capabilities/identity/IdentityCapability.ts`
- [ ] Créer interface `IIdentityCapability`
- [ ] Adapter `authService` implémente `IIdentityCapability`
- [ ] Remplacer imports directs par imports de la capability

**Fichiers à modifier** : `src/lib/auth.ts`, `src/pages/AuthPage.tsx`, `src/AppRouter.tsx`, `src/context/AppContext.tsx`

---

### 2.2 Organization Capability

**Seam actuel** : Hardcodes `org-1` disséminés
**Seam cible** : `OrganizationContext` injecté

```
┌─────────────────────────────────────────────┐
│  AppProvider / Store / Services             │
│         ↓                                   │
│  OrganizationContext (org-1 hardcoded)      │  ← seam: remplacer la valeur par défaut
│         ↓                                   │
│  PostgreSQL org_id                          │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/context/OrganizationContext.tsx`
- [ ] Créer `src/lib/orgContext.ts` avec `getOrganizationId()`
- [ ] Remplacer `org-1` par `getOrganizationId()` dans les services
- [ ] Ne PAS toucher les pages (trop risqué)

**Fichiers à modifier** : `src/context/AppContext.tsx`, `src/lib/audit.ts`, `src/lib/archiveService.ts`, `src/lib/auth.ts`, `src/store/useLocalStore.ts` (DEFAULT_USER uniquement)

---

### 2.3 Workflow Capability (Transactions)

**Seam actuel** : `useLocalStore.ts` contient `addTransaction`, `updateTransaction`, `approveTransaction`, etc.
**Seam cible** : `WorkflowCapability` → `TransactionRepo`

```
┌─────────────────────────────────────────────┐
│  Pages (Finance, TransactionNew, etc.)      │
│         ↓                                   │
│  useLocalStore().addTransaction()           │  ← seam: ajouter garde APPROVED
│         ↓                                   │
│  dataLayer.ts (addTransactionPS)            │
│         ↓                                   │
│  PowerSync transactions                     │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/workflow/TransactionCapability.ts`
- [ ] Interface `ITransactionCapability` avec mêmes signatures
- [ ] Adapter `useLocalStore` pour utiliser `TransactionCapability`
- [ ] Ajouter gardes d'immuabilité APPROVED

**Fichiers à modifier** : `src/store/useLocalStore.ts`, `src/lib/dataLayer.ts`, `src/pages/TransactionEdit.tsx`, `src/pages/Finance.tsx`

---

### 2.4 Resource Capability (Accounts/Caixas)

**Seam actuel** : Double modèle `caisses` + `accounts`
**Seam cible** : `ResourceCapability` → `AccountAdapter` → `accounts` table

```
┌─────────────────────────────────────────────┐
│  Dashboard, GroupDetail, Versement          │
│         ↓                                   │
│  useLocalStore().caisses                    │  ← seam: wrapper caisses→accounts
│         ↓                                   │
│  getCaisseForDisplay()                      │
│         ↓                                   │
│  accounts table (canonique)                 │
│  caisses table (legacy)                     │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/resource/ResourceCapability.ts`
- [ ] Implémenter `AccountAdapter` qui lit de `accounts` mais expose interface `Caisse`
- [ ] Garder `caisses` pour rétrocompatibilité
- [ ] Progressive switch vers `accounts` uniquement

**Fichiers à modifier** : `src/lib/account.ts`, `src/pages/Dashboard.tsx`, `src/pages/GroupDetail.tsx`, `src/pages/Versement.tsx`

---

### 2.5 Activity Capability (Cotisations)

**Seam actuel** : Logique dans `useLocalStore.ts` + `cotisation-logic.ts`
**Seam cible** : `ActivityCapability` → `CotisationRepo`

```
┌─────────────────────────────────────────────┐
│  Cotisations.tsx, CulteDetail.tsx           │
│         ↓                                   │
│  useLocalStore().markCotisationPaid()       │  ← seam: isoler la logique
│         ↓                                   │
│  cotisation-logic.ts                        │
│         ↓                                   │
│  PowerSync cotisations                      │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] **CORRIGER** `isPaiementVerrouille` manquant dans `cotisation-logic.ts`
- [ ] Créer `src/capabilities/activity/CotisationCapability.ts`
- [ ] Interface `ICotisationCapability`
- [ ] Adapter `useLocalStore` pour utiliser la capability

**Fichiers à modifier** : `src/lib/cotisation-logic.ts`, `src/store/useLocalStore.ts`, `src/pages/Cotisations.tsx`, `src/pages/CulteDetail.tsx`

---

### 2.6 Relationship Capability (GroupMemberships)

**Seam actuel** : `memberships` dans store, méthodes `addMemberToGroup`, `removeMemberFromGroup`
**Seam cible** : `RelationshipCapability` → `GroupMembershipRepo`

```
┌─────────────────────────────────────────────┐
│  GroupDetail.tsx                            │
│         ↓                                   │
│  useLocalStore().addMemberToGroup()         │  ← seam: isoler
│         ↓                                   │
│  group_memberships table                    │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/relationship/RelationshipCapability.ts`
- [ ] Interface `IRelationshipCapability`
- [ ] Adapter store pour utiliser la capability

**Fichiers à modifier** : `src/store/useLocalStore.ts`, `src/pages/GroupDetail.tsx`

---

### 2.7 Forms Capability

**Seam actuel** : `formSystem.ts` + `customFields.ts` isolés
**Seam cible** : `FormsCapability` → repos existants

```
┌─────────────────────────────────────────────┐
│  FormBuilder.tsx, FormFill.tsx, CustomFields.tsx │
│         ↓                                   │
│  formSystem.ts / customFields.ts            │  ← seam: aucun changement nécessaire
│         ↓                                   │
│  PowerSync form_definitions                 │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/forms/FormsCapability.ts` comme facade
- [ ] Interface `IFormsCapability`
- [ ] Adapter pages pour utiliser la capability

**Fichiers à modifier** : `src/lib/formSystem.ts`, `src/lib/customFields.ts`, `src/pages/FormBuilder.tsx`, `src/pages/FormFill.tsx`, `src/pages/CustomFields.tsx`

---

### 2.8 Permission Capability

**Seam actuel** : `rbac.ts` avec `checkPermission` stub (toujours true)
**Seam cible** : `PermissionCapability` → `PermissionEvaluator` → `role_assignments`

```
┌─────────────────────────────────────────────┐
│  useLocalStore.ts (import checkPermission)  │
│         ↓                                   │
│  rbac.ts (checkPermission → return true)    │  ← seam: remplacer stub par vrai
│         ↓                                   │
│  role_assignments table                     │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/permission/PermissionCapability.ts`
- [ ] Implémenter `PermissionEvaluator` avec vérification réelle
- [ ] Remplacer le stub `checkPermission` par appel à la capability
- [ ] **NE PAS** modifier les gardes existantes (elles sont toutes `true`)

**Fichiers à modifier** : `src/lib/rbac.ts`, `src/store/useLocalStore.ts` (supprimer import mort)

---

### 2.9 Notification Capability

**Seam actuel** : `authOneSignal.ts` + `onesignal.ts`
**Seam cible** : `NotificationCapability` → services existants

```
┌─────────────────────────────────────────────┐
│  AppContext, Notification triggers          │
│         ↓                                   │
│  authOneSignal.ts (login/logout)            │  ← seam: isoler dans capability
│  onesignal.ts (SDK)                         │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/notification/NotificationCapability.ts`
- [ ] Interface `INotificationCapability`
- [ ] Adapter `authOneSignal.ts` pour utiliser la capability

**Fichiers à modifier** : `src/lib/authOneSignal.ts`, `src/lib/onesignal.ts`, `src/context/AppContext.tsx`

---

### 2.10 Reporting Capability

**Seam actuel** : `reporting.ts` avec QueryBuilder + AggregationEngine
**Seam cible** : `ReportingCapability` → `reportEngine`

```
┌─────────────────────────────────────────────┐
│  Reports.tsx, ReportBuilder.tsx             │
│         ↓                                   │
│  reporting.ts (QueryBuilder, Engine)        │  ← seam: isoler
│         ↓                                   │
│  PowerSync transactions                     │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] **CORRIGER** `reporting.ts` qui utilise IndexedDB au lieu de PowerSync
- [ ] Créer `src/capabilities/reporting/ReportingCapability.ts`
- [ ] Interface `IReportingCapability`
- [ ] Adapter pages

**Fichiers à modifier** : `src/lib/reporting.ts`, `src/pages/Reports.tsx`, `src/pages/ReportBuilder.tsx`

---

### 2.11 Lifecycle Capability (Archives)

**Seam actuel** : `archiveService.ts` existe mais n'est pas intégré
**Seam cible** : `LifecycleCapability` → `archiveRegistry`

```
┌─────────────────────────────────────────────┐
│  Archives.tsx, Store (archiveGroup, etc.)   │
│         ↓                                   │
│  archiveService.ts (ArchiveRegistry)        │  ← seam: intégrer l'UI
│         ↓                                   │
│  PowerSync (archived_at, etc.)              │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/lifecycle/LifecycleCapability.ts`
- [ ] Interface `ILifecycleCapability`
- [ ] Intégrer `archiveRegistry` dans `Archives.tsx`
- [ ] Corriger mapping `Account→caisses` vers `Account→accounts`

**Fichiers à modifier** : `src/lib/archiveService.ts`, `src/pages/Archives.tsx`, `src/store/useLocalStore.ts`

---

### 2.12 Audit Capability

**Seam actuel** : `audit.ts` isolé et fonctionnel
**Seam cible** : `AuditCapability` → `auditLogRepo` (déjà une interface)

```
┌─────────────────────────────────────────────┐
│  Tous les services qui appellent writeAudit │
│         ↓                                   │
│  audit.ts (auditLogRepo)                    │  ← seam: déjà une interface, aucun changement
│         ↓                                   │
│  PowerSync audit_entries                    │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/audit/AuditCapability.ts` comme facade
- [ ] Interface `IAuditCapability`
- [ ] Adapter les appels existants vers la capability

**Fichiers à modifier** : `src/lib/audit.ts`, `src/lib/archiveService.ts`, `src/lib/formSystem.ts`, `src/lib/customFields.ts`, `src/lib/reporting.ts`

---

### 2.13 OfflineSync Capability

**Seam actuel** : `dataLayer.ts` + handlers sync (incomplets)
**Seam cible** : `OfflineSyncCapability` → PowerSync + handlers

```
┌─────────────────────────────────────────────┐
│  Toutes les pages en lecture                │
│         ↓                                   │
│  dataLayer.ts (hooks PowerSync)             │  ← seam: compléter les handlers
│         ↓                                   │
│  PowerSync Cloud                            │
└─────────────────────────────────────────────┘
```

**Actions** :
- [ ] Créer `src/capabilities/offline/OfflineSyncCapability.ts`
- [ ] Interface `IOfflineSyncCapability`
- [ ] Ajouter handlers manquants : accounts, versements, groups, members, group_memberships, form_*, custom_*, report_definitions
- [ ] Supprimer handlers obsolètes : caisses, org_units

**Fichiers à modifier** : `src/lib/dataLayer.ts`, `src/lib/sync.ts` (à créer ou compléter)

---

## 3. Seams sans Capability Cible

Certains éléments n'ont pas besoin d'une capability dédiée :

| Élément | Raison | Action |
|---------|--------|--------|
| `utils.ts` | Utilitaires purs, sans état | Conserver tel quel |
| `export.ts` | Fonctions pures de conversion | Conserver tel quel |
| `types/index.ts` | Types TypeScript | Conserver tel quel |
| `api.ts` | API serveur | Conserver tel quel |

---

## 4. Seams Critiques (Order of Operations)

| Ordre | Seam | Criticité | Blocage |
|-------|------|-----------|---------|
| 1 | **Organization** (org-1) | BLOQUANT pour multi-tenant | Aucun |
| 2 | **Workflow** (transaction immunité) | BLOQUANT pour intégrité | Aucun |
| 3 | **Activity** (cotisation — bug isPaiementVerrouille) | BLOQUANT pour cotisations | Aucun |
| 4 | **Resource** (caisses→accounts) | IMPORTANT | 1, 2 |
| 5 | **OfflineSync** (compléter handlers) | IMPORTANT | 1 |
| 6 | **Permission** (rbac stub) | MINEUR | 1 |
| 7 | **Lifecycle** (archive integration) | MINEUR | 4 |
| 8 | **Reporting** (fix dataLayer) | MINEUR | 1 |
| 9 | **Forms**, **Notification**, **Audit** | MINEUR | Aucun |
| 10 | **Relationship** (group memberships) | MINEUR | 4 |

---

## 5. Résumé des Seams par Fichier

| Fichier | Seam(s) concerné(s) | Type |
|---------|---------------------|------|
| `src/store/useLocalStore.ts` | 8 seams (Workflow, Activity, Resource, Organization, Relationship, Lifecycle, OfflineSync, Permission) | **Module seam** |
| `src/lib/auth.ts` | Identity | **Module seam** |
| `src/lib/dataLayer.ts` | OfflineSync | **Module seam** |
| `src/lib/rbac.ts` | Permission | **Module seam** |
| `src/lib/cotisation-logic.ts` | Activity | **Module seam** |
| `src/lib/account.ts` | Resource | **Module seam** |
| `src/lib/audit.ts` | Audit | **Module seam** |
| `src/lib/archiveService.ts` | Lifecycle | **Module seam** |
| `src/lib/formSystem.ts` | Forms | **Module seam** |
| `src/lib/customFields.ts` | Forms | **Module seam** |
| `src/lib/reporting.ts` | Reporting | **Module seam** |
| `src/lib/onesignal.ts` | Notification | **Module seam** |
| `src/lib/authOneSignal.ts` | Notification, Identity | **Module seam** |
| `src/lib/sync.ts` (à créer/compléter) | OfflineSync | **Module seam** |
