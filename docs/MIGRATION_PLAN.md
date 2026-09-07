# Plan de Migration Hybride : IndexedDB → PowerSync

## 📊 Analyse Actuelle

### État des lieux
| Métrique | Valeur |
|----------|--------|
| Fichiers source totaux | 125 |
| Fichiers utilisant IndexedDB | 29 |
| Tables PowerSync répliquées | 21 |
| Schéma généré | ✅ |
| Connector implémenté | ✅ |

### Fichiers à migrer
```
src/pages/:
├── Archives.tsx
├── Balance.tsx
├── Dashboard.tsx
├── EventDetail.tsx
├── EventEdit.tsx
├── EventNew.tsx
├── Events.tsx
├── Finance.tsx
├── GroupDetail.tsx
├── Groups.tsx
├── Help.tsx
├── History.tsx
├── Login.tsx
├── Members.tsx
├── Notifications.tsx
├── Reports.tsx
├── RoleSelection.tsx
├── Settings.tsx
├── Splash.tsx
├── Trace.tsx
├── TransactionDetail.tsx
├── TransactionEdit.tsx
├── TransactionNew.tsx
├── TransactionNewGroup.tsx
├── Versement.tsx

src/components/:
├── SyncIndicator.tsx
├── TopHeader.tsx
```

---

## 🎯 Stratégie de Migration (Option B - Hybride)

### Phase 1: Préparation (FAIT ✅)
- [x] PowerSync instance créée
- [x] 21 tables répliquées
- [x] Schema SQLite généré
- [x] Connector Supabase implémenté
- [x] Provider React créé
- [x] GitHub secrets configurés

### Phase 2: Intégration Progressive (À faire)

#### 2.1 Créer un layer d'abstraction
Créer un fichier `src/lib/dataLayer.ts` qui:
- Expose les mêmes interfaces que `useLocalStore`
- Utilise PowerSync par défaut
- Garde IndexedDB comme fallback

#### 2.2 Migrer page par page
Pour chaque page:
1. Remplacer `useLocalStore` par des queries PowerSync
2. Tester la page
3. Valider que tout fonctionne
4. Commit séparé

#### 2.3 Ordre de migration recommandé
1. **Pages simples** (Settings, Help, Tutorial)
2. **Pages de lecture seule** (Dashboard, History, Trace)
3. **Pages avec écritures** (Finance, Transactions)
4. **Pages complexes** (Events, Groups, Members)

---

## 📋 Mapping des Fonctions

### useLocalStore → PowerSync

| useLocalStore | PowerSync équivalent |
|---------------|---------------------|
| `transactions` | `useQuery('SELECT * FROM transactions')` |
| `addTransaction(tx)` | `db.execute('INSERT INTO transactions ...')` |
| `updateTransaction(id, data)` | `db.execute('UPDATE transactions SET ... WHERE id = ?')` |
| `deleteTransaction(id)` | `db.execute('DELETE FROM transactions WHERE id = ?')` |
| `approveTransaction(id)` | `db.execute('UPDATE transactions SET status = ? WHERE id = ?')` |
| `events` | `useQuery('SELECT * FROM events')` |
| `caisses` | `useQuery('SELECT * FROM caisses')` |
| `members` | `useQuery('SELECT * FROM members')` |
| `groups` | `useQuery('SELECT * FROM groups')` |

---

## 🔧 Pattern de Migration

### Avant (IndexedDB)
```typescript
import { useLocalStore } from '@/store/useLocalStore';

function MyComponent() {
  const { transactions, addTransaction } = useLocalStore();
  
  const handleAdd = async () => {
    await addTransaction(newTx);
  };
  
  return <div>{transactions.map(tx => <Transaction key={tx.id} {...tx} />)}</div>;
}
```

### Après (PowerSync)
```typescript
import { useQuery, usePowerSync } from '@powersync/react';

function MyComponent() {
  const sync = usePowerSync();
  const { data: transactions } = useQuery('SELECT * FROM transactions ORDER BY createdAt DESC');
  
  const handleAdd = async () => {
    await sync.execute('INSERT INTO transactions (id, org_id, ...) VALUES (?, ?, ...)', [
      newTx.id, newTx.orgId, ...
    ]);
  };
  
  return <div>{transactions?.map(tx => <Transaction key={tx.id} {...tx} />)}</div>;
}
```

---

## ⚠️ Points de Vigilance

### 1. Gestion des IDs
- **IndexedDB**: Génère les IDs côté client
- **PowerSync**: Utilise `uuid()` de SQLite ou générer côté client

### 2. Timestamps
- **IndexedDB**: `new Date().toISOString()`
- **PowerSync**: `datetime('now')` dans SQLite

### 3. Boolean
- **IndexedDB**: `true`/`false`
- **PowerSync**: `1`/`0` (integer)

### 4. Dates
- **IndexedDB**: `new Date()`
- **PowerSync**: `column.text` avec format ISO

### 5. Requêtes complexes
- **IndexedDB**: Méthodes `getAll`, `where`
- **PowerSync**: Requêtes SQL natives

---

## 📊 Progression Estimée

| Phase | Fichiers | Durée |
|-------|----------|-------|
| 1. Préparation | 0 | ✅ Fait |
| 2. Pages simples | 5 | 2h |
| 3. Pages lecture | 8 | 3h |
| 4. Pages écritures | 10 | 4h |
| 5. Pages complexes | 6 | 3h |
| **Total** | **29** | **~12h** |

---

## 🚀 Démarrage

### Commande pour commencer
```bash
# Vérifier que tout est prêt
powersync status
powersync validate

# Démarrer le dev server
pnpm dev
```

### Première page à migrer
**Dashboard.tsx** - C'est la page critique, elle doit fonctionner parfaitement.

---

## 📝 Checklist par Page

Pour chaque page migrée:
- [ ] Remplacer import `useLocalStore` par `useQuery`, `usePowerSync`
- [ ] Migrer toutes les lectures (`const { data } = useLocalStore()`)
- [ ] Migrer toutes les écritures (`await store.action()`)
- [ ] Tester en local
- [ ] Valider offline/online
- [ ] Commit séparé

---

*Plan généré le 2026-09-07*
*Version: 1.0*
*Approche: Migration hybride progressive*
