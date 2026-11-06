# Migration Hybride IndexedDB → PowerSync

## 📊 Résumé de la Migration

### Ce qui a été fait

| Élément | Statut | Détails |
|---------|--------|---------|
| **Schéma PowerSync** | ✅ Enrichi | 21 tables définies (contre 5 avant) |
| **DataLayer unifié** | ✅ Créé | `src/lib/dataLayer.ts` avec hooks lecture/écriture |
| **Dashboard** | ✅ Migré | Lectures via PowerSync, fallback IndexedDB |
| **Settings** | ✅ Migré | Notifications & comptes via PowerSync |
| **Help** | ✅ Migré | Notifications via PowerSync |
| **History** | ✅ Migré | Transactions, comptes, événements via PowerSync |
| **Trace** | ✅ Migré | Audit entries via PowerSync |
| **Notifications** | ✅ Migré | Notifications via PowerSync |
| **Finance** | ✅ Migré | Transactions filtrées via PowerSync |
| **Members** | ✅ Migré | Membres via PowerSync |

### Infrastructure PowerSync (déjà en place)

- ✅ Instance PowerSync connectée (6a9dd96302481fb31b945823)
- ✅ 21 tables répliquées depuis Supabase
- ✅ Connector Supabase implémenté
- ✅ Provider React créé
- ✅ GitHub secrets configurés

## 🏗️ Architecture Hybride

```
┌─────────────────────────────────────────────────────────┐
│                    Application                           │
│  (pages utilisent useLocalStore pour écritures)          │
└────────────────────────┬────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │ dataLayer │
                    │  hooks   │
                    └────┬────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
    ┌──────▼──────┐            ┌──────▼──────┐
    │ PowerSync   │            │ IndexedDB   │
    │ (primaire)  │←──────────→│ (fallback)  │
    └──────┬──────┘   sync     └──────┬──────┘
           │                           │
    ┌──────▼──────┐            ┌──────▼──────┐
    │ SQLite local│            │ localStorage│
    └──────┬──────┘            └─────────────┘
           │
    ┌──────▼──────┐
    │ Supabase    │
    │ (cloud)     │
    └─────────────┘
```

## 📋 Mapping des Données

### Tables PowerSync (21 tables)

| Table | Description |
|-------|-------------|
| `profiles` | Utilisateurs authentifiés |
| `members` | Membres de l'organisation |
| `transactions` | Transactions financières |
| `events` | Événements |
| `notifications` | Notifications |
| `categories` | Catégories de transactions |
| `caisses` | Caisses (legacy) |
| `accounts` | Comptes canoniques |
| `versements` | Versements entre caisses |
| `org_units` | Unités organisationnelles |
| `groups` | Groupes |
| `group_memberships` | Appartenances aux groupes |
| `event_budgets` | Budgets d'événements |
| `budget_lines` | Lignes budgétaires |
| `audit_entries` | Journal d'audit |
| `config` | Configuration application |
| `form_definitions` | Définitions de formulaires |
| `form_submissions` | Soumissions de formulaires |
| `custom_field_definitions` | Champs personnalisés |
| `custom_field_values` | Valeurs de champs personnalisés |
| `report_definitions` | Définitions de rapports |

## 🔧 Utilisation du DataLayer

### Lecture de données

```typescript
import { useTransactions, useEvents, useMembers } from '@/lib/dataLayer';

function MyComponent() {
  const { data: transactions } = useTransactions();
  const { data: events } = useEvents();
  const { data: members } = useMembers();

  // Les données viennent de PowerSync si disponible,
  // sinon fallback sur IndexedDB
  return <div>{transactions?.map(tx => <Transaction key={tx.id} {...tx} />)}</div>;
}
```

### Écriture de données

```typescript
import { addTransactionPS, updateTransactionPS } from '@/lib/dataLayer';

async function handleAdd() {
  const id = await addTransactionPS({
    org_id: 'org-1',
    type: 'INCOME',
    amount: 50000,
    description: 'Dîme',
    date: '2026-09-07',
    status: 'PENDING',
    category_id: 'cat-dime',
    created_by_id: 'user-1',
    // ... autres champs
  });
}
```

## 🚀 Prochaines Étapes

### Phase 3: Pages restantes (à migrer)

| Page | Priorité | Complexité |
|------|----------|------------|
| Events.tsx | Haute | Moyenne |
| EventNew.tsx | Haute | Moyenne |
| EventEdit.tsx | Moyenne | Moyenne |
| TransactionNew.tsx | Haute | Moyenne |
| TransactionEdit.tsx | Moyenne | Moyenne |
| Groups.tsx | Moyenne | Moyenne |
| GroupDetail.tsx | Moyenne | Moyenne |
| TransactionDetail.tsx | Basse | Basse |
| Balance.tsx | Basse | Basse |
| Archives.tsx | Basse | Basse |
| Reports.tsx | Basse | Moyenne |
| Versement.tsx | Moyenne | Moyenne |
| Login.tsx | Moyenne | Moyenne |
| RoleSelection.tsx | Basse | Basse |
| Splash.tsx | Basse | Basse |

### Phase 4: Nettoyage

- [ ] Supprimer les imports `useLocalStore` des pages migrées
- [ ] Déplacer les écritures critiques dans `dataLayer.ts`
- [ ] Tester offline/online sur chaque page
- [ ] Ajouter des tests E2E pour la sync
- [ ] Supprimer le code IndexedDB non utilisé

### Phase 5: Production

- [ ] Activer Supabase Auth (email/password + Google)
- [ ] Configurer les permissions RLS sur Supabase
- [ ] Tester la sync multi-appareil
- [ ] Définir une stratégie de migration des données existantes
- [ ] Déployer en production

## 📝 Notes Techniques

### Points d'attention

1. **Format des données**: PowerSync utilise `snake_case` (ex: `first_name`) tandis que le code existe utilise `camelCase` (ex: `firstName`). Le dataLayer gère les deux formats.

2. **Types**: Les types PowerSync (`PSTransaction`, `PSEvent`, etc.) sont définis dans `dataLayer.ts`. Ils doivent être compatibles avec les types TypeScript existants.

3. **Fallback**: Tous les hooks de lecture essaient PowerSync en premier, puis retournent les données IndexedDB si PowerSync n'a pas encore de données.

4. **Write operations**: Les écritures utilisent actuellement `useLocalStore` (IndexedDB) car elles nécessitent une logique métier complexe (audit, notifications, sync queue). Cette logique sera migrée progressivement.

### Commands utiles

```bash
# Vérifier le statut PowerSync
powersync status

# Valider le schéma
powersync validate

# Démarrer le dev server
pnpm dev

# Vérifier la compilation TypeScript
pnpm tsc --noEmit
```

---

*Migration hybride démarrée le 2026-09-07*
*Phase 1 & 2 complétées*
