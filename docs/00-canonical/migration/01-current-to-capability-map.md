# Current-to-Capability Map — Lumina

> Date : 2026-09-07
> Objet : Cartographie complète de chaque élément existant vers la cible Capability First

---

## 1. Méthodologie

Pour chaque élément du code existant, nous déterminons :

| Champ | Description |
|-------|-------------|
| **Current Location** | Fichier:ligne ou module où se trouve l'élément |
| **Current Responsibility** | Ce que fait cet élément |
| **Current Domain** | Le domaine métier actuel |
| **Target Concept** | Le concept cible dans l'architecture Capability First |
| **Target Capability** | La capability responsable |
| **Target Foundation Service** | Un service fondamental si nécessaire |
| **Target Runtime Service** | Un service d'exécution si nécessaire |
| **Target Business Pack** | Le pack métier si domaine spécifique |
| **Persistence Model Actuel** | Le stockage actuel |
| **Migration Strategy** | Comment migrer |
| **Risk** | Risque de migration |
| **Dependencies** | Dépendances croisées |
| **Can Remove Now?** | Peut-on supprimer ? |
| **Can Wrap Now?** | Peut-on adapter maintenant ? |
| **Can Extract Now?** | Peut-on extraire maintenant ? |

---

## 2. Organisation (Org Context)

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `org-1` hardcoded | `src/store/useLocalStore.ts:105`, `src/lib/audit.ts:25`, `src/lib/auth.ts:86`, 20+ autres | Identifiant organisationnel dur | `OrganizationContext.organizationId` | **Organization** | PostgreSQL `org_id` | Remplacer par un contexte injecté | Moy | ✅ — créer `OrganizationContext` | ❌ — trop dépendant |
| `Église MFE-JC Centrale` | `src/store/useLocalStore.ts:106`, `src/lib/export.ts` | Nom de l'organisation | `OrganizationContext.name` | **Organization** | PostgreSQL | Remplacer par config | Faible | ✅ — via `appConfig` | ❌ |
| `DEFAULT_USER` | `src/store/useLocalStore.ts:98-110` | Utilisateur par défaut local | `UserProfile` | **Identity** | Zustand store | Remplacer par session Supabase | Faible | ✅ — après auth | ❌ |
| `DEFAULT_CATEGORIES` | `src/store/useLocalStore.ts:112-122` | 9 catégories fixes | `Category` | **Vocabulary** | PostgreSQL `categories` | Sync depuis BD, pas hardcode | Faible | ✅ | ✅ — les catégories sont en BD |
| `DEFAULT_CAISSES` | `src/store/useLocalStore.ts:124-126` | Caisse principale | `Account` | **Resource** | PostgreSQL `accounts` + `caisses` | Adapter vers `accounts` | Faible | ✅ | ✅ — `main` existe dans `accounts` |
| `DEFAULT_ORG_UNITS` | `src/store/useLocalStore.ts:128-130` | Unité organisationnelle racine | `Group` | **Organization** | PostgreSQL `groups` + `org_units` | Adapter vers `groups` | Faible | ✅ | ✅ — existe dans `groups` |

---

## 3. Finance — Transactions

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `transactions` table | PostgreSQL, PowerSync | Stockage des transactions | `Transaction` | **Workflow** | PostgreSQL `transactions` | Conserver, utiliser via adapter | Faible | ✅ — `TransactionRepo` | ❌ |
| `useTransactions()` | `src/lib/dataLayer.ts:248` | Hook lecture transactions | `Transaction` | **Workflow** | PowerSync → IndexedDB fallback | Conserver tel quel | Faible | ✅ — déjà un adapter | ❌ |
| `addTransactionPS` | `src/lib/dataLayer.ts` | Insertion transaction | `Transaction.create` | **Workflow** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `updateTransactionPS` | `src/lib/dataLayer.ts` | Mise à jour transaction | `Transaction.update` | **Workflow** | PowerSync | Ajouter garde APPROVED | Faible | ✅ | ❌ |
| `deleteTransactionPS` | `src/lib/dataLayer.ts` | Suppression transaction | `Transaction.delete` | **Workflow** | PowerSync | Ajouter garde APPROVED | Faible | ✅ | ❌ |
| `approveTransaction` | `src/store/useLocalStore.ts:280` | Approbation transaction | `Transaction.approve` | **Workflow** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `reverseTransaction` | `src/store/useLocalStore.ts:222` | Contre-transaction | `Transaction.reverse` | **Workflow** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `TransactionStatus` enum | `src/types/index.ts:28` | DRAFT/PENDING/APPROVED/REJECTED | `Transaction` | **Workflow** | TypeScript type | Conserver | N/A | ✅ | N/A |
| `TransactionType` enum | `src/types/index.ts:29` | INCOME/EXPENSE | `Transaction` | **Workflow** | TypeScript type | Conserver | N/A | ✅ | N/A |
| `fundSource` field | `src/types/index.ts:30` | CAISSE/COTISATION/PERSONNE/AUTRE | `Transaction.source` | **Workflow** | PostgreSQL `source` | Conserver | N/A | ✅ | N/A |
| `versementId` field | `src/types/index.ts:112` | Lien paire transactions | `Versement` | **Workflow** | PostgreSQL `versement_id` | Conserver | N/A | ✅ | N/A |
| `reversalOfId` field | `src/types/index.ts:113` | Lien contre-transaction | `Transaction` | **Workflow** | PostgreSQL `reversal_of_id` | Conserver | N/A | ✅ | N/A |

