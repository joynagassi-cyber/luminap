# Écarts Modèle Canonique

> Date : 2026-09-05
> Objet : Identification et classification de tous les écarts par domaine

---

## Méthodologie

Chaque écart est classé :
- **BLOQUANT** : Touche à l'intégrité financière ou à l'audit
- **IMPORTANT** : Empêche le fonctionnement canonique mais sans risque financier immédiat
- **MINEUR** : Écart cosmétique ou fonctionnel mineur

---

## 1. Organization

### Écart ORG-1 — Duplication caisses / accounts
**Criticité : BLOQUANT**

| Aspect | Code actuel | Canonique |
|--------|------------|-----------|
| Caisse de groupe | Table `caisses` + type `Caisse` | Table `accounts` avec `owner_type='GROUP'` |
| Organisation | Table `org_units` + type `OrgUnit` | Table `groups` |
| Usage UI | `Dashboard.tsx`, `GroupDetail.tsx`, `Versement.tsx` utilisent `caisses` | `accounts` n'est pas utilisé |

**Preuve** :
- `src/pages/Dashboard.tsx:22` — `const { caisses, transactions } = useLocalStore();`
- `src/store/useLocalStore.ts:107` — `DEFAULT_CAISSES` hardcoded
- `src/lib/sync.ts:83` — sync vers `caisses` mais pas vers `accounts`
- `src/pages/Versement.tsx:15` — utilise `caisses` au lieu de `accounts`

**Impact** : Les deux systèmes coexistent sans coordination. Une caisse créée n'a pas de compte `accounts` correspondant.

### Écart ORG-2 — Duplication org_units / groups
**Criticité : IMPORTANT**

| Aspect | Code actuel | Canonique |
|--------|------------|-----------|
| Groupe | Table `org_units` + type `OrgUnit` | Table `groups` avec parent_group_id, responsable_member_id |
| Hiérarchie | `org_units` a `is_active`, pas de parent | `groups` a `parent_group_id` |

**Preuve** :
- `src/store/useLocalStore.ts:114-120` — `DEFAULT_ORG_UNITS` hardcoded
- `src/pages/Groups.tsx:15` — `const { orgUnits, caisses } = useLocalStore();`
- Migration `0002` crée `org_units` ; Migration `0026` crée `groups`

### Écart ORG-3 — Suppression cascade non sécurisée
**Criticité : BLOQUANT**

`src/store/useLocalStore.ts:393-408` — `deleteGroup` supprime TOUTES les transactions avec `sourceCaisseId` :
```ts
const groupTxs = get().transactions.filter(t => t.sourceCaisseId === id);
for (const tx of groupTxs) {
  await db.delete('transactions', tx.id);
}
```
**Canonique** : Un groupe ne doit pas pouvoir être supprimé s'il a des transactions. L'archive doit être utilisée.

---

## 2. Member / User

### Écart MEM-1 — Member table vs Auth profiles
**Criticité : MINEUR**

Les membres sont stockés dans `members` (table Supabase) et dans l'IndexedDB `members`.
L'authentification utilise `profiles` (Supabase) sans lien avec `members`.
Pas d'écran pour gérer les membres dans le contexte auth.

**Preuve** :
- `src/pages/Members.tsx` — CRUD membres sans lien avec auth
- `profiles` table existe mais n'est pas utilisée pour les membres de l'église

### Écart MEM-2 — GroupMembership non UI
**Criticité : MINEUR**

Le store a `memberships: GroupMembership[]` et les méthodes `addMemberToGroup` / `removeMemberFromGroup` mais aucune page UI.

**Preuve** :
- `src/store/useLocalStore.ts:444-471` — méthodes présentes
- `src/types/index.ts:235-243` — type défini
- Aucune page n'utilise `memberships`

---

## 3. RBAC

### Écart RBAC-1 — checkPermission stub
**Criticité : MINEUR (conforme amendement mono-église)**

`src/lib/rbac.ts:12-16` — `checkPermission` retourne toujours `true`.
C'est intentionnel pour la phase mono-église, conforme à l'amendement.

