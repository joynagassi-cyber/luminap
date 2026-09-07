# Migration Order — Ordre de Migration par Risque/Bénéfice

> Date : 2026-09-07
> Objet : Ordre exact des migrations pour minimiser le risque

---

## 1. Principes

L'ordre de migration suit 3 règles :
1. **Risques d'abord** — Les problèmes bloquants sont corrigés en priorité
2. **Isolation** — Chaque migration est contenue dans un seam identifié
3. **Validation** — Chaque étape est testée avant de passer à la suivante

---

## 2. Tranche 0 : Corrections de Bugs (Jour 1)

Ces corrections sont sans risque et résolvent des bugs bloquants.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 0.1 | Ajouter `isPaiementVerrouille` dans `cotisation-logic.ts` | `src/lib/cotisation-logic.ts` | Faible | Corrige crash au paiement cotisation |
| 0.2 | Supprimer import mort `checkPermission` | `src/store/useLocalStore.ts` | Faible | Code plus propre |
| 0.3 | Corriger mapping `Account→accounts` dans `archiveService.ts` | `src/lib/archiveService.ts` | Faible | Archives fonctionnelles |

---

## 3. Tranche 1 : Organisation Context (Jour 2-3)

**Objectif** : Remplacer les hardcodes `org-1` par un contexte injecté.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 1.1 | Créer `OrganizationContext` | `src/context/OrganizationContext.tsx` | Faible | Base pour multi-tenant |
| 1.2 | Créer `src/lib/orgContext.ts` avec `getOrganizationId()` | Nouveau | Faible | Abstraction org |
| 1.3 | Remplacer `org-1` dans `audit.ts` | `src/lib/audit.ts` | Faible | Plus de hardcode |
| 1.4 | Remplacer `org-1` dans `archiveService.ts` | `src/lib/archiveService.ts` | Faible | Plus de hardcode |
| 1.5 | Remplacer `org-1` dans `auth.ts` (default) | `src/lib/auth.ts` | Faible | Plus de hardcode |
| 1.6 | Remplacer `org-1` dans `DEFAULT_USER` store | `src/store/useLocalStore.ts` | Faible | Plus de hardcode |
| 1.7 | Ne PAS toucher les pages (trop risqué) | — | — | Stabilité |

**Validation** : `pnpm tsc --noEmit` et tests manuels de login/audit

---

## 4. Tranche 2 : Transaction Immunité (Jour 4-5)

**Objectif** : Protéger les transactions APPROVED contre modification/suppression.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 2.1 | Créer `TransactionCapability` interface | `src/capabilities/workflow/TransactionCapability.ts` | Faible | Isolation |
| 2.2 | Ajouter garde APPROVED dans `updateTransaction` | `src/store/useLocalStore.ts:280` | Faible | Invariant respecté |
| 2.3 | Ajouter garde APPROVED dans `deleteTransaction` | `src/store/useLocalStore.ts:177` | Faible | Invariant respecté |
| 2.4 | Désactiver bouton éditer si APPROVED | `src/pages/TransactionEdit.tsx` | Faible | UX cohérent |
| 2.5 | Masquer bouton supprimer pour APPROVED | `src/pages/Finance.tsx` | Faible | UX cohérent |

**Validation** : Tester modification/suppression d'une transaction APPROVED → error

---

## 5. Tranche 3 : Cotisation Bug Fix (Jour 6)

**Objectif** : Corriger le bug `isPaiementVerrouille` manquant.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 3.1 | Implémenter `isPaiementVerrouille` | `src/lib/cotisation-logic.ts` | Faible | Corrige crash |

**Implémentation** :
```typescript
// src/lib/cotisation-logic.ts
export function isPaiementVerrouille(params: {
  dateCulte: string;
  cotisationEstPaye: boolean;
}): boolean {
  const culteDate = new Date(params.dateCulte);
  const today = new Date();
  const diffDays = (today.getTime() - culteDate.getTime()) / (1000 * 60 * 60 * 24);
  // Verrouillage 30 jours après le culte
  return diffDays > 30 || params.cotisationEstPaye;
}
```

**Validation** : Tester `markCotisationPaid` sur un culte récent et ancien

---

## 6. Tranche 4 : Adapters Legacy (Jour 7-8)

**Objectif** : Créer les adapters pour isoler le legacy.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 4.1 | Créer `CaisseAdapter` | `src/adapters/CaisseAdapter.ts` | Faible | Isolement caisses/accounts |
| 4.2 | Créer `OrgUnitAdapter` | `src/adapters/OrgUnitAdapter.ts` | Faible | Isolement org_units/groups |
| 4.3 | Créer `TransactionLegacyAdapter` | `src/adapters/TransactionLegacyAdapter.ts` | Faible | Mapping PS→TS |
| 4.4 | Créer `VersementLegacyAdapter` | `src/adapters/VersementLegacyAdapter.ts` | Faible | Versements dérivés |
| 4.5 | Créer `EventBudgetAdapter` | `src/adapters/EventBudgetAdapter.ts` | Moyen | Budget jsonb→tables |

**Validation** : `pnpm tsc --noEmit` — compilation successful