---

## 4. Finance — Versements

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `versements` table | PostgreSQL | Stockage versement | `Versement` | **Workflow** | PostgreSQL `versements` | Utiliser la table canonique | Moyen | ✅ — `VersementRepo` | ❌ |
| `createVersement` (store) | `src/store/useLocalStore.ts:364` | Crée 2 transactions directement | `Versement.create` | **Workflow** | Store interne | Adapter pour utiliser table `versements` | Moyen | ✅ — wrapper | ❌ |
| `Versement.tsx` | `src/pages/Versement.tsx:13` | UI versement | `Versement` | **Workflow** | UI | Utiliser `createVersement()` du store | Moyen | ✅ | ❌ |
| `versementId` | `src/types/index.ts:112` | Identifiant paire | `Versement` | **Workflow** | PostgreSQL | Conserver | N/A | ✅ | N/A |
| `VersementStatus` | `src/types/index.ts:36` | DRAFT/SUBMITTED/APPROVED/REJECTED | `Versement` | **Workflow** | TypeScript | Conserver | N/A | ✅ | N/A |

---

## 5. Finance — Cotisations

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `cotisations` table | PostgreSQL | Stockage cotisations culte | `Cotisation` | **Activity** (Church) | PostgreSQL `cotisations` | Conserver | Faible | ✅ | ❌ |
| `Cotisation` type | `src/types/index.ts:220` | Type TypeScript | `Cotisation` | **Activity** (Church) | TypeScript | Conserver | N/A | ✅ | N/A |
| `cotisation-logic.ts` | `src/lib/cotisation-logic.ts` | Logique métier cotisation | `Cotisation` | **Activity** (Church) | TS module | Conserver + corriger `isPaiementVerrouille` | Faible | ✅ | ❌ |
| `markCotisationPaid` | `src/store/useLocalStore.ts:807` | Marquer payée | `Cotisation.pay` | **Activity** (Church) | PowerSync | Conserver | Faible | ✅ | ❌ |
| `markCotisationsAbsent` | `src/store/useLocalStore.ts` | Marquer absents | `Cotisation.markAbsent` | **Activity** (Church) | PowerSync | Conserver | Faible | ✅ | ❌ |
| `createCulte` | `src/store/useLocalStore.ts:756` | Créer culte + générer cotisations | `Culte` | **Activity** (Church) | PowerSync | Conserver | Faible | ✅ | ❌ |
| `CotisationStatut` | `src/types/index.ts:37` | NON_PAYE/PAYE/ABSENT/EN_AVANCE | `Cotisation` | **Activity** (Church) | TypeScript | Conserver | N/A | ✅ | N/A |
| `determinerStatutAvance` | `src/lib/cotisation-logic.ts:23` | Paiement avant/après culte | `Cotisation` | **Activity** (Church) | TS function | Conserver | N/A | ✅ | N/A |
| `calculerDon` | `src/lib/cotisation-logic.ts:38` | Excédent de paiement | `Cotisation` | **Activity** (Church) | TS function | Conserver | N/A | ✅ | N/A |
| `calculerStatsCulte` | `src/lib/cotisation-logic.ts:45` | Stats d'un culte | `Cotisation` | **Activity** (Church) | TS function | Conserver | N/A | ✅ | N/A |
| `montantEnAvance` | `src/types/index.ts:247` | Avance membre | `Member.advance` | **Member** | PostgreSQL | Conserver | N/A | ✅ | N/A |

---

