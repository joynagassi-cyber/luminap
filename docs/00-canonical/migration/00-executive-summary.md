# Rapport Final de Migration — Capability First

> Date : 2026-09-07
> Objet | Résumé de l'audit de migration Lumina vers Capability First

---

## A. État Actuel

### 1. Architecture Actuelle

| Couche | Technologie | État |
|--------|------------|------|
| **Frontend** | React + TypeScript + Vite | ✅ Opérationnel |
| **State** | Zustand (useLocalStore.ts) | ⚠️ 1087 lignes, trop gros |
| **Data Layer** | PowerSync + IndexedDB | ✅ Hybride |
| **Backend** | Supabase (PostgreSQL) | ✅ 21 tables |
| **Auth** | Supabase Auth + Google OAuth | ✅ Fonctionnel |
| **Notifications** | OneSignal (Capacitor) | ✅ Fonctionnel |
| **Mobile** | Capacitor (Android) | ✅ Ready |

### 2. Codebase Stats

| Métrique | Valeur |
|----------|--------|
| Fichiers TypeScript | 85 |
| Lignes totales | ~10 800 |
| Store principal | 1 087 lignes |
| Pages | 36 |
| Hardcodes `org-1` | 41 occurrences |
| Imports morts | 1 (`checkPermission` non utilisé) |
| Bugs critiques | 1 (`isPaiementVerrouille` manquant) |

### 3. Problèmes Identifiés

| Problème | Sévérité | Impact |
|----------|----------|--------|
| `isPaiementVerrouille` non défini | 🔴 BLOQUANT | Crash au paiement cotisation |
| `checkPermission` importé mais jamais utilisé | 🟡 MINEUR | Code mort |
| `org-1` hardcodé 41 fois | 🟡 MOYEN | Multi-tenant impossible |
| Caisses/Accounts en duplication | 🔴 ÉLEVÉ | Incohérence financière |
| OrgUnits/Groups en duplication | 🟡 MOYEN | Double modèle |
| Versements non canoniques | 🔴 ÉLEVÉ | Pas de table versements utilisée |
| Sync incomplet (10+ handlers manquants) | 🔴 ÉLEVÉ | Perte de données |
| ArchiveRegistry non intégré | 🟡 MOYEN | Feature non fonctionnelle |
| Reporting utilise IndexedDB | 🟡 MOYEN | Données périmées |
| Transaction APPROVED non immuable | 🔴 ÉLEVÉ | Violation invariant |

---

## B. Capability Map

### Capabilities Identifiées

| Capability | Domaine | Déjà Partiellement Implémenté | Actions Requises |
|-----------|---------|------------------------------|-----------------|
| **Identity** | Auth | ✅ AuthService | Extraire dans capability |
| **Organization** | Contexte org | ❌ Hardcodes | Créer context + service |
| **Resource** | Accounts | ⚠️ Double modèle | Adapter caisses→accounts |
| **Workflow** | Transactions | ✅ Store methods | Ajouter gardes + capability |
| **Activity** | Événements/Cotisations | ✅ Store methods | Extraire + corriger bug |
| **Forms** | Formulaires | ✅ Libs existantes | Créer capability facade |
| **Relationship** | GroupMemberships | ✅ Store methods | Créer capability |
| **Permission** | RBAC | ⚠️ Stub | Implémenter vrai evaluator |
| **Notification** | Push | ✅ Services | Créer capability |
| **Reporting** | Rapports | ✅ Engine | Corriger data layer |
| **Lifecycle** | Archives | ⚠️ Service non intégré | Intégrer UI |
| **Audit** | Traçabilité | ✅ Repository | Créer capability facade |
| **OfflineSync** | Sync | ⚠️ Incomplet | Compléter handlers |

### Capabilities Non Nécessaires

| Capability | Raison |
|-----------|--------|
| **Search** | Pas de besoin réel — filtres côté client suffisants |
| **Branding** | Couleurs hardcodées, pas de besoin d'abstraction |
| **Vocabulary** | Catégories suffisantes, pas de thesaurus |

---

## C. Migration Seams

### Seams Identifiés (13 seams)

