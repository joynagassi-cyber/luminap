# Matrice de Convergence Validée

> Date : 2026-09-05
> Objet : Comparaison canonique vs code réel, avec preuves

---

## Méthodologie

Chaque modèle est analysé avec le statut suivant :
- **CANONIQUE** : Conforme au modèle canonique
- **OBSOLÈTE** : Ancien modèle encore présent mais remplacé par le canonique
- **DUPLIQUÉ** : Existant en double (ancien + canonique) — nécessite migration
- **À MIGRER** : Existe côté code mais pas côté cloud, ou vice versa
- **À CONSERVER** : Modèle canonique présent et correctement implémenté

Preuves : chaque affirmation est appuyée par un chemin de fichier + ligne.

---

## Tableau de Convergence

### Organisation

| Ancien modèle | Statut | Preuve code réel | Canonique | Preuve canonique |
|---------------|--------|-----------------|-----------|-----------------|
| `OrgUnit` | **DUPLIQUÉ** | `src/store/useLocalStore.ts:107-111` — `orgUnits` avec id, name, type, description, orgId, isActive | `groups` | `src/types/index.ts:192-206` — `Group` avec parentGroupId, responsableMemberId, status, archivedAt |
| `org_units` (Supabase) | **DUPLIQUÉ** | `src/lib/sync.ts:80-87` — sync vers `org_units` | `groups` (Supabase) | Migration `0026` — table `groups` |
| `Caisse` | **DUPLIQUÉ** | `src/types/index.ts:73-82` — `Caisse` avec type, color, orgId | `accounts` | `src/types/index.ts:218-232` — `Account` avec owner_type, owner_id |
| `caisses` (Supabase) | **DUPLIQUÉ** | Migration `0018` — `caisses` table | `accounts` (Supabase) | Migration `0027` — `accounts` table |

**Conclusion Organisation** : 4 modèles en duplication. `groups` et `accounts` sont le canonique, `org_units` et `caisses` sont l'ancien.

### Member / User

| Ancien modèle | Statut | Preuve | Canonique | Preuve |
|---------------|--------|--------|-----------|--------|
| `User` (local) | **OBSOLÈTE** | `src/types/index.ts:39-46` — User avec role, org | `Member` | `src/types/index.ts:172-184` — `Member` avec org_id, status, joined_at, archived_at |
| `member` (Auth) | **OORT** | `server/routes/api/auth/*.post.ts` — login/signup | `profiles` (Supabase) | Migration `0019` + trigger `handle_new_user` |
| `role_assignments` (Supabase) | **CANONIQUE** | Migration `0011` | — | — |

**Conclusion Member/User** : Le système est mono-église, donc pas d'authentification réelle. `profiles` existe mais n'est pas utilisé en UI. Les rôles sont stockés localement.

### RBAC

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `checkPermission()` | **CANONIQUE** | `src/lib/rbac.ts:8-16` — stub toujours true, conforme à l'amendement mono-église |
| `PERMISSION_MATRIX` | **CANONIQUE** | `src/lib/rbac.ts:19-62` — matrice définie pour les phases futures |
| `RoleAssignment` | **CANONIQUE** | `src/types/index.ts:160-164` — session_id, role, org_id |
| `role_assignments` (Supabase) | **CANONIQUE** | Migration `0011` — table créée |

**Conclusion RBAC** : Conforme au canonique pour la phase mono-église. Le stub `checkPermission` → `return true` est intentionnel.

### Group / Account

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `groups` (table) | **CANONIQUE** | Migration `0026` — hierarchie parent_group_id, responsable_member_id |
| `accounts` (table) | **CANONIQUE** | Migration `0027` — owner_type, owner_id, status |
| `caisses` (table) | **OBSOLÈTE** | Migration `0018` — remplacé par `accounts` |
| `org_units` (table) | **OBSOLÈTE** | Migration `0002` — remplacé par `groups` |
| `GroupMembership` | **CANONIQUE** | `src/types/index.ts:235-243` — table `group_memberships` (migration `0028`) |

**Conclusion Group/Account** : Le canonique existe mais l'UI utilise encore les anciens modèles. Les anciennes tables `caisses` et `org_units` sont en production mais ne devraient plus l'être.