## 6. Finance — Comptes / Caisses

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `caisses` table | PostgreSQL | Ancien modèle de compte | `Account` | **Resource** | PostgreSQL `caisses` | Adapter progressivement vers `accounts` | Élevé | ✅ — `CaisseAdapter` | ❌ — encore utilisé |
| `Caisse` type | `src/types/index.ts:74` | Type caisse | `Account` | **Resource** | TypeScript | Déprécier, remplacer par `Account` | Moyen | ✅ | ✅ — lentement |
| `accounts` table | PostgreSQL | Modèle canonique de compte | `Account` | **Resource** | PostgreSQL `accounts` | Utiliser comme source principale | Faible | ✅ | ❌ |
| `Account` type | `src/types/index.ts:268` | Type compte canonique | `Account` | **Resource** | TypeScript | Utiliser | N/A | ✅ | N/A |
| `getAccountBalance` | `src/lib/account.ts:14` | Calcul solde dérivé | `Account.balance` | **Resource** | Calcul en mémoire | Conserver (invariant) | N/A | ✅ | N/A |
| `getAllAccountBalances` | `src/lib/account.ts:26` | Tous les solde | `Account` | **Resource** | Calcul en mémoire | Conserver | N/A | ✅ | N/A |
| `getCaisseForDisplay` | `src/store/useLocalStore.ts:95` | Fusion caisses/accounts | `Account` | **Resource** | Calcul/union | Adapter vers `Account` uniquement | Faible | ✅ | ✅ — lentement |
| `CaisseType` enum | `src/types/index.ts:31` | MAIN/GROUP | `Account.ownerType` | **Resource** | TypeScript | Mapper vers `ownerType` | Faible | ✅ | ✅ |

---

## 7. Organisation — Groupes

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `org_units` table | PostgreSQL | Ancien modèle groupe | `Group` | **Organization** | PostgreSQL `org_units` | Déprécier, utiliser `groups` | Élevé | ✅ — `OrgUnitAdapter` | ❌ — encore utilisé |
| `OrgUnit` type | `src/types/index.ts:65` | Type org unit | `Group` | **Organization** | TypeScript | Déprécier | Faible | ✅ | ✅ — lentement |
| `groups` table | PostgreSQL | Modèle canonique | `Group` | **Organization** | PostgreSQL `groups` | Utiliser comme source | Faible | ✅ | ❌ |
| `Group` type | `src/types/index.ts:253` | Type groupe canonique | `Group` | **Organization** | TypeScript | Utiliser | N/A | ✅ | N/A |
| `createGroup` | `src/store/useLocalStore.ts:370` | Crée 4 entités | `Group.create` | **Organization** | PowerSync | Adapter pour créer uniquement `groups` + `accounts` | Moyen | ✅ | ❌ |
| `updateGroup` | `src/store/useLocalStore.ts:393` | Met à jour groupe | `Group.update` | **Organization** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `deleteGroup` | `src/store/useLocalStore.ts:411` | Supprime groupe+tx | `Group.delete` | **Organization** | PowerSync | Corriger : ne pas supprimer transactions | Élevé | ✅ | ❌ |
| `parent_group_id` | `src/types/index.ts:257` | Hiérarchie | `Group` | **Organization** | PostgreSQL | Utiliser | N/A | ✅ | N/A |
| `responsable_member_id` | `src/types/index.ts:258` | Responsable | `Group` | **Organization** | PostgreSQL | Utiliser | N/A | ✅ | N/A |

---

## 8. Membres

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `members` table | PostgreSQL | Stockage membres | `Member` | **Identity** | PostgreSQL `members` | Conserver | Faible | ✅ | ❌ |
| `Member` type | `src/types/index.ts:234` | Type membre | `Member` | **Identity** | TypeScript | Conserver | N/A | ✅ | N/A |
| `createMember` | `src/store/useLocalStore.ts:607` | Créer membre | `Member.create` | **Identity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `updateMember` | `src/store/useLocalStore.ts` | Modifier membre | `Member.update` | **Identity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `deleteMember` | `src/store/useLocalStore.ts` | Supprimer membre | `Member.delete` | **Identity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `archiveMember` | `src/store/useLocalStore.ts` | Archiver membre | `Member.archive` | **Lifecycle** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `restoreMember` | `src/store/useLocalStore.ts` | Restaurer membre | `Member.restore` | **Lifecycle** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `MemberStatus` | `src/types/index.ts:33` | ACTIVE/INACTIVE/ARCHIVED | `Member` | **Identity** | TypeScript | Conserver | N/A | ✅ | N/A |
| `totalDons` | `src/types/index.ts:246` | Total dons | `Member` | **Identity** | PostgreSQL | Conserver | N/A | ✅ | N/A |
| `montantEnAvance` | `src/types/index.ts:247` | Montant avance | `Member` | **Identity** | PostgreSQL | Conserver | N/A | ✅ | N/A |

---