| Seam | Type | Fichier Cible |
|------|------|--------------|
| Identity | Module | `src/lib/auth.ts` → `IdentityCapability` |
| Organization | Injection | `org-1` → `OrganizationContext` |
| Workflow | Interface | `useLocalStore` → `TransactionCapability` |
| Resource | Adapter | `caisses` → `CaisseAdapter` → `accounts` |
| Activity | Module | `cotisation-logic.ts` → `CotisationCapability` |
| Relationship | Module | `memberships` → `RelationshipCapability` |
| Forms | Module | `formSystem.ts` → `FormsCapability` |
| Permission | Module | `rbac.ts` stub → `PermissionCapability` |
| Notification | Module | `onesignal.ts` → `NotificationCapability` |
| Reporting | Module | `reporting.ts` → `ReportingCapability` |
| Lifecycle | Module | `archiveService.ts` → `LifecycleCapability` |
| Audit | Module | `audit.ts` → `AuditCapability` |
| OfflineSync | Module | `dataLayer.ts` → `OfflineSyncCapability` |

### Adapters Nécessaires (5 adapters)

| Adapter | Rôle | Complexité |
|---------|------|-----------|
| `CaisseAdapter` | Caisses → Accounts | Faible |
| `OrgUnitAdapter` | OrgUnits → Groups | Faible |
| `TransactionLegacyAdapter` | Mapping PS → TS | Faible |
| `VersementLegacyAdapter` | Transactions → Versement | Faible |
| `EventBudgetAdapter` | JSONB → Tables | Moyen |

---

## D. Legacy à Conserver

###_modules_à_conserver_tel_quel

| Module | Raison |
|--------|--------|
| `utils.ts` | Utilitaires purs, sans état |
| `export.ts` | Fonctions pures de conversion |
| `types/index.ts` | Types TypeScript |
| `api.ts` | API serveur |
| `dataLayer.ts` | Couche données (adaptation) |

### Modules à adapter (pas supprimer)

| Module | Transformation |
|--------|---------------|
| `useLocalStore.ts` | Extraire méthodes vers capabilities |
| `sync.ts` (à créer) | Ajouter handlers manquants |
| `archiveService.ts` | Intégrer dans LifecycleCapability |

### Tables à conserver

| Table | Raison |
|-------|--------|
| `transactions` | Cœur financier |
| `members` | Données métier |
| `groups` | Structure organisationnelle |
| `events` | Événements |
| `accounts` | Comptes canoniques |
| `caisses` | Legacy — à déprécier |
| `org_units` | Legacy — à déprécier |
| `cotisations` | Métier spécifique |
| `versements` | Canonique — à utiliser |
| `audit_entries` | Traçabilité |
| `notifications` | Notifications |
| `profiles` | Authentification |
| `role_assignments` | Permissions |

---

## E. Capabilities à Créer

### Priorité Haute (Tranche 1-3)

| Capability | Fichier | Dépend |
|-----------|---------|--------|
| `OrganizationContext` | `src/context/OrganizationContext.tsx` | Aucune |
| `orgContext.ts` | `src/lib/orgContext.ts` | OrganizationContext |
| `TransactionCapability` | `src/capabilities/workflow/TransactionCapability.ts` | Organization |
| `CotisationCapability` | `src/capabilities/activity/CotisationCapability.ts` | Organization |

### Priorité Moyenne (Tranche 4-7)

| Capability | Fichier | Dépend |
|-----------|---------|--------|
| `CaisseAdapter` | `src/adapters/CaisseAdapter.ts` | Aucune |
| `OrgUnitAdapter` | `src/adapters/OrgUnitAdapter.ts` | Aucune |
| `OfflineSyncCapability` | `src/capabilities/offline/OfflineSyncCapability.ts` | Organization |
| `PermissionCapability` | `src/capabilities/permission/PermissionCapability.ts` | Organization |

### Priorité Basse (Tranche 8-13)

| Capability | Fichier | Dépend |
|-----------|---------|--------|
| `LifecycleCapability` | `src/capabilities/lifecycle/LifecycleCapability.ts` | Organization |
| `ReportingCapability` | `src/capabilities/reporting/ReportingCapability.ts` | Organization |
| `FormsCapability` | `src/capabilities/forms/FormsCapability.ts` | Organization |
| `NotificationCapability` | `src/capabilities/notification/NotificationCapability.ts` | Identity |

---

## F. Adapters Nécessaires

