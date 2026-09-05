# Plan de Migration par Domaine

> Date : 2026-09-05
> Objet : Étapes de migration ordonnées par priorité

---

## Priorité Globale Recommandée

| Rang | Domaine | Criticité | Justification |
|------|---------|-----------|---------------|
| 1 | **Transaction/Immunité** | BLOQUANT | Invariant jamais violé — intégrité financière |
| 2 | **Organization/Caisses→Accounts** | BLOQUANT | Duplication crée des incohérences financières |
| 3 | **Versement Canonique** | BLOQUANT | Invariant paire de transactions — risque de déséquilibre |
| 4 | **Sync Complets** | BLOQUANT | Données perdues en cas de réinstallation |
| 5 | **Event Budget (migration jsonb→tables)** | IMPORTANT | Migration de données complexe |
| 6 | **Archive Integration** | IMPORTANT | Service existe mais pas utilisé |
| 7 | **Formulaires** | IMPORTANT | Feature demandée, déjà codée côté lib |
| 8 | **Custom Fields** | IMPORTANT | Feature demandée, déjà codée côté lib |
| 9 | **Reporting Builder** | IMPORTANT | Feature demandée, lib existe |
| 10 | **GroupMembership UI** | MINEUR | Feature utile, pas critique |
| 11 | **Account UI** | MINEUR | Feature utile |
| 12 | **RBAC RLS** | MINEUR | Mono-église, pas critique actuellement |

---

## Domaine 1 : Transaction — Immunité des Approuvées

### Étapes

1. **Modifications store** (`src/store/useLocalStore.ts`)
   - `updateTransaction` : ajouter garde `if (oldTx.status === 'APPROVED') throw new Error('...')`
   - `deleteTransaction` : ajouter garde `if (oldTx.status === 'APPROVED') throw new Error('...')`
   - `batchDeleteTransactions` : idem

2. **Modifications UI**
   - `src/pages/TransactionEdit.tsx` : désactiver édition si status = APPROVED
   - `src/pages/Finance.tsx` : cacher bouton supprimer pour transactions APPROVED

3. **Migration données**
   - Aucune — pas de structure de données modifiée

4. **Tests**
   - Tenter de modifier une transaction APPROVED → error
   - Tenter de supprimer une transaction APPROVED → error
   - Tenter d'éditer via URL → refus

### Risques
- Aucune — ajout de gardes uniquement

### Fenêtre de maintenance
- Aucune — changement code uniquement

---

## Domaine 2 : Organization — Fusion Caisses→Accounts

### Étapes