## 9. Membres — Appartenances

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `group_memberships` table | PostgreSQL | Appartenances | `GroupMembership` | **Relationship** | PostgreSQL `group_memberships` | Conserver | Faible | ✅ | ❌ |
| `GroupMembership` type | `src/types/index.ts:284` | Type appartenance | `GroupMembership` | **Relationship** | TypeScript | Conserver | N/A | ✅ | N/A |
| `memberships` store | `src/store/useLocalStore.ts` | Liste memberships | `GroupMembership` | **Relationship** | Zustand store | Conserver | Faible | ✅ | ❌ |
| `addMemberToGroup` | `src/store/useLocalStore.ts` | Ajouter membre | `GroupMembership.create` | **Relationship** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `removeMemberFromGroup` | `src/store/useLocalStore.ts` | Retirer membre | `GroupMembership.delete` | **Relationship** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `roleInGroup` | `src/types/index.ts:288` | Rôle dans groupe | `GroupMembership` | **Relationship** | PostgreSQL | Conserver | N/A | ✅ | N/A |

---

## 10. Événements

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `events` table | PostgreSQL | Stockage événements | `Event` | **Activity** | PostgreSQL `events` | Conserver | Faible | ✅ | ❌ |
| `Event` type | `src/types/index.ts:143` | Type événement | `Event` | **Activity** | TypeScript | Conserver | N/A | ✅ | N/A |
| `addEvent` | `src/store/useLocalStore.ts` | Créer événement | `Event.create` | **Activity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `updateEvent` | `src/store/useLocalStore.ts` | Modifier événement | `Event.update` | **Activity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `deleteEvent` | `src/store/useLocalStore.ts` | Supprimer événement | `Event.delete` | **Activity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `updateEventStatus` | `src/store/useLocalStore.ts` | Changer statut | `Event.statusChange` | **Activity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `EventStatus` | `src/types/index.ts:32` | PLANIFIED/ONGOING/COMPLETED/CANCELLED | `Event` | **Activity** | TypeScript | Conserver | N/A | ✅ | N/A |
| `budget_items` jsonb | `src/types/index.ts:153` | Budget en JSON | `EventBudget` + `BudgetLine` | **Activity** | JSONB vs tables séparées | Migration progressive | Moyen | ✅ | ✅ — lentement |
| `shoppingItems` | `src/types/index.ts:154` | Listes d'achat | `ShoppingItem` | **Activity** | TypeScript (pas de BD) | Conserver en mémoire | Faible | ✅ | N/A |
| `addBudgetItem` | `src/store/useLocalStore.ts` | Ligne budget | `BudgetLine.create` | **Activity** | JSONB | Adapter vers `budget_lines` table | Moyen | ✅ | ❌ |
| `removeBudgetItem` | `src/store/useLocalStore.ts` | Supprimer ligne | `BudgetLine.delete` | **Activity** | JSONB | Adapter vers `budget_lines` table | Moyen | ✅ | ❌ |

---

## 11. Événements — Budget Canonique

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `event_budgets` table | PostgreSQL | Budgets événements | `EventBudget` | **Activity** | PostgreSQL `event_budgets` | Conserver (vide actuellement) | Faible | ✅ | ❌ |
| `budget_lines` table | PostgreSQL | Lignes budget | `BudgetLine` | **Activity** | PostgreSQL `budget_lines` | Conserver (vide actuellement) | Faible | ✅ | ❌ |
| `EventBudget` type | `src/types/index.ts:310` | Type budget événement | `EventBudget` | **Activity** | TypeScript | Conserver | N/A | ✅ | N/A |
| `BudgetLine` type | `src/types/index.ts:320` | Type ligne budget | `BudgetLine` | **Activity** | TypeScript | Conserver | N/A | ✅ | N/A |
| `createEventBudget` | `src/store/useLocalStore.ts` | Créer budget | `EventBudget.create` | **Activity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `addBudgetLine` | `src/store/useLocalStore.ts` | Ajouter ligne | `BudgetLine.create` | **Activity** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `removeBudgetLine` | `src/store/useLocalStore.ts` | Supprimer ligne | `BudgetLine.delete` | **Activity** | PowerSync | Conserver | Faible | ✅ | ❌ |

---

## 12. Catégories

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `categories` table | PostgreSQL | Catégories financières | `Category` | **Vocabulary** | PostgreSQL `categories` | Conserver | Faible | ✅ | ❌ |
| `Category` type | `src/types/index.ts:56` | Type catégorie | `Category` | **Vocabulary** | TypeScript | Conserver | N/A | ✅ | N/A |
| `DEFAULT_CATEGORIES` | `src/store/useLocalStore.ts:112-122` | 9 catégories fixes | `Category` | **Vocabulary** | Hardcode → BD | Remplacer par données BD | Faible | ✅ | ✅ — hardcode |
| `category` relation | `src/types/index.ts:115` | Catégorie jointe | `Category` | **Vocabulary** | TypeScript | Conserver | N/A | ✅ | N/A |