| Adapter | Interface Legacy | Interface Cible | Risque | Supprimable |
|---------|-----------------|-----------------|--------|-------------|
| `CaisseAdapter` | `Caisse` | `Account` | Faible | ✅ |
| `OrgUnitAdapter` | `OrgUnit` | `Group` | Faible | ✅ |
| `TransactionLegacyAdapter` | `Transaction` | `Transaction` | Faible | ✅ |
| `VersementLegacyAdapter` | Transactions | `Versement` | Faible | ✅ |
| `EventBudgetAdapter` | `budget_items` JSONB | `EventBudget` + `BudgetLine` | Moyen | ✅ |

---

## G. Tests à Créer

### Tests de Caractérisation (prioritaires)

| Test | Fichier | Règle Métier |
|------|---------|-------------|
| Transaction EXPENSE→PENDING | `transaction.create.expense.spec.ts` | Status automatique |
| Transaction INCOME→DRAFT | `transaction.create.income.spec.ts` | Status automatique |
| Transaction APPROVED immuable | `transaction.approved.immutability.spec.ts` | Invariant |
| Transaction reverse | `transaction.reverse.spec.ts` | Contre-transaction |
| Cotisation EN_AVANCE/PAYE | `cotisation.paiement.spec.ts` | Calcul statut |
| Cotisation don | `cotisation.don.spec.ts` | Calcul excédent |
| Cotisation stats | `cotisation.stats.spec.ts` | Agrégation |
| Versement atomicité | `versement.atomic.spec.ts` | Paire transactions |
| Solde dérivé | `account.balance.derived.spec.ts` | Invariant |
| Audit systématique | `audit.systematic.spec.ts` | Invariant |
| RBAC stub | `rbac.stub.spec.ts` | Comportement actuel |

### Tests d'Intégration

| Test | Description |
|------|-------------|
| Login flow | Email/password + Google OAuth |
| Transaction flow | Create → Approve → Reverse |
| Cotisation flow | Create culte → Mark paid → Check advance |
| Versement flow | Create versement → Verify pairs |
| Sync flow | Create offline → Sync → Verify cloud |
| Archive flow | Archive → Restore → Verify audit |

---

## H. Ordre Exact des Migrations

```
Tranche 0: Bug Fixes (Jour 1)
├── 0.1 isPaiementVerrouille (BLOQUANT)
├── 0.2 Supprimer import checkPermission
└── 0.3 Corriger mapping Account→accounts

Tranche 1: Organization Context (Jour 2-3)
├── 1.1 OrganizationContext
├── 1.2 orgContext.ts service
└── 1.3-1.7 Remplacer org-1 dans services

Tranche 2: Transaction Immunity (Jour 4-5)
├── 2.1 TransactionCapability interface
├── 2.2 Garde updateTransaction APPROVED
├── 2.3 Garde deleteTransaction APPROVED
├── 2.4 UI TransactionEdit désactivée si APPROVED
└── 2.5 UI Finance cache bouton supprimer si APPROVED

Tranche 3: Cotisation Fix (Jour 6)
└── 3.1 Implémenter isPaiementVerrouille

Tranche 4: Adapters (Jour 7-8)
├── 4.1 CaisseAdapter
├── 4.2 OrgUnitAdapter
├── 4.3 TransactionLegacyAdapter
├── 4.4 VersementLegacyAdapter
└── 4.5 EventBudgetAdapter

Tranche 5: Resource Seam (Jour 9-11)
├── 5.1 AccountAdapter
├── 5.2 getCaisseForDisplay utilise adapter
├── 5.3 Dashboard → accounts
├── 5.4 GroupDetail → accounts
└── 5.5 Versement → accounts

Tranche 6: OfflineSync (Jour 12-14)
├── 6.1-6.10 10 handlers sync manquants
└── 6.11-6.12 Supprimer caisses/orgUnits handlers

Tranche 7: Permission (Jour 15)
├── 7.1 PermissionCapability
├── 7.2 PermissionEvaluator
└── 7.3 Remplacer stub rbac.ts

Tranche 8: Lifecycle (Jour 16)
├── 8.1 Archives.tsx utilise archiveRegistry
├── 8.2 archiveGroup store → registry
├── 8.3 archiveMember store → registry
└── 8.4 Enregistrer policies

Tranche 9: Reporting Fix (Jour 17)
├── 9.1 Remplacer db.getAll par PowerSync
└── 9.2 Utiliser useQuery hook

Tranche 10: Versement Canonique (Jour 18-19)
├── 10.1 VersementRepo
├── 10.2 createVersement store → table
├── 10.3 Versement.tsx → createVersement()
└── 10.4 Historique versements depuis table

Tranche 11: Forms UI (Jour 20)
├── 11.1 FormBuilder.tsx → formDefinitionRepo
├── 11.2 FormFill.tsx → formSubmissionRepo
└── 11.3 CustomFields.tsx → customFieldRepo

Tranche 12: Relationship UI (Jour 21)
├── 12.1 GroupMembers.tsx
└── 12.2 Lien depuis GroupDetail

Tranche 13: Account UI (Jour 22)
├── 13.1 Accounts.tsx
└── 13.2 Route /accounts
```