1. **Migration BD** (proposition — pas d'exécution)
   ```sql
   -- Migrer caisses → accounts
   INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at)
   SELECT id, org_id, 'GROUP', id, name, 'XOF', status, archived_at, archived_by, archive_reason, created_at, updated_at
   FROM caisses
   WHERE id != 'main';
   
   -- Migrer caisses.main → accounts.main
   INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, created_at, updated_at)
   SELECT 'main', org_id, 'ORGANIZATION', 'org-1', name, 'XOF', status, created_at, updated_at
   FROM caisses WHERE id = 'main';
   ```

2. **Migrations UI**
   - `src/store/useLocalStore.ts` : `createGroup` → créer uniquement `Account`, plus `Caisse`
   - `src/pages/Dashboard.tsx` : utiliser `accounts` au lieu de `caisses`
   - `src/pages/Versement.tsx` : utiliser `accounts` au lieu de `caisses`
   - `src/pages/GroupDetail.tsx` : utiliser `accounts` au lieu de `caisses`
   - `src/lib/account.ts` : déjà conforme (utilise `transactions` pour le calcul dérivé)

3. **Migration sync**
   - `src/lib/sync.ts` : supprimer handler `caisses`, ajouter handler `accounts`

4. **Migration données**
   - Synchroniser les données locales existantes vers `accounts`
   - Vérifier l'intégrité avant suppression de `caisses`

5. **Nettoyage**
   - Supprimer le type `Caisse` et l'entité `caisses` du store
   - Supprimer le sync des caisses
   - Optionnel : DROP TABLE caisses (après validation)

### Risques
- **Élevé** : Changement de modèle de données — toutes les transactions existantes doivent rester fonctionnelles
- **Moyen** : Les transactions créées avec `sourceCaisseId` doivent continuer à pointer vers les bonnes accounts

### Fenêtre de maintenance
- **Avec maintenance** : Migration des données requiert un arrêt en écriture
- Les tables peuvent coexister pendant la migration (double write)

---

## Domaine 3 : Versement Canonique

### Étapes

1. **Migration BD**
   - La table `versements` existe déjà — pas de migration nécessaire

2. **Store**
   - Ajouter `createVersement` dans `useLocalStore.ts`
   - Utiliser la table `versements` pour tracked le versement
   - Créer 2 transactions liées par `versementId`

3. **UI**
   - Refactoriser `src/pages/Versement.tsx` pour utiliser `createVersement()`
   - Afficher l'historique des versements depuis la table `versements`

4. **Sync**
   - Ajouter handler `versements` dans `src/lib/sync.ts`

5. **Validation**
   - Vérifier que chaque versement crée exactement 2 transactions
   - Vérifier que les 2 transactions ont le même `versementId`

### Risques
- **Faible** — La table existe déjà, seule l'UI change

### Fenêtre de maintenance
- Aucune — changement UI uniquement

---

## Domaine 4 : Sync Complet

### Étapes

1. **Ajouter handlers sync** dans `src/lib/sync.ts` :
   - `accounts` : create, update, delete
   - `versements` : create, update
   - `groups` : create, update, delete, archive, restore
   - `members` : create, update, delete, archive, restore
   - `group_memberships` : create, delete
   - `form_definitions` : create, update, delete
   - `form_submissions` : create, update
   - `custom_field_definitions` : create, update, delete
   - `custom_field_values` : create, update, delete
   - `report_definitions` : create, update, delete

2. **Supprimer les handlers obsolètes** :
   - `caisses` → `accounts`
   - `orgUnits` → `groups`

3. **Validation**
   - Vérifier que chaque entité syncée est également présente dans Supabase après sync

### Risques
- **Faible** — Ajouts uniquement, pas de suppression de fonctionnalités existantes

### Fenêtre de maintenance
- Aucune

---

## Domaine 5 : Event Budget — Migration jsonb→tables

### Étapes

1. **Migration données**
   - Pour chaque événement avec `budget_items` jsonb :
     ```sql
     -- Créer event_budget
     INSERT INTO event_budgets (id, event_id, currency, created_at)
     VALUES (gen_random_uuid(), event_id, 'XOF', NOW());
     
     -- Créer budget_lines
     INSERT INTO budget_lines (id, event_budget_id, category_id, planned_amount_cents, actual_amount_cents, created_at)
     SELECT gen_random_uuid(), eb.id, bi."categoryId", bi."allocated", bi."spent", NOW()
     FROM event_budgets eb, jsonb_array_elements(e."budget_items") bi
     WHERE e.id = event_id;
     ```

2. **Store**
   - `addBudgetItem` → insérer dans `budget_lines` + créer `event_budget` si nécessaire
   - `removeBudgetItem` → supprimer de `budget_lines`
   - Supprimer `budgetItems` de `events.budget_items` jsonb

3. **UI**
   - `EventDetail.tsx` : utiliser `budget_lines` au lieu de `budgetItems`

### Risques
- **Élevé** — Migration de données jsonb structurée
- **Moyen** — Les événements existants peuvent avoir des données jsonb complexes

### Fenêtre de maintenance
- **Avec maintenance** — Migration des données requiert un arrêt en écriture
- Les 2 modèles peuvent coexister pendant la migration

---

## Domaine 6 : Archive Integration

### Étapes

1. **Intégrer ArchiveRegistry**
   - `src/pages/Archives.tsx` : utiliser `archiveRegistry.listArchived()`
   - `src/store/useLocalStore.ts` : utiliser `archiveRegistry.archive()` et `archiveRegistry.restore()`
   - Enregistrer les policies pour Group, Member, Event, Account, Category

2. **Validation**
   - Vérifier que l'archive d'un groupe avec solde non nul est rejetée
   - Vérifier que la restauration crée une entrée audit

### Risques
- **Faible** — Le service existe déjà

### Fenêtre de maintenance
- Aucune

---

## Domaine 7 : Formulaires

### Étapes

1. **Créer la page** `src/pages/FormBuilder.tsx`
   - CRUD pour `FormDefinition`
   - Builder de champs (drag & drop ou formulaire séquentiel)

2. **Créer la page** `src/pages/FormFill.tsx`
   - Rendu dynamique des formulaires
   - Validation des soumissions

3. **Routage**
   - Ajouter `/forms` et `/forms/:id` dans `App.tsx`

4. **Sync**
   - Ajouter handlers dans `src/lib/sync.ts`

### Risques
- **Moyen** — Nouvelle page UI à développer

### Fenêtre de maintenance
- Aucune

---

## Domaine 8 : Custom Fields

### Étapes

1. **Créer la page** `src/pages/CustomFields.tsx`
   - CRUD pour `CustomFieldDefinition`
   - Association avec entities (Member, Group, Event)

2. **Intégration**
   - Ajouter les champs personnalisés dans les pages de détail (Member, Group)

3. **Sync**
   - Ajouter handlers dans `src/lib/sync.ts`

### Risques
- **Faible** — Le service existe déjà

### Fenêtre de maintenance
- Aucune

---

## Domaine 9 : Reporting Builder

### Étapes

1. **Créer la page** `src/pages/ReportBuilder.tsx`
   - CRUD pour `ReportDefinition`
   - Interface pour configurer dimensions, metrics, filters, groupBy

2. **Intégration**
   - Utiliser `AggregationEngine` existant
   - Afficher les résultats dans un tableau interactif

3. **Sync**
   - Ajouter handler dans `src/lib/sync.ts`

### Risques
- **Moyen** — Interface à développer

### Fenêtre de maintenance
- Aucune

---

## Domaine 10 : GroupMembership UI

### Étapes

1. **Créer la page** `src/pages/GroupMembers.tsx`
   - Liste des membres d'un groupe
   - Ajouter/retirer des membres

2. **Intégration**
   - Lier depuis `GroupDetail.tsx`

### Risques
- **Faible**

### Fenêtre de maintenance
- Aucune

---

## Domaine 11 : Account UI

### Étapes

1. **Créer la page** `src/pages/Accounts.tsx`
   - Liste des comptes (organisation + groupes)
   - Détail solde, historique

2. **Routage**
   - Ajouter `/accounts` dans `App.tsx`

### Risques
- **Faible**

### Fenêtre de maintenance
- Aucune

---

## Domaine 12 : RBAC RLS

### Étapes

1. **Créer les politiques RLS** basées sur `role_assignments`
2. **Configurer les rôles** : TREASURIER, PASTEUR, SECRETAIRE, etc.
3. **Vérifier** que chaque utilisateur ne voit que ses données autorisées

### Risques
- **Élevé** — Changement de sécurité
- Risque de bloquer l'accès si les politiques sont mal configurées

### Fenêtre de maintenance
- **Avec maintenance** — Tester soigneusement avant déploiement

---

## Plan de Rollback

Pour chaque domaine, le rollback est défini :

| Domaine | Rollback |
|---------|----------|
| 1. Transaction immunité | Revert les gardes — retour à l'état précédent |
| 2. Caisses→Accounts | Supprimer les comptes créés, revenir aux caisses |
| 3. Versement | Revenir à l'ancien flux Versement.tsx |
| 4. Sync | Supprimer les nouveaux handlers |
| 5. Event Budget | Restaurer le jsonb depuis backup |
| 6. Archive | Revenir aux méthodes store directes |
| 7. Formulaires | Supprimer la page Forms |
| 8. Custom Fields | Supprimer la page CustomFields |
| 9. Reporting | Revenir à Reports.tsx existant |
| 10. GroupMembership | Supprimer la page |
| 11. Account UI | Supprimer la page |
| 12. RBAC | Supprimer les politiques RLS |