**Preuve** :
```ts
// Phase mono-église: stub toujours true
// Phase suivante: vrai contrôle avec UserRoleAssignment + Role.permissions
return true;
```

### Écart RBAC-2 — RLS open sur toutes les tables financières
**Criticité : BLOQUANT**

Toutes les tables financières (`transactions`, `audit_entries`, `caisses`, `accounts`, `versements`) ont des politiques `open_all` ou par commande open.
Tout utilisateur peut lire/modifier/supprimer n'importe quelle transaction.

**Preuve** :
- `src/transactions` : `open_tx_select`, `open_tx_insert`, `open_tx_update`, `open_tx_delete` — tous `USING (true)`
- `src/versements` : `versements_open_all` — `USING (true)`
- `src/accounts` : `accounts_open_all` — `USING (true)`

---

## 4. Group / Account

### Écart GROUP-1 — Caisses vs Accounts non synchronisés
**Criticité : BLOQUANT**

Quand un groupe est créé via `createGroup()`, le store crée :
1. `OrgUnit` (ancien)
2. `Caisse` (ancien)
3. `Group` (canonique)
4. `Account` (canonique)

Mais seul le `OrgUnit` et `Caisse` sont sync vers le cloud. Les `Group` et `Account` restent locaux.

**Preuve** :
`src/store/useLocalStore.ts:297-334` — `createGroup` crée les 4 entités mais :
```ts
await db.put('groups' as any, group);       // IndexedDB only
await db.put('accounts' as any, account);   // IndexedDB only
// PAS de enqueueSync pour groups ni accounts
```

### Écart GROUP-2 — Versement canonique non utilisé
**Criticité : BLOQUANT**

La table `versements` existe mais `Versement.tsx` crée 2 transactions directement au lieu d'utiliser le versement canonique.

**Preuve** :
- `src/pages/Versement.tsx:61-95` — crée `sourceTx` et `targetTx` avec `versementId` mais sans passer par `versements` table
- Le store n'a pas de méthode `createVersement()`
- `src/lib/sync.ts` — pas de handler `versements`

---

## 5. Event / EventBudget

### Écart EVENT-1 — Budget items en jsonb vs tables séparées
**Criticité : IMPORTANT**

Les événements utilisent `budget_items` jsonb dans la table `events`, alors que le canonique est `event_budgets` + `budget_lines`.

**Preuve** :
- `src/types/index.ts:115-123` — `BudgetItem` avec `id, label, allocated, spent, fundedBy, categoryId, isCustom`
- `src/types/index.ts:103` — `Event.budgetItems: BudgetItem[]`
- `src/store/useLocalStore.ts:350-370` — `addBudgetItem` / `removeBudgetItem` manipulent le jsonb
- Migration `0031` crée `event_budgets` et `budget_lines` — tables vides

### Écart EVENT-2 — Shopping items sans contrepartie BD
**Criticité : MINEUR**

`ShoppingItem` existe dans le type `Event` mais n'a aucune table correspondante.

**Preuve** :
- `src/types/index.ts:124-132` — `ShoppingItem` défini
- Aucune table Supabase pour les items de shopping
- `src/store/useLocalStore.ts:398-410` — `addShoppingItem` / `removeShoppingItem` / `updateShoppingItemStatus`

---

## 6. Transaction / Versement

### Écart TXN-1 — Montants en cents vs entiers
**Invariant NeverBreak #1 : MONTANTS EN CENTS**

Vérification :
- `src/types/index.ts:58` — `amount: number` (pas de précision sur cents)
- `src/pages/Versement.tsx:26` — `const amountNum = Math.round(parseFloat(amount || '0'));` puis `amountCents = amountNum * 100`
- `src/lib/account.ts:15` — `s + t.amount` (montants en cents directement)
- `src/lib/utils.ts` — `formatCentsToFCFA(amount / 100)`

