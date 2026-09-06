# Plan de Migration : IndexedDB → PowerSync (Self-Hosted) + Supabase

## ⚡ Réponses aux Questions

| Question | Ta Réponse | Impact |
|----------|-----------|--------|
| Authentification | ❌ Aucune pour l'instant | PowerSync exige une auth (JWT ou shared secret) |
| Rôles | JWT Claims (option B) | Utile quand auth activée |
| Migration données | ❌ Départ propre (option B) | Pas de script de migration |
| Hosting PowerSync | **Self-hosted Open Source** | ✅ GRATUIT, pas de Cloud |

---

## 1. Architecture Cible (Self-Hosted)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/Mobile)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PowerSync SDK (SQLite Local)                        │    │
│  │  - Transactions                                      │    │
│  │  - Events, Caisses, Groups                           │    │
│  │  - Members, Accounts, Versements                     │    │
│  │  - (Offline: reads/writes locaux)                    │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                            │ uploadData()                    │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Supabase Client (supabase-js)                       │    │
│  │  - Upload des writes vers Postgres                   │    │
│  │  - Read direct si besoin                             │    │
│  └─────────────────────────┬───────────────────────────┘    │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    POWERSYNC SERVICE (Self-Hosted)           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  - Sync Engine (replication Postgres → SQLite)       │    │
│  │  - Bucket Storage (Postgres ou MongoDB)              │    │
│  │  - API REST + WebSocket                              │    │
│  │  - Client Auth (JWT ou shared secret)                │    │
│  └─────────────────────────┬───────────────────────────┘    │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Supabase Postgres (tables Lumina)                   │    │
│  │  - transactions, events, caisses, groups, members    │    │
│  │  - categories, accounts, versements, etc.            │    │
│  │  - RLS Policies (facultatif pour l'instant)          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Déploiement Self-Hosted (3 Options)

### Option A: Docker Local (Recommandé pour Développement)
```bash
# Créer un fichier docker-compose.yml
# PowerSync + Postgres (storage) + Supabase connection

# Démarrer
docker-compose up -d

# URL du service: http://localhost:8080
```

**Avantages**: Gratuit, contrôle total, parfait pour test
**Inconvénients**: À maintenir soi-même

### Option B: Coolify (Recommandé pour Production)
```
- Hébergeur auto-hébergé (ton serveur VPS)
- Interface web pour gérer les apps
- Gratuit (open source)
- Supporte Docker

Déploiement:
1. Installer Coolify sur un VPS (ex: Oracle Cloud free tier)
2. Importer le repo PowerSync
3. Configurer les variables d'environnement
4. Déployer
```

**Avantages**: Interface web, gestion facile, gratuit
**Inconvénients**: Nécessite un VPS

### Option C: Railway / Render (Cloud Gratuit)
```
- Railway: 500h/mois gratuit
- Render: 750h/mois gratuit
- Déploiement GitHub Actions

Déploiement:
1. Push le code sur GitHub
2. Connecter Railway/Render au repo
3. Configurer les variables d'environnement
4. Déployer automatiquement
```

**Avantages**: Pas de serveur à gérer
**Inconvénients**: Limites gratuites, dépendance externe

---

## 3. Plan de Migration Détaillé

### PHASE 1: Infrastructure PowerSync (1-2h)

#### 1.1 Choisir l'option de déploiement
- **Développement**: Docker Local
- **Production**: Coolify sur VPS Oracle Cloud (gratuit)

#### 1.2 Créer le fichier docker-compose.yml
```yaml
# docker-compose.yml
version: '3.8'

services:
  powersync:
    image: journeyapps/powersync-service:latest
    ports:
      - "8080:8080"
    environment:
      PS_DATA_SOURCE_URI: postgresql://postgres:password@supabase:5432/postgres
      PS_STORAGE_URI: postgresql://postgres:password@powersync-db:5432/powersync
      PS_JWT_SECRET: your-secret-key-here
      PS_ADMIN_TOKEN: your-admin-token
    depends_on:
      - powersync-db

  powersync-db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: powersync
    volumes:
      - powersync-data:/var/lib/postgresql/data

volumes:
  powersync-data:
```

#### 1.3 Configurer la connexion Supabase
- Récupérer la connection string Supabase
- Modifier `PS_DATA_SOURCE_URI` avec les credentials

#### 1.4 Démarrer le service
```bash
docker-compose up -d
```

#### 1.5 Vérifier le statut
```bash
docker-compose ps
curl http://localhost:8080/status
```

---

### PHASE 2: Configuration Sync Streams (1h)

#### 2.1 Créer le fichier sync-config.yaml
```yaml
# powersync/sync-config.yaml
config:
  edition: 3

streams:
  # Données globales (tous les utilisateurs)
  categories:
    auto_subscribe: true
    query: SELECT * FROM categories

  org_config:
    auto_subscribe: true
    query: SELECT * FROM org_config WHERE org_id = 'org-1'

  # Données par organisation (pas par utilisateur)
  transactions:
    auto_subscribe: true
    query: SELECT * FROM transactions WHERE orgId = 'org-1'

  events:
    auto_subscribe: true
    query: SELECT * FROM events WHERE orgId = 'org-1'

  accounts:
    auto_subscribe: true
    query: SELECT * FROM accounts WHERE orgId = 'org-1'

  groups:
    auto_subscribe: true
    query: SELECT * FROM groups WHERE orgId = 'org-1'

  members:
    auto_subscribe: true
    query: SELECT * FROM members WHERE orgId = 'org-1'

  versements:
    auto_subscribe: true
    query: SELECT * FROM versements WHERE orgId = 'org-1'

  notifications:
    auto_subscribe: true
    query: SELECT * FROM notifications WHERE orgId = 'org-1'
```

#### 2.2 Déployer la config
```bash
# Via CLI PowerSync
powersync deploy sync-config

# Ou via l'API REST
curl -X POST http://localhost:8080/api/v1/config \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/yaml" \
  -d @sync-config.yaml
```

---

### PHASE 3: Création des Tables Supabase (1h)

#### 3.1 Lancer le SQL dans Supabase SQL Editor
```sql
-- Table: categories
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  labelFr TEXT NOT NULL,
  type TEXT NOT NULL, -- 'INCOME' | 'EXPENSE'
  orgId TEXT NOT NULL,
  isCustom BOOLEAN DEFAULT false
);

-- Table: transactions
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL, -- 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  createdById TEXT NOT NULL,
  approvedById TEXT,
  approvedAt TEXT,
  categoryId TEXT NOT NULL,
  orgUnitId TEXT,
  eventId TEXT,
  source TEXT,
  personName TEXT,
  compensatesFor TEXT,
  comment TEXT,
  version INTEGER NOT NULL,
  sourceCaisseId TEXT,
  versementId TEXT,
  reversalOfId TEXT
);

-- Table: events
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL, -- 'PLANIFIED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  startDate TEXT NOT NULL,
  endDate TEXT,
  budget INTEGER DEFAULT 0,
  budgetItems JSONB,
  shoppingItems JSONB,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Table: caisses (accounts)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  ownerType TEXT NOT NULL, -- 'ORGANIZATION' | 'GROUP'
  ownerId TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'XOF',
  status TEXT NOT NULL,
  archivedAt TEXT,
  archivedBy TEXT,
  archiveReason TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Table: groups
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  parentGroupId TEXT,
  responsableMemberId TEXT,
  status TEXT NOT NULL,
  archivedAt TEXT,
  archivedBy TEXT,
  archiveReason TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Table: members
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL,
  archivedAt TEXT,
  archivedBy TEXT,
  archiveReason TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Table: versements
CREATE TABLE versements (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  fromAccountId TEXT NOT NULL,
  toAccountId TEXT NOT NULL,
  amountCents INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  approvedBy TEXT,
  approvedAt TEXT,
  createdAt TEXT NOT NULL
);

-- Table: notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  actionType TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  sourceTransactionId TEXT,
  createdAt TEXT NOT NULL
);

-- Table: org_config
CREATE TABLE org_config (
  id TEXT PRIMARY KEY,
  orgId TEXT NOT NULL,
  churchName TEXT,
  churchLogoUrl TEXT,
  userPhoto TEXT,
  updatedBy TEXT,
  updatedAt TEXT
);

-- Index pour performance
CREATE INDEX idx_transactions_org ON transactions(orgId);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_events_org ON events(orgId);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_accounts_org ON accounts(orgId);
CREATE INDEX idx_members_org ON members(orgId);
CREATE INDEX idx_versements_org ON versements(orgId);
CREATE INDEX idx_notifications_org ON notifications(orgId);

-- RLS (Row Level Security) - Facultatif pour l'instant
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read" ON transactions FOR SELECT USING (true);
-- CREATE POLICY "Public write" ON transactions FOR ALL USING (true);
```

---

### PHASE 4: Création de la Publication Postgres (10min)

```sql
-- Créer le rôle de réplication
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'your-secure-password';

-- Accorder les permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Créer la publication
CREATE PUBLICATION powersync FOR ALL TABLES;
```

---

### PHASE 5: Configuration du Service (30min)

#### 5.1 Créer le fichier service.yaml
```yaml
# service.yaml
replication:
  connections:
    - type: postgresql
      uri: postgresql://powersync_role:your-password@your-supabase-host:5432/postgres
      sslmode: disable

storage:
  type: postgres
  uri: postgresql://postgres:password@powersync-db:5432/powersync

client_auth:
  # Pour développement sans auth réelle
  shared_secret: your-secret-key-here

api:
  tokens:
    - your-admin-token
```

#### 5.2 Redémarrer le service
```bash
docker-compose restart powersync
```

---

### PHASE 6: Intégration Frontend (4-6h)

#### 6.1 Installer les packages
```bash
pnpm add @powersync/web@latest @powersync/react@latest
pnpm add -D vite-plugin-wasm vite-plugin-top-level-await
```

#### 6.2 Configurer vite.config.ts
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
  },
});
```

#### 6.3 Créer le schema PowerSync
```typescript
// src/lib/powersync/schema.ts
import { column, Schema, Table } from '@powersync/web';