---

## I. Risques

### Risques Critiques (🔴)

| Risque | Mitigation |
|--------|-----------|
| Transaction APPROVED modifiée | Gardes + tests characterization |
| Perte données sync | Handlers complets + validation |
| Crash cotisation (isPaiementVerrouille) | Correction immédiate (Tranche 0) |
| Incohérence caisses/accounts | CaisseAdapter + double write |

### Risques Moyens (🟡)

| Risque | Mitigation |
|--------|-----------|
| Breaking changes UI | Adapters + compatibility layer |
| Permissions bloquantes | Mode debug + rollback rapide |
| Performance | Monitoring + benchmarks |

### Risques Faibles (🟢)

| Risque | Mitigation |
|--------|-----------|
| Archive integration | Tests unitaires |
| Reporting données | PowerSync temps réel |

---

## J. Première Tranche de Code Autorisée

### ✅ AUTORISÉ (Tranche 0 - Jour 1)

**1. Corriger le bug `isPaiementVerrouille`**

```typescript
// src/lib/cotisation-logic.ts — ajouter à la fin
export function isPaiementVerrouille(params: {
  dateCulte: string;
  cotisationEstPaye: boolean;
}): boolean {
  const culteDate = new Date(params.dateCulte);
  const today = new Date();
  const diffDays = (today.getTime() - culteDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 30 || params.cotisationEstPaye;
}
```

**2. Supprimer l'import mort `checkPermission`**

```typescript
// src/store/useLocalStore.ts — supprimer ligne 9
// Avant : import { checkPermission } from '@/lib/rbac';
// Après : (supprimer cette ligne)
```

**3. Corriger le mapping Account dans archiveService.ts**

```typescript
// src/lib/archiveService.ts — ligne 17
// Avant : Account: 'caisses',
// Après : Account: 'accounts',
```

### 🟡 AUTORISÉ SOUS CONDITION (Tranche 1 - Jour 2-3)

**4. Créer OrganizationContext** (sans remplacer les hardcodes encore)

```typescript
// src/context/OrganizationContext.tsx — nouveau fichier
// Conserver org-1 comme valeur par défaut
// Préparer l'injection future
```

### ❌ INTERDIT (jusqu'à validation Tranche 0)

- Réécriture globale du store
- Migration SQL massive
- Suppression de modules
- Changement simultané frontend + backend + DB
- Création du Runtime complet

---

## K. Prochaines Étapes

### Immédiat (cette session)

1. ✅ Documentation créée (`docs/00-canonical/migration/`)
2. ⏳ Implémenter les 3 corrections de la Tranche 0
3. ⏳ Lancer `pnpm tsc --noEmit` pour validation
4. ⏳ Commit des corrections

### Court terme (3 jours)

5. Créer `OrganizationContext` et `orgContext.ts`
6. Remplacer `org-1` dans les services (Niveau 1)
7. Test de non-régression complet

### Moyen terme (2 semaines)

8. Implémenter les Tranches 1-6
9. Tests d'intégration
10. Déploiement progressif

---

## L. Critères de Réussite de Phase 1

| Critère | Status |
|---------|--------|
| `isPaiementVerrouille` implémenté | ⏳ En cours |
| Import mort supprimé | ⏳ En cours |
| Mapping archive corrigé | ⏳ En cours |
| OrganizationContext créé | ⏳ Pas commencé |
| `org-1` réduit à < 10 occurrences | ⏳ 41 → 0 (target) |
| Transactions APPROVED immuables | ⏳ Pas commencé |
| Sync handlers complétés | ⏳ Pas commencé |
| Tous les tests characterization passent | ⏳ Pas commencé |

---

**Fin du rapport.**

*Ce document est vivant — mettre à jour au fur et à mesure de l'avancement.*