**Résultat** : Les montants sont bien stockés en cents dans les transactions approuvées, mais le champ `amount` est typing comme `number` sans précision. **NON BLOQUANT** mais ambigu.

### Écart TXN-2 — Paire de transactions pour versement
**Invariant NeverBreak #3 : PAIRE DE TRANSACTIONS**

Vérification :
- `src/pages/Versement.tsx:61-95` — crée bien 2 transactions avec le même `versementId`
- `src/types/index.ts:71` — `Transaction.versementId: string | null`
- `src/lib/db.ts` — index `idx_transactions_versement_id`

**Résultat** : Respecté dans le flux actuel. **CONFORME**.

### Écart TXN-3 — Immunité des transactions approuvées
**Invariant NeverBreak #2 : IMMUABILITÉ**

Vérification :
- `src/store/useLocalStore.ts:145-175` — `updateTransaction` modifie directement sans vérification de statut
- `src/pages/TransactionEdit.tsx` — permet d'éditer même les transactions approuvées ? (à vérifier)
- `src/pages/Versement.tsx:103` — `handleConfirm` utilise `addTransaction` qui crée de nouvelles transactions, pas de mise à jour

**Résultat** : **NON CONFORME**. Les transactions approuvées peuvent être modifiées via `updateTransaction`. Aucune vérification de statut `APPROVED` n'empêche l'édition.

**Preuve** : `src/store/useLocalStore.ts:147` — `updateTransaction: async (id, data) => { ... }` sans vérification.

### Écart TXN-4 — Reverse vs suppressions
**Preuve** :
- `src/store/useLocalStore.ts:222-250` — `reverseTransaction` crée une contre-transaction
- `src/store/useLocalStore.ts:177-195` — `deleteTransaction` supprime directement sans vérification

**Résultat** : Les suppressions de transactions approuvées sont possibles. **NON CONFORME** à l'invariant d'immuabilité.

---

## 7. Versement

### Écart VERSE-1 — Table versements non utilisée par l'UI
**Criticité : BLOQUANT**

**Voir GROUP-2** — la table existe mais n'est pas utilisée.

### Écart VERSE-2 — Status versement vs DRAFT/APPROVED
**Criticité : IMPORTANT**

La table `versements` a un status `DRAFT | SUBMITTED | APPROVED | REJECTED` mais l'UI ne gère aucun de ces états.

**Preuve** : `src/types/index.ts:274` — `VersementStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'`

---

## 8. Category

### Écart CAT-1 — Catégories hardcoded
**Criticité : MINEUR**

Les 9 catégories sont hardcodées dans `src/store/useLocalStore.ts:122-130` et sync vers `categories` table via IndexedDB.

**Résultat** : Fonctionnel mais rigide. Les catégories ne peuvent pas être ajoutées/modifiées par l'UI.

---

## 9. AuditLog

### Écart AUDIT-1 — Audit systématique
**Invariant NeverBreak #4 : AUDITLOG SYSTÉMATIQUE**

Vérification :
- `createTransaction` → `writeAudit` ✅ (ligne 133)
- `updateTransaction` → `writeAudit` ✅ (ligne 167)
- `deleteTransaction` → `writeAudit` ✅ (ligne 189)
- `approveTransaction` → `writeAudit` ✅ (ligne 209)
- `createGroup` → `writeAudit` ✅ (ligne 343)
- `updateGroup` → `writeAudit` ✅ (ligne 376)
- `deleteGroup` → `writeAudit` ✅ (ligne 411)
- `createMember` → `writeAudit` ✅ (ligne 430)
- `updateMember` → `writeAudit` ✅ (ligne 450)
- `deleteMember` → `writeAudit` ✅ (ligne 467)

**Résultat** : **CONFORME**.

### Écart AUDIT-2 — actor_role_at_time présent
**Vérification** : Tous les appels à `writeAudit` passent `actorRoleAtTime: get().user.role`.
**Résultat** : **CONFORME**.

---

## 10. Archive

### Écart ARCH-1 — ArchiveService non intégré
**Criticité : IMPORTANT**