---

## 13. Authentification / Identity

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `auth.ts` | `src/lib/auth.ts` | Service auth Supabase | `Identity` | **Identity** | Supabase Auth | Conserver | Faible | ✅ | ❌ |
| `profiles` table | PostgreSQL | Profils utilisateurs | `UserProfile` | **Identity** | PostgreSQL `profiles` | Conserver | Faible | ✅ | ❌ |
| `profiles` type | `src/types/index.ts` (via auth) | Type profil | `UserProfile` | **Identity** | PostgreSQL | Conserver | N/A | ✅ | N/A |
| `RoleAssignment` type | `src/types/index.ts:201` | Assignation de rôle | `RoleAssignment` | **Permission** | PostgreSQL `role_assignments` | Conserver | Faible | ✅ | ❌ |
| `role_assignments` table | PostgreSQL | Rôles par session | `RoleAssignment` | **Permission** | PostgreSQL | Conserver | Faible | ✅ | ❌ |
| `useAuth()` hook | `src/lib/auth.ts` | Hook auth | `Identity` | **Identity** | Zustand/Supabase | Conserver | Faible | ✅ | ❌ |

---

## 14. Permissions (RBAC)

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `rbac.ts` | `src/lib/rbac.ts` | Matrice permissions | `Permission` | **Permission** | TypeScript (statique) | Migrer vers table `role_assignments` | Moyen | ✅ | ❌ |
| `PERMISSION_MATRIX` | `src/lib/rbac.ts:42` | Matrice 14 rôles | `Permission` | **Permission** | TypeScript | Conserver en parallèle | Faible | ✅ | ❌ |
| `checkPermission` | `src/lib/rbac.ts` | Stub qui retourne true | `PermissionEvaluator` | **Permission** | Function | Remplacer par implémentation réelle | Moyen | ✅ | ❌ |
| `hasPermission` | `src/lib/rbac.ts:216` | Vérif permission | `PermissionEvaluator` | **Permission** | Function | Conserver | N/A | ✅ | N/A |
| `ROLE_HIERARCHY` | `src/lib/rbac.ts:189` | Niveau hiérarchique | `Permission` | **Permission** | TypeScript | Conserver | N/A | ✅ | N/A |
| `ROLE_LABELS` | `src/lib/rbac.ts:169` | Labels UI | `Permission` | **Permission** | TypeScript | Conserver | N/A | ✅ | N/A |
| Import `checkPermission` | `src/store/useLocalStore.ts:9` | Importé mais JAMAIS appelé | — | — | — | **Supprimer l'import inutilisé** | N/A | ✅ | ✅ — import mort |

---

## 15. Audit

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `audit_entries` table | PostgreSQL | Journal d'audit | `AuditEntry` | **Audit** | PostgreSQL `audit_entries` | Conserver | Faible | ✅ | ❌ |
| `audit.ts` | `src/lib/audit.ts` | Repository audit | `AuditLog` | **Audit** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `writeAudit` | `src/lib/audit.ts:126` | Fonction utilitaire | `AuditLog.write` | **Audit** | Function | Conserver | N/A | ✅ | N/A |
| `writeAuditSummary` | `src/lib/audit.ts:133` | Audit sans état | `AuditLog.writeSummary` | **Audit** | Function | Conserver | N/A | ✅ | N/A |
| `auditLogRepo` | `src/lib/audit.ts:38` | Repository | `AuditLog` | **Audit** | Repository | Conserver | N/A | ✅ | N/A |
| `actor_role_at_time` | `src/lib/audit.ts:28` | Rôle au moment de l'action | `AuditEntry` | **Audit** | PostgreSQL | Conserver | N/A | ✅ | N/A |
| `AuditEntry` type | `src/types/index.ts:159` | Type audit | `AuditEntry` | **Audit** | TypeScript | Conserver | N/A | ✅ | N/A |

---