export const categories = new Table({
  key: column.text,
  labelFr: column.text,
  type: column.text,
  orgId: column.text,
  isCustom: column.integer, // 0 or 1
});

export const transactions = new Table({
  orgId: column.text,
  type: column.text,
  amount: column.integer,
  description: column.text,
  date: column.text,
  status: column.text,
  createdAt: column.text,
  updatedAt: column.text,
  createdById: column.text,
  approvedById: column.text,
  approvedAt: column.text,
  categoryId: column.text,
  orgUnitId: column.text,
  eventId: column.text,
  source: column.text,
  personName: column.text,
  compensatesFor: column.text,
  comment: column.text,
  version: column.integer,
  sourceCaisseId: column.text,
  versementId: column.text,
  reversalOfId: column.text,
});

export const events = new Table({
  orgId: column.text,
  name: column.text,
  description: column.text,
  status: column.text,
  startDate: column.text,
  endDate: column.text,
  budget: column.integer,
  budgetItems: column.text, // JSON string
  shoppingItems: column.text, // JSON string
  createdAt: column.text,
  updatedAt: column.text,
});

export const accounts = new Table({
  orgId: column.text,
  ownerType: column.text,
  ownerId: column.text,
  name: column.text,
  currency: column.text,
  status: column.text,
  archivedAt: column.text,
  archivedBy: column.text,
  archiveReason: column.text,
  createdAt: column.text,
  updatedAt: column.text,
});