`ArchiveRegistry` existe mais n'est pas utilisé par l'UI. Les pages utilisent les méthodes directes du store.

**Preuve** :
- `src/lib/archiveService.ts:1-60` — service complet
- `src/pages/Archives.tsx:22-25` — filtrage direct, pas d'appel à `archiveRegistry`
- `src/store/useLocalStore.ts:380-420` — `archiveGroup`, `restoreGroup` font leur propre logique

### Écart ARCH-2 — Archive des comptes non implémentée
**Criticité : MINEUR**

`ArchiveRegistry.ENTITY_STORE_MAP` mappe `'Account'` vers `'caisses'` — incorrect si on migre vers `accounts`.

**Preuve** : `src/lib/archiveService.ts:13` — `Account: 'caisses'`

---

## 11. Formulaire

### Écart FORM-1 — Pas d'UI formulaires
**Criticité : IMPORTANT**

Les tables `form_definitions` et `form_submissions` existent, les repos existent, mais aucune page UI.

**Preuve** :
- `src/lib/formSystem.ts:1-90` — repo complet
- Aucune route `/form` dans `App.tsx`
- Aucune page `Form*`

### Écart FORM-2 — Pas de sync formulaires
**Criticité : IMPORTANT**

`src/lib/sync.ts` n'a pas de handler pour `form_definitions` ou `form_submissions`.

---

## 12. Custom Fields

### Écart CF-1 — Pas d'UI custom fields
**Criticité : IMPORTANT**

Même problème que les formulaires — tables + repos existent, pas d'UI.

### Écart CF-2 — Pas de sync custom fields
**Criticité : IMPORTANT**

Pas de handler sync pour `custom_field_definitions` ni `custom_field_values`.

---

## 13. Reporting

### Écart REP-1 — Pas de builder de rapport
**Criticité : IMPORTANT**

`QueryBuilder` et `AggregationEngine` existent mais l'UI `Reports.tsx` fait du calcul direct sans utiliser `ReportDefinition`.

**Preuve** :
- `src/lib/reporting.ts:22-75` — QueryBuilder + AggregationEngine
- `src/pages/Reports.tsx:1-50` — calculs directs, pas de builder

### Écart REP-2 — Pas de sync report_definitions
**Criticité : MINEUR**

Pas de handler sync pour `report_definitions`.

---

## 14. Notification

### Écart NOTIF-1 — Conforme
**Aucun écart** — Notifications sont pleinement implémentées avec trigger DB, realtime, et UI.

---

## 15. Offline / Sync

### Écart SYNC-1 — Handlers sync incomplets
**Criticité : BLOQUANT**

Les entities suivantes ne sont pas sync vers le cloud :
- `accounts`
- `versements`
- `groups`
- `members`
- `group_memberships`
- `form_definitions`
- `form_submissions`
- `custom_field_definitions`
- `custom_field_values`
- `report_definitions`

**Preuve** : `src/lib/sync.ts:55-95` — seuls `transactions`, `caisses`, `orgUnits`, `events`, `notifications` sont sync.

### Écart SYNC-2 — IndexedDB vs Supabase désynchronisation potentielle
**Criticité : BLOQUANT**

Si `accounts` et `groups` ne sont pas sync, une réinstallation de l'app perd ces données.

---

## Résumé des Invariants NeverBreak

| Invariant | Respecté ? | Preuve |
|-----------|-----------|--------|
| Montants en cents | ✅ | `amount` est en cents, `formatCentsToFCFA` divise par 100 |
| Transactions approuvées immuables | ❌ | `updateTransaction` et `deleteTransaction` n'ont pas de garde |
| Paire de transactions pour versement | ✅ | `Versement.tsx` crée 2 transactions avec même `versementId` |
| AuditLog systématique | ✅ | Tous les changements appellent `writeAudit` |
| Solde toujours dérivé | ✅ | `src/lib/account.ts:11-25` — calcul en mémoire, pas stocké |
| orgId partout | ✅ | Toutes les entités ont `orgId` |