## 16. Notifications

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `notifications` table | PostgreSQL | Notifications | `Notification` | **Notification** | PostgreSQL `notifications` | Conserver | Faible | ✅ | ❌ |
| `NotificationItem` type | `src/types/index.ts:190` | Type notification | `Notification` | **Notification** | TypeScript | Conserver | N/A | ✅ | N/A |
| `notifications` hook | `src/lib/dataLayer.ts` | Hook lecture | `Notification` | **Notification** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `oneSignal.ts` | `src/lib/onesignal.ts` | SDK OneSignal | `PushNotification` | **Notification** | OneSignal SDK | Conserver | Faible | ✅ | ❌ |
| `authOneSignal.ts` | `src/lib/authOneSignal.ts` | Sync auth + OneSignal | `PushNotification` | **Notification** | Service | Conserver | Faible | ✅ | ❌ |
| Trigger `notify_transaction_change` | PostgreSQL | Notification auto | `Notification` | **Notification** | DB Trigger | Conserver | Faible | ✅ | ❌ |

---

## 17. Archives

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `archiveService.ts` | `src/lib/archiveService.ts` | Registry archives | `Archive` | **Lifecycle** | TS class | Conserver + intégrer UI | Faible | ✅ | ❌ |
| `ArchiveRegistry` | `src/lib/archiveService.ts:22` | Registre de policies | `ArchivePolicy` | **Lifecycle** | Class | Conserver | N/A | ✅ | N/A |
| `ArchivePolicy` interface | `src/lib/archiveService.ts:6` | Policy archive | `ArchivePolicy` | **Lifecycle** | Interface | Conserver | N/A | ✅ | N/A |
| `ArchivableEntity` type | `src/types/index.ts:414` | Types archivable | `Archive` | **Lifecycle** | TypeScript | Corriger mapping Account→caisses | Faible | ✅ | N/A |
| `Archives.tsx` | `src/pages/Archives.tsx` | UI archives | `Archive` | **Lifecycle** | Page | Intégrer `archiveRegistry` | Moyen | ✅ | ❌ |
| `archiveGroup` | `src/store/useLocalStore.ts` | Archive groupe | `Group.archive` | **Lifecycle** | Store | Adapter vers `archiveRegistry` | Moyen | ✅ | ❌ |
| `archiveMember` | `src/store/useLocalStore.ts` | Archive membre | `Member.archive` | **Lifecycle** | Store | Adapter vers `archiveRegistry` | Moyen | ✅ | ❌ |
| Mapping `Account→caisses` | `src/lib/archiveService.ts:17` | Map incorrect | `Archive` | **Lifecycle** | Fix mapping | Corriger vers `accounts` | Faible | ✅ | ✅ — bug fix |

---

## 18. Formulaires

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `formSystem.ts` | `src/lib/formSystem.ts` | Repository formulaires | `Form` | **Forms** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `form_definitions` table | PostgreSQL | Définitions formulaires | `FormDefinition` | **Forms** | PostgreSQL | Conserver | Faible | ✅ | ❌ |
| `form_submissions` table | PostgreSQL | Soumissions | `FormSubmission` | **Forms** | PostgreSQL | Conserver | Faible | ✅ | ❌ |
| `FormDefinition` type | `src/types/index.ts:361` | Type définition | `FormDefinition` | **Forms** | TypeScript | Conserver | N/A | ✅ | N/A |
| `FormSubmission` type | `src/types/index.ts:376` | Type soumission | `FormSubmission` | **Forms** | TypeScript | Conserver | N/A | ✅ | N/A |
| `FormFieldDefinition` type | `src/types/index.ts:347` | Type champ | `FormField` | **Forms** | TypeScript | Conserver | N/A | ✅ | N/A |
| `FormBuilder.tsx` | `src/pages/FormBuilder.tsx` | UI builder | `Form` | **Forms** | Page | Connecter au store | Faible | ✅ | ❌ |
| `FormFill.tsx` | `src/pages/FormFill.tsx` | UI remplissage | `Form` | **Forms** | Page | Connecter au store | Faible | ✅ | ❌ |
| `validateFormSubmission` | `src/lib/formSystem.ts` | Validation | `Form` | **Forms** | Function | Conserver | N/A | ✅ | N/A |
| `mapFormFields` | `src/lib/formSystem.ts` | Mapping champs | `Form` | **Forms** | Function | Conserver | N/A | ✅ | N/A |

---

## 19. Champs Personnalisés

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `customFields.ts` | `src/lib/customFields.ts` | Repository champs | `CustomField` | **Forms** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `custom_field_definitions` table | PostgreSQL | Définitions | `CustomFieldDefinition` | **Forms** | PostgreSQL | Conserver | Faible | ✅ | ❌ |
| `custom_field_values` table | PostgreSQL | Valeurs | `CustomFieldValue` | **Forms** | PostgreSQL | Conserver | Faible | ✅ | ❌ |
| `CustomFieldDefinition` type | `src/types/index.ts:391` | Type définition | `CustomFieldDefinition` | **Forms** | TypeScript | Conserver | N/A | ✅ | N/A |
| `CustomFieldValue` type | `src/types/index.ts:403` | Type valeur | `CustomFieldValue` | **Forms** | TypeScript | Conserver | N/A | ✅ | N/A |
| `CustomFields.tsx` | `src/pages/CustomFields.tsx` | UI gestion | `CustomField` | **Forms** | Page | Connecter au store | Faible | ✅ | ❌ |