export const groups = new Table({
  orgId: column.text,
  name: column.text,
  type: column.text,
  description: column.text,
  parentGroupId: column.text,
  responsableMemberId: column.text,
  status: column.text,
  archivedAt: column.text,
  archivedBy: column.text,
  archiveReason: column.text,
  createdAt: column.text,
  updatedAt: column.text,
});

export const members = new Table({
  orgId: column.text,
  firstName: column.text,
  lastName: column.text,
  email: column.text,
  phone: column.text,
  status: column.text,
  archivedAt: column.text,
  archivedBy: column.text,
  archiveReason: column.text,
  createdAt: column.text,
  updatedAt: column.text,
});

export const versements = new Table({
  orgId: column.text,
  fromAccountId: column.text,
  toAccountId: column.text,
  amountCents: column.integer,
  date: column.text,
  status: column.text,
  createdBy: column.text,
  approvedBy: column.text,
  approvedAt: column.text,
  createdAt: column.text,
});

export const notifications = new Table({
  orgId: column.text,
  actionType: column.text,
  title: column.text,
  message: column.text,
  isRead: column.integer, // 0 or 1
  sourceTransactionId: column.text,
  createdAt: column.text,
});

export const orgConfig = new Table({
  id: column.text,
  orgId: column.text,
  churchName: column.text,
  churchLogoUrl: column.text,
  userPhoto: column.text,
  updatedBy: column.text,
  updatedAt: column.text,
});

export const AppSchema = new Schema({
  categories,
  transactions,
  events,
  accounts,
  groups,
  members,
  versements,
  notifications,
  orgConfig,
});