### Event / EventBudget

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `events` (table) | **CANONIQUE** | Migration `0015` — nom, description, dates, status, budget (jsonb) |
| `EventBudget` (type) | **CANONIQUE** | `src/types/index.ts:246-252` — defined |
| `event_budgets` (table) | **CANONIQUE** | Migration `0031` — relation with events |
| `BudgetLine` (type) | **CANONIQUE** | `src/types/index.ts:255-262` — defined |
| `budget_lines` (table) | **CANONIQUE** | Migration `0031` — planned_amount_cents, actual_amount_cents |

**Conclusion Event/Budget** : Le canonique existe côté BD mais l'UI utilise encore l'ancien modèle `events.budget_items` (jsonb). Les tables `event_budgets` et `budget_lines` ne sont pas utilisées par le code frontend.

### Transaction / Versement

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `transactions` (table) | **CANONIQUE** | Migration `0003` + `0016-0018` — columns all present |
| `Versement` (type) | **CANONIQUE** | `src/types/index.ts:274-284` — defined |
| `versements` (table) | **CANONIQUE** | Migration `0029` — from_account_id, to_account_id, amount_cents |
| **Usage UI versement** | **NON CONFORME** | `src/pages/Versement.tsx:61-95` — crée 2 transactions directement au lieu d'utiliser le table versements |
| **Sync versements** | **MANQUANT** | `src/lib/sync.ts` — pas de case `versements` |
| **Sync accounts** | **MANQUANT** | `src/lib/sync.ts` — pas de case `accounts` |

**Conclusion Transaction/Versement** : Le canonique existe côté BD mais l'UI contournne le versement canonique. L'invariant "paire de transactions liées par versementId" est partiellement respecté (versementId existe sur transaction) mais la table versements n'est pas utilisée.

### Category

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `categories` (table) | **CANONIQUE** | Migration `0001` — id, key, label_fr, type, org_id |
| 9 catégories par défaut | **CANONIQUE** | `src/store/useLocalStore.ts:122-130` |
| **Utilisation** | **CONFORME** | Toutes les transactions ont categoryId |

**Conclusion Category** : Conforme.

### AuditLog

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `audit_entries` (table) | **CANONIQUE** | Migration `0004` — avant_state, after_state, actor_role_at_time |
| `writeAudit()` | **CANONIQUE** | `src/lib/audit.ts:80-110` |
| Trigger DB | **CANONIQUE** | `on_transaction_change` insère audit + notification |
| `actor_role_at_time` | **PRÉSENT** | `src/lib/audit.ts:12` — present in type, set in all calls |
| **Invariant audit systématique** | **RÉSPECTÉ** | Chaque mutation (create/update/delete/approve/reverse) appelle writeAudit |

**Conclusion AuditLog** : Conforme au canonique.

### Archive

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `ArchiveRegistry` | **EXISTE** | `src/lib/archiveService.ts:14-56` |
| **Intégration UI** | **MANQUANTE** | `src/pages/Archives.tsx:1-40` — fait du filtrage direct, pas d'appel à ArchiveRegistry |
| `archivableEntity` types | **CANONIQUE** | `src/types/index.ts:295` |
| `ArchivePolicy` interface | **CANONIQUE** | `src/lib/archiveService.ts:8-13` |

**Conclusion Archive** : Le service existe mais n'est pas utilisé par l'UI. L'archivage est fait via les méthodes directes du store (archiveGroup, archiveMember).

### Formulaire

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `form_definitions` (table) | **CANONIQUE** | Migration `0032` |
| `form_submissions` (table) | **CANONIQUE** | Migration `0032` |
| `FormDefinition` (type) | **CANONIQUE** | `src/types/index.ts:265-274` |
| `formSystem.ts` | **CANONIQUE** | `src/lib/formSystem.ts:1-90` |
| **UI Forms** | **MANQUANTE** | Aucune page UI pour les formulaires |
| **Sync forms** | **MANQUANT** | Pas de handler sync pour form_definitions/form_submissions |

**Conclusion Formulaire** : BD + lib complètes, UI manquante.