---

## 20. Rapports

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Persistence Model | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|-------------------|------|--------------|----------------|
| `reporting.ts` | `src/lib/reporting.ts` | Moteur rapport | `Report` | **Reporting** | PowerSync | Conserver | Faible | ✅ | ❌ |
| `QueryBuilder` | `src/lib/reporting.ts:22` | Builder requête | `ReportQuery` | **Reporting** | Class | Conserver | N/A | ✅ | N/A |
| `AggregationEngine` | `src/lib/reporting.ts:35` | Moteur agrégation | `ReportEngine` | **Reporting** | Class | Conserver | N/A | ✅ | N/A |
| `report_definitions` table | PostgreSQL | Définitions | `ReportDefinition` | **Reporting** | PostgreSQL | Conserver | Faible | ✅ | ❌ |
| `ReportDefinition` type | `src/types/index.ts:330` | Type définition | `ReportDefinition` | **Reporting** | TypeScript | Conserver | N/A | ✅ | N/A |
| `reportEngine` singleton | `src/lib/reporting.ts:94` | Instance | `ReportEngine` | **Reporting** | Singleton | Conserver | N/A | ✅ | N/A |
| `reportDefinitionRepo` | `src/lib/reporting.ts:99` | Repository | `ReportDefinition` | **Reporting** | Repository | Conserver | Faible | ✅ | ❌ |
| `Reports.tsx` | `src/pages/Reports.tsx` | UI rapports | `Report` | **Reporting** | Page | Utiliser `reportEngine` | Moyen | ✅ | ❌ |
| `ReportBuilder.tsx` | `src/pages/ReportBuilder.tsx` | UI builder | `Report` | **Reporting** | Page | Connecter au moteur | Faible | ✅ | ❌ |

---

## 21. Export

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|------|--------------|----------------|
| `export.ts` | `src/lib/export.ts` | PDF/Excel/CSV | `Export` | **Reporting** | Conserver tel quel | Faible | ✅ | ❌ |
| `exportPDF` | `src/lib/export.ts` | Export PDF | `Export` | **Reporting** | Conserver | N/A | ✅ | N/A |
| `exportExcel` | `src/lib/export.ts` | Export Excel | `Export` | **Reporting** | Conserver | N/A | ✅ | N/A |
| `exportCSV` | `src/lib/export.ts` | Export CSV | `Export` | **Reporting** | Conserver | N/A | ✅ | N/A |
| Nom église hardcoded | `src/lib/export.ts` | Nom dans export | `OrganizationContext` | **Organization** | Remplacer par config | Faible | ✅ | ✅ |

---

## 22. Offline / Sync

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|------|--------------|----------------|
| `dataLayer.ts` | `src/lib/dataLayer.ts` | Couche données | `DataLayer` | **OfflineSync** | Conserver + compléter handlers | Faible | ✅ | ❌ |
| `usePowerSyncStatus` | `src/lib/dataLayer.ts` | Status sync | `SyncStatus` | **OfflineSync** | Conserver | N/A | ✅ | N/A |
| `PowerSyncProvider` | `src/components/PowerSyncProvider.tsx` | Provider PowerSync | `SyncProvider` | **OfflineSync** | Conserver | N/A | ✅ | N/A |
| `sync.ts` (supposé) | `src/lib/sync.ts` | Sync handlers | `SyncManager` | **OfflineSync** | Ajouter handlers manquants | Moyen | ✅ | ❌ |
| Sync handlers manquants | — | accounts, versements, groups, members, group_memberships, form_*, custom_*, report_definitions | `SyncManager` | **OfflineSync** | Ajouter 10+ handlers | Moyen | ✅ | ❌ |

---

## 23. Utilitaires Généraux

| Élément | Current Location | Current Responsibility | Target Concept | Target Capability | Migration Strategy | Risk | Can Wrap Now? | Can Remove Now? |
|---------|-----------------|----------------------|---------------|------------------|-------------------|------|--------------|----------------|
| `utils.ts` | `src/lib/utils.ts` | generateId, formatDate, formatCentsToFCFA | `Utils` | Foundation | Conserver | N/A | ✅ | N/A |
| `formatCentsToFCFA` | `src/lib/utils.ts` | Conversion cents→FCFA | `Utils` | Foundation | Conserver | N/A | ✅ | N/A |
| `generateId` | `src/lib/utils.ts` | Générateur ID | `Utils` | Foundation | Conserver | N/A | ✅ | N/A |
| `getPeriodRange` | `src/lib/utils.ts` | Plage période | `Utils` | Foundation | Conserver | N/A | ✅ | N/A |