export type Database = (typeof AppSchema)['types'];
```

#### 6.4 Créer le Backend Connector
```typescript
// src/lib/powersync/connector.ts
import type { PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';
import { UpdateType } from '@powersync/web';

const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL || 'http://localhost:8080';

// Dev token (à générer avec powersync generate token)
const DEV_TOKEN = 'your-dev-token-here';

export const connector: PowerSyncBackendConnector = {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    return {
      endpoint: POWERSYNC_URL,
      token: DEV_TOKEN,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    };
  },

  async uploadData(database): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const { op: opType, table, opData, id } = op;

        // Log pour debug
        console.log(`[PowerSync] Upload: ${opType} ${table} ${id}`);

        // Note: En production, implémenter l'upload vers Supabase
        // Pour l'instant, on ignore (les données sont en local uniquement)
      }

      await transaction.complete(); // IMPORTANT!
    } catch (error) {
      console.error('[PowerSync] Upload error:', error);
      throw error;
    }
  }
};
```

#### 6.5 Initialiser PowerSync
```typescript
// src/lib/powersync/index.ts
import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './schema';
import { connector } from './connector';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'lumina.db',
    debugMode: true, // Pour le développement
  },
});

db.connect(connector);

// Log le statut
db.registerListener({
  statusChanged: (status) => {
    console.log('[PowerSync] Status:', {
      connected: status.connected,
      uploading: status.uploading,
      downloading: status.downloading,
      lastSyncedAt: status.lastSyncedAt,
    });
  },
});
```

#### 6.6 Créer le Provider React
```typescript
// src/components/PowerSyncProvider.tsx
import { PowerSyncContext } from '@powersync/react';
import { db } from '@/lib/powersync';

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
```

---

### PHASE 7: Migration des Composants (6-8h)

#### 7.1 Remplacer useLocalStore par useQuery

**Avant:**
```typescript
import { useLocalStore } from '@/store/useLocalStore';

function Dashboard() {
  const { transactions, categories } = useLocalStore();
  // ...
}
```

**Après:**
```typescript
import { useQuery } from '@powersync/react';

function Dashboard() {
  const { data: transactions } = useQuery('SELECT * FROM transactions');
  const { data: categories } = useQuery('SELECT * FROM categories');
  // ...
}
```

#### 7.2 Migrer les écritures

**Avant:**
```typescript
await db.put('transactions', newTx);
```

**Après:**
```typescript
await db.execute(
  'INSERT INTO transactions (id, orgId, type, amount, ...) VALUES (?, ?, ?, ?, ...)',
  [newTx.id, newTx.orgId, newTx.type, newTx.amount, ...]
);
```

---

## 4. Timeline Estimée

| Phase | Durée | Statut |
|-------|-------|--------|
| 1. Infrastructure PowerSync | 1-2h | ⏳ À faire |
| 2. Config Sync Streams | 1h | ⏳ À faire |
| 3. Création Tables Supabase | 1h | ⏳ À faire |
| 4. Création Publication | 10min | ⏳ À faire |
| 5. Config Service | 30min | ⏳ À faire |
| 6. Intégration Frontend | 4-6h | ⏳ À faire |
| 7. Migration Composants | 6-8h | ⏳ À faire |
| **Total** | **14-18h** | |

---

## 5. Prochaines Actions Immédiates

### 5.1 Choisir l'hébergement
- [ ] **Local Docker** (développement)
- [ ] **Coolify sur VPS** (production)
- [ ] **Railway/Render** (cloud gratuit)

### 5.2 Créer les credentials
- [ ] Token admin PowerSync
- [ ] Secret JWT (ou shared secret)
- [ ] Connection string Supabase

### 5.3 Initialiser le projet
```bash
# 1. Clone le repo PowerSync service
git clone https://github.com/powersync-ja/powersync-service.git

# 2. ou utiliser Docker directement
docker pull journeyapps/powersync-service:latest
```

---

## 6. Ressources Utiles

- **Docs PowerSync**: https://docs.powersync.com
- **Repo Service**: https://github.com/powersync-ja/powersync-service
- **Demo Supabase**: https://github.com/powersync-ja/powersync-js/tree/main/demos/react-supabase-todolist
- **CLI Docs**: https://docs.powersync.com/tools/cli

---

*Document généré le 2026-09-06*
*Version: 1.1 (Self-Hosted)*