### Custom Fields

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `custom_field_definitions` (table) | **CANONIQUE** | Migration `0033` |
| `custom_field_values` (table) | **CANONIQUE** | Migration `0033` |
| `customFields.ts` | **CANONIQUE** | `src/lib/customFields.ts:1-40` |
| **UI** | **MANQUANTE** | Aucune page UI |
| **Sync** | **MANQUANT** | Pas de handler sync |

**Conclusion Custom Fields** : BD + lib complètes, UI manquante.

### Reporting

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `report_definitions` (table) | **CANONIQUE** | Migration `0030` |
| `QueryBuilder` | **EXISTE** | `src/lib/reporting.ts:22-26` |
| `AggregationEngine` | **EXISTE** | `src/lib/reporting.ts:29-75` |
| `ReportDefinition` (type) | **CANONIQUE** | `src/types/index.ts:263-274` |
| **UI Builder** | **MANQUANTE** | `src/pages/Reports.tsx` fait du calcul direct, pas de builder |
| **Sync** | **MANQUANT** | Pas de handler sync pour report_definitions |

**Conclusion Reporting** : DB + lib complètes, UI simpliste (pas de builder).

### Notification

| Modèle | Statut | Preuve |
|--------|--------|--------|
| `notifications` (table) | **CANONIQUE** | Migration `0011` |
| Trigger `notify_transaction_change` | **CANONIQUE** | Sur table transactions |
| **UI** | **CONFORME** | `src/pages/Notifications.tsx` — page complète |
| **Sync** | **CONFORME** | `src/lib/sync.ts:90-95` — handler notifications |
| **Realtime** | **CONFORME** | `src/lib/sync.ts:124-148` — subscribe |

**Conclusion Notification** : Conforme.

### Offline/Sync

| Modèle | Statut | Preuve |
|--------|--------|--------|
| IndexedDB v10 | **CANONIQUE** | `src/lib/db.ts:1` |
| `syncQueue` | **CANONIQUE** | `src/lib/db.ts:26` |
| Backoff 1s→16s (5 retries) | **CANONIQUE** | `src/lib/sync.ts:5` |
| `startBackgroundSync()` | **CANONIQUE** | `src/lib/sync.ts:35-100` |
| Realtime subscriptions | **CANONIQUE** | `src/lib/sync.ts:118-148` |
| Sync handlers manquants | **ÉCART** | `accounts`, `versements`, `groups`, `members`, `form_*`, `custom_*`, `report_definitions` |

**Conclusion Offline/Sync** : L'architecture est canonique mais les handlers de sync sont incomplets.

---

## Modèles présents dans le code mais absents des 4 docs de référence

| Modèle | Observation |
|--------|-------------|
| `Caisse` | Absent des 4 documents — modèle legacy remplacé par `accounts` canonique |
| `OrgUnit` | Absent des 4 documents — modèle legacy remplacé par `groups` canonique |
| `Versement` (store entity) | Le type existe dans `src/types/index.ts` mais n'est pas utilisé dans le store — le store a `Versement` dans les types mais les opérations de versement sont faites via transactions directes |
| `shoppingItems` dans `Event` | Champ présent dans `src/types/index.ts:124-132` mais pas dans les tables Supabase |
| `BudgetItem` | Présent dans `src/types/index.ts:115-123` mais les tables canoniques sont `event_budgets` + `budget_lines` |

---

## Modèles canoniques absents du code

| Modèle canonique | État | Note |
|-----------------|------|------|
| `Account.balance` dérivé | **PARTIEL** | `src/lib/account.ts:11-25` implémente le calcul dérivé |
| `ArchiveRegistry` avec policies | **EXISTE mais non intégré** | `src/lib/archiveService.ts` — pas connecté aux pages |
| `FormDefinition` UI | **ABSENT** | Type + lib présents, pas de page |
| `ReportDefinition` UI | **ABSENT** | Type + lib présents, pas de builder UI |
| `CustomFieldDefinition` UI | **ABSENT** | Type + lib présents, pas de page |
| `GroupMembership` UI | **ABSENT** | Type + store présents, pas de page |
| `Versement` UI (canonique) | **ABSENT** — utilisé l'ancien flux | La page `Versement.tsx` ne utilise pas la table `versements` |