---

## 24. Résumé des Hardcodes Organisationnels

| Hardcode | Localisations | Target | Migration |
|----------|--------------|--------|-----------|
| `org-1` | 30+ occurrences | `OrganizationContext.organizationId` | Remplacer progressivement |
| `local-user` | `useLocalStore.ts:99`, `audit.ts:28` | Auth user ID | Remplacer par `authService.getUser()?.id` |
| `Église MFE-JC Centrale` | `useLocalStore.ts:106`, `export.ts` | `OrganizationContext.name` | Via `appConfig` |
| `cat-dime` (catégorie par défaut) | 5+ occurrences | `Category` | Via BD |

---

## 25. Appels Directs UI → Logique Métier (Violations de Couche)

| Page | Appels directs | Vers | Action |
|------|---------------|------|--------|
| `Dashboard.tsx` | `useLocalStore().getCaisseForDisplay()` | Store | ✅ Correct — via store |
| `GroupDetail.tsx` | `useLocalStore().createGroup()` | Store | ✅ Correct — via store |
| `EventDetail.tsx` | `useLocalStore().updateEventStatus()` | Store | ✅ Correct — via store |
| `Versement.tsx` | `useLocalStore().createVersement()` | Store | ✅ Correct — via store |
| `CulteDetail.tsx` | `useLocalStore().updateCotisation()` | Store | ✅ Correct — via store |
| `ArchiveService` | Direct DB calls | PowerSync | ⚠️ Nécessite adapter |
| `reporting.ts` | `db.getAll<Transaction>('transactions')` | IndexedDB | ⚠️ Doit utiliser PowerSync |

---

## 26. Dépendances Croisées Critiques

| Module | Dépendances entrantes | Dépendances sortantes |
|--------|---------------------|---------------------|
| `useLocalStore.ts` (1087 lignes) | `dataLayer`, `powersync`, `cotisation-logic`, `rbac`(import mort) | 35+ pages, `dataLayer`, `account`, `audit`, `archiveService` |
| `dataLayer.ts` (892 lignes) | `useLocalStore`, `powersync` | Toutes les pages en lecture |
| `audit.ts` | `powersync`, `utils` | `useLocalStore`, `archiveService`, `formSystem`, `customFields`, `reporting` |
| `archiveService.ts` | `powersync`, `audit` | `useLocalStore` (non utilisé), `Archives.tsx` (non intégré) |
| `reporting.ts` | `utils`, `audit` | `useLocalStore` (via db direct — problème) |
| `account.ts` | `powersync` | `useLocalStore`, `GroupDetail`, `Dashboard` |

---

## 27. Dépendances du Store vers le Monde Extérieur

| Dépendance | Type | Usage |
|-----------|------|-------|
| `@/lib/rbac` | Importé mais JAMAIS utilisé | Supprimer l'import |
| `@/lib/cotisation-logic` | `determinerStatutAvance`, `calculerDon`, `isPaiementVerrouille` (mort) | `isPaiementVerrouille` n'existe pas — bug |
| `@/lib/dataLayer` | `addTransactionPS`, `updateTransactionPS`, etc. | Opérations PowerSync |
| `@/lib/powersync` | `getPowerSyncDatabase` | Accès BD |
| `@/lib/utils` | `generateId`, `formatDate`, `formatCentsToFCFA` | Utilitaires |

---

## 28. Bugs Identifiés

| Bug | Localisation | Impact | Priorité |
|-----|-------------|--------|----------|
| `isPaiementVerrouille` importé mais non défini | `src/store/useLocalStore.ts:13,817` | Crash au markCotisationPaid | BLOQUANT |
| `checkPermission` importé mais JAMAIS appelé | `src/store/useLocalStore.ts:9` | Code mort | Mineur |
| `org-1` hardcodé 30+ fois | Multiple fichiers | Multi-tenant impossible | Moyen |
| `ArchiveRegistry` non intégré à l'UI | `src/lib/archiveService.ts` vs `src/pages/Archives.tsx` | Feature non fonctionnelle | Moyen |
| `reporting.ts` utilise IndexedDB au lieu de PowerSync | `src/lib/reporting.ts:42` | Données non sync | Moyen |
| Mapping `Account→caisses` incorrect | `src/lib/archiveService.ts:17` | Archive des comptes cassée | Mineur |