---

## 7. Tranche 5 : Resource Seam — Caisses→Accounts (Jour 9-11)

**Objectif** : Utiliser `accounts` comme source de vérité.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 5.1 | Créer `AccountAdapter` (inversé de CaisseAdapter) | `src/adapters/AccountAdapter.ts` | Faible | Double sens |
| 5.2 | Utiliser `CaisseAdapter` dans `getCaisseForDisplay` | `src/store/useLocalStore.ts` | Moyen | Fusion caisses+accounts |
| 5.3 | Mettre à jour `Dashboard.tsx` pour utiliser accounts | `src/pages/Dashboard.tsx` | Moyen | Source de vérité |
| 5.4 | Mettre à jour `GroupDetail.tsx` pour accounts | `src/pages/GroupDetail.tsx` | Moyen | Source de vérité |
| 5.5 | Mettre à jour `Versement.tsx` pour accounts | `src/pages/Versement.tsx` | Moyen | Source de vérité |
| 5.6 | Conserver `caisses` pour backward compat | — | — | Stabilité |

**Validation** : Dashboard affiche les bons soldes, versements fonctionnels

---

## 8. Tranche 6 : OfflineSync Complet (Jour 12-14)

**Objectif** : Compléter les handlers sync manquants.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 6.1 | Ajouter handler `accounts` dans sync.ts | `src/lib/sync.ts` | Faible | Sync accounts |
| 6.2 | Ajouter handler `versements` dans sync.ts | `src/lib/sync.ts` | Faible | Sync versements |
| 6.3 | Ajouter handler `groups` dans sync.ts | `src/lib/sync.ts` | Faible | Sync groups |
| 6.4 | Ajouter handler `members` dans sync.ts | `src/lib/sync.ts` | Faible | Sync members |
| 6.5 | Ajouter handler `group_memberships` dans sync.ts | `src/lib/sync.ts` | Faible | Sync memberships |
| 6.6 | Ajouter handler `form_definitions` dans sync.ts | `src/lib/sync.ts` | Faible | Sync forms |
| 6.7 | Ajouter handler `form_submissions` dans sync.ts | `src/lib/sync.ts` | Faible | Sync submissions |
| 6.8 | Ajouter handler `custom_field_definitions` dans sync.ts | `src/lib/sync.ts` | Faible | Sync custom fields |
| 6.9 | Ajouter handler `custom_field_values` dans sync.ts | `src/lib/sync.ts` | Faible | Sync values |
| 6.10 | Ajouter handler `report_definitions` dans sync.ts | `src/lib/sync.ts` | Faible | Sync reports |
| 6.11 | Supprimer handler `caisses` (remplacé par accounts) | `src/lib/sync.ts` | Moyen | Nettoyage |
| 6.12 | Supprimer handler `orgUnits` (remplacé par groups) | `src/lib/sync.ts` | Moyen | Nettoyage |

**Validation** : Réinstallation de l'app → données synchronisées depuis le cloud

---

## 9. Tranche 7 : Permission Capability (Jour 15)

**Objectif** : Remplacer le stub `checkPermission`.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 7.1 | Créer `PermissionCapability` interface | `src/capabilities/permission/PermissionCapability.ts` | Faible | Isolation |
| 7.2 | Implémenter `PermissionEvaluator` avec `role_assignments` | `src/capabilities/permission/PermissionEvaluator.ts` | Moyen | Permissions réelles |
| 7.3 | Remplacer stub dans `rbac.ts` | `src/lib/rbac.ts` | Moyen | Permissions fonctionnelles |
| 7.4 | Vérifier que les pages n'utilisent pas `checkPermission` | `src/store/useLocalStore.ts` | Faible | Pas de régression |

**Validation** : Différents rôles voient différents écrans

---

## 10. Tranche 8 : Lifecycle Integration (Jour 16)

**Objectif** : Intégrer `ArchiveRegistry` dans l'UI.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 8.1 | Intégrer `archiveRegistry` dans `Archives.tsx` | `src/pages/Archives.tsx` | Moyen | UI fonctionnelle |
| 8.2 | Adapter `archiveGroup` du store vers `archiveRegistry` | `src/store/useLocalStore.ts` | Moyen | Centralisation |
| 8.3 | Adapter `archiveMember` du store vers `archiveRegistry` | `src/store/useLocalStore.ts` | Moyen | Centralisation |
| 8.4 | Enregistrer les policies dans `archiveService.ts` | `src/lib/archiveService.ts` | Faible | Validation business |

**Validation** : Archive/restore d'un groupe et membre

---

## 11. Tranche 9 : Reporting Fix (Jour 17)

**Objectif** : Corriger `reporting.ts` qui utilise IndexedDB.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 9.1 | Remplacer `db.getAll` par PowerSync dans `AggregationEngine` | `src/lib/reporting.ts:42` | Moyen | Données à jour |
| 9.2 | Utiliser `useQuery` hook pour les données | `src/lib/reporting.ts` | Moyen | Sync en temps réel |

**Validation** : Les rapports montrent les dernières données

---

## 12. Tranche 10 : Versement Canonique (Jour 18-19)

**Objectif** : Utiliser la table `versements` au lieu de créer 2 transactions directes.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 10.1 | Créer `VersementRepo` | `src/lib/versements.ts` | Faible | Repository |
| 10.2 | Adapter `createVersement` du store pour utiliser la table | `src/store/useLocalStore.ts` | Moyen | Canonique |
| 10.3 | Mettre à jour `Versement.tsx` pour utiliser `createVersement()` | `src/pages/Versement.tsx` | Moyen | UI cohérente |
| 10.4 | Afficher l'historique des versements depuis la table | `src/pages/Versement.tsx` | Faible | UX amélioré |

**Validation** : Chaque versement crée exactement 1 entrée `versements` + 2 transactions avec `versementId`

---

## 13. Tranche 11 : Forms UI Integration (Jour 20)

**Objectif** : Connecter les pages formulaires au store.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 11.1 | Utiliser `formDefinitionRepo` dans `FormBuilder.tsx` | `src/pages/FormBuilder.tsx` | Faible | CRUD fonctionnel |
| 11.2 | Utiliser `formSubmissionRepo` dans `FormFill.tsx` | `src/pages/FormFill.tsx` | Faible | Soumission fonctionnelle |
| 11.3 | Utiliser `customFieldRepo` dans `CustomFields.tsx` | `src/pages/CustomFields.tsx` | Faible | CRUD fonctionnel |

**Validation** : Créer/éditer/supprimer un formulaire, remplir un formulaire

---

## 14. Tranche 12 : Relationship UI (Jour 21)

**Objectif** : Ajouter l'UI pour les memberships.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 14.1 | Créer `GroupMembers.tsx` | `src/pages/GroupMembers.tsx` | Faible | UI manquante |
| 14.2 | Lier depuis `GroupDetail.tsx` | `src/pages/GroupDetail.tsx` | Faible | Navigation |

**Validation** : Ajouter/un membre d'un groupe

---

## 15. Tranche 13 : Account UI (Jour 22)

**Objectif** : Créer l'UI pour les comptes.

| # | Migration | Fichiers | Risque | Bénéfice |
|---|-----------|----------|--------|----------|
| 15.1 | Créer `Accounts.tsx` | `src/pages/Accounts.tsx` | Faible | UI manquante |
| 15.2 | Ajouter route `/accounts` | `src/App.tsx` | Faible | Navigation |

**Validation** : Liste des comptes avec soldes

---

## 16. Résumé Visuel

```
Tranche 0: [Bug Fixes]          ████████░░░░░░░░░░░░░░░░░░  Jour 1
Tranche 1: [Organization]        ████████░░░░░░░░░░░░░░░░░░  Jour 2-3
Tranche 2: [Transaction Guard]   ████████░░░░░░░░░░░░░░░░░░  Jour 4-5
Tranche 3: [Cotisation Fix]      ████████░░░░░░░░░░░░░░░░░░  Jour 6
Tranche 4: [Adapters]            ████████░░░░░░░░░░░░░░░░░░  Jour 7-8
Tranche 5: [Resource Seam]       ████████░░░░░░░░░░░░░░░░░░  Jour 9-11
Tranche 6: [OfflineSync]         ████████░░░░░░░░░░░░░░░░░░  Jour 12-14
Tranche 7: [Permission]          ████████░░░░░░░░░░░░░░░░░░  Jour 15
Tranche 8: [Lifecycle]           ████████░░░░░░░░░░░░░░░░░░  Jour 16
Tranche 9: [Reporting Fix]       ████████░░░░░░░░░░░░░░░░░░  Jour 17
Tranche 10: [Versement]          ████████░░░░░░░░░░░░░░░░░░  Jour 18-19
Tranche 11: [Forms UI]           ████████░░░░░░░░░░░░░░░░░░  Jour 20
Tranche 12: [Relationship UI]    ████████░░░░░░░░░░░░░░░░░░  Jour 21
Tranche 13: [Account UI]         ████████░░░░░░░░░░░░░░░░░░  Jour 22
```

---

## 17. Points de Contrôle (Gates)

| Gate | Tranche | Critère de réussite |
|------|---------|-------------------|
| Gate 0 | 0 | `pnpm tsc --noEmit` successful, no runtime errors |
| Gate 1 | 1 | Login fonctionne, org-1 remplacé dans services |
| Gate 2 | 2 | Transaction APPROVED immutable (test manual) |
| Gate 3 | 3 | `markCotisationPaid` ne crash plus |
| Gate 4 | 4 | Tous les adapters compilent |
| Gate 5 | 5 | Dashboard affiche les bons soldes |
| Gate 6 | 6 | Réinstallation préserve les données |
| Gate 7 | 7 | Permissions fonctionnelles pour différents rôles |
| Gate 8 | 8 | Archive/restore fonctionne via UI |
| Gate 9 | 9 | Rapports montrent données à jour |
| Gate 10 | 10 | Versements créés via table canonique |
| Gate 11 | 11 | Formulaires CRUD fonctionnels |
| Gate 12 | 12 | Memberships gérées via UI |
| Gate 13 | 13 | Page Accounts fonctionne |
