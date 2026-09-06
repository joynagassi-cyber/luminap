# Plan de Migration : IndexedDB → PowerSync Cloud + Supabase

## ✅ Décisions Confirmées

| Décision | Choix |
|----------|-------|
| **Authentification** | ❌ Aucune (test) → Shared Secret |
| **Rôles** | JWT Claims (option B) |
| **Migration données** | ❌ Départ propre (option B) |
| **Hosting PowerSync** | ✅ **PowerSync Cloud (Free Tier)** |
| **Utilisateurs** | Multi-utilisateurs, multi-appareils |
| **Sync temps réel** | ✅ Oui, nécessaire |

## 🎁 Free Tier PowerSync Cloud

| Resouce | Limite |
|---------|--------|
| Utilisateurs | 50,000 |
| Storage | 500 MB |
| Sync Data | 2 GB |
| **Prix** | **GRATUIT** |

---

## 📋 Checklist Pré-requis

### 1. PowerSync Cloud
- [ ] Créer un compte sur https://dashboard.powersync.com
- [ ] Créer un projet
- [ ] Générer un PAT (Personal Access Token)

### 2. Supabase
- [ ] Récupérer la connection string Supabase
- [ ] Récupérer l'anon key
- [ ] Récupérer le JWT secret (si legacy)

### 3. Outils Locaux
- [ ] Installer PowerSync CLI: `npm install -g powersync`
- [ ] Vérifier Docker (optionnel, pour dev local)

---

## 🚀 Phase 1: Setup PowerSync Cloud (30min)

### 1.1 Installer le CLI
```bash
npm install -g powersync
# ou
npx powersync@latest
```

### 1.2 Se connecter
```bash
powersync login
# → Ouvre le navigateur pour authentifier
# → Copier le PAT (Personal Access Token)
```

### 1.3 Créer un projet (si pas déjà fait)
- Aller sur https://dashboard.powersync.com
- Cliquer "Create Project"
- Nommer le projet: "lumina"
- Copier le **Project ID** (format: `1234567890abcdef`)

### 1.4 Initialiser le projet local
```bash
cd /path/to/lumina
powersync init cloud
```

Cela crée le dossier `powersync/` avec:
- `service.yaml` - Configuration du service
- `sync-config.yaml` - Configuration des sync streams
- `cli.yaml` - Configuration du CLI

### 1.5 Éditer service.yaml
```yaml
# powersync/service.yaml
replication:
  connections:
    - type: postgresql
      uri: postgresql://postgres.[SUPABASE_PROJECT_REF]:5432/postgres
      username: postgres.[SUPABASE_PROJECT_REF]
      password: !env PS_SUPABASE_DB_PASSWORD
      sslmode: require

client_auth:
  # Pour le développement sans auth: shared_secret
  shared_secret: your-dev-secret-key-here
  
  # Pour la production avec Supabase Auth:
  # supabase: true

api:
  tokens:
    - !env PS_ADMIN_TOKEN
```

### 1.6 Configurer les variables d'environnement
```bash
# Créer un fichier .env
echo "PS_SUPABASE_DB_PASSWORD=votre_mot_de_passe_supabase" >> .env
echo "PS_ADMIN_TOKEN=votre-admin-token" >> .env
```

---

## 🗄️ Phase 2: Configuration Supabase (20min)

### 2.1 Créer la publication PostgreSQL
Dans Supabase SQL Editor:
```sql
-- Créer le rôle de réplication
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'votre-mot-de-passe';

-- Accorder les permissions
GRANT CONNECT ON DATABASE postgres TO powersync_role;
GRANT USAGE ON SCHEMA public TO powersync_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Créer la publication
CREATE PUBLICATION powersync FOR ALL TABLES;
```

### 2.2 Créer les tables
Voir `docs/POWERSYNC_TABLES.sql` pour le script complet.

### 2.3 Configurer RLS (Row Level Security)
```sql
-- Pour chaque table, créer une policy
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Public write" ON transactions
  FOR ALL USING (true);
```

---

## 🔄 Phase 3: Configurer Sync Streams (15min)

### 3.1 Éditer sync-config.yaml
```yaml
# powersync/sync-config.yaml
config:
  edition: 3

streams:
  # Données globales (mêmes pour tous les utilisateurs)
  categories:
    auto_subscribe: true
    query: SELECT * FROM categories

  org_config:
    auto_subscribe: true
    query: SELECT * FROM org_config WHERE org_id = 'org-1'

  # Données organisation (partagées entre utilisateurs)
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

### 3.2 Valider la configuration
```bash
powersync validate
```

---

## 🚀 Phase 4: Déploiement (10min)

### 4.1 Créer l'instance PowerSync
```bash
powersync link cloud --create --project-id=<project-id>
```

Output:
```
Created Cloud instance 69c3d0350000000000000001 and updated powersync/cli.yaml.
POWERSYNC_URL=https://69c3d0350000000000000001.powersync.journeyapps.com
```

### 4.2 Déployer la configuration
```bash
# Déployer le service config
powersync deploy service-config

# Déployer le sync config
powersync deploy sync-config
```

### 4.3 Vérifier le statut
```bash
powersync status
```

---

## 💻 Phase 5: Intégration Frontend (4-6h)

### 5.1 Installer les packages
```bash
pnpm add @powersync/web@latest @powersync/react@latest
pnpm add -D vite-plugin-wasm vite-plugin-top-level-await
```

### 5.2 Configurer vite.config.ts
```typescript
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

### 5.3 Créer le schema PowerSync
```typescript
// src/lib/powersync/schema.ts
import { column, Schema, Table } from '@powersync/web';

export const categories = new Table({
  key: column.text,
  labelFr: column.text,
  type: column.text,
  orgId: column.text,
  isCustom: column.integer,
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

// ... autres tables

export const AppSchema = new Schema({
  categories,
  transactions,
  // ...
});
```

### 5.4 Créer le Backend Connector
```typescript
// src/lib/powersync/connector.ts
import type { PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';
import { UpdateType } from '@powersync/web';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL;

export const connector: PowerSyncBackendConnector = {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    return {
      endpoint: POWERSYNC_URL,
      token: '', // Pas d'auth pour l'instant
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  },

  async uploadData(database): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const { op: opType, table, opData, id } = op;

        if (opType === UpdateType.PUT) {
          await supabase.from(table).upsert({ ...opData, id });
        } else if (opType === UpdateType.PATCH) {
          await supabase.from(table).update(opData).eq('id', id);
        } else if (opType === UpdateType.DELETE) {
          await supabase.from(table).delete().eq('id', id);
        }
      }
      await transaction.complete(); // IMPORTANT!
    } catch (error) {
      console.error('[PowerSync] Upload error:', error);
      throw error;
    }
  }
};
```

### 5.5 Initialiser PowerSync
```typescript
// src/lib/powersync/index.ts
import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './schema';
import { connector } from './connector';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'lumina.db',
    debugMode: true,
  },
});

db.connect(connector);
```

### 5.6 Créer le Provider React
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

## 🔄 Phase 6: Migration des Composants (6-8h)

### 6.1 Remplacer useLocalStore

**Avant:**
```typescript
import { useLocalStore } from '@/store/useLocalStore';

function Dashboard() {
  const { transactions } = useLocalStore();
}
```

**Après:**
```typescript
import { useQuery } from '@powersync/react';

function Dashboard() {
  const { data: transactions, isLoading } = useQuery(
    'SELECT * FROM transactions ORDER BY createdAt DESC'
  );
}
```

### 6.2 Migrer les écritures

**Avant:**
```typescript
await db.put('transactions', newTx);
```

**Après:**
```typescript
await db.execute(
  `INSERT INTO transactions 
   (id, orgId, type, amount, description, date, status, ...) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ...)`,
  [newTx.id, newTx.orgId, newTx.type, newTx.amount, ...]
);
```

---

## 📊 Timeline Estimée

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| 1. Setup PowerSync Cloud | 30min | Compte PowerSync |
| 2. Config Supabase | 20min | Phase 1 |
| 3. Config Sync Streams | 15min | Phase 2 |
| 4. Déploiement | 10min | Phase 3 |
| 5. Intégration Frontend | 4-6h | Phase 4 |
| 6. Migration Composants | 6-8h | Phase 5 |
| **Total** | **12-16h** | |

---

## ⚠️ Points de Vigilance

### 1. Shared Secret vs JWT
- **Développement**: `shared_secret` (pas d'auth)
- **Production**: `supabase: true` (JWT via Supabase Auth)

### 2. transaction.complete()
- **OBLIGATOIRE** après chaque upload
- Sinon la queue de sync bloque définitivement

### 3. pas d'id dans le schema
- PowerSync crée automatiquement la colonne `id`
- Ne pas la déclarer dans le schema

### 4. Dates et Boolean
- Stocker les dates en texte (ISO string)
- Stocker les boolean en integer (0/1)

---

## 🎯 Prochaines Actions Immédiates

1. **Créer un compte PowerSync Cloud**
   - Aller sur https://dashboard.powersync.com
   - S'inscrire (gratuit)
   - Créer un projet "lumina"

2. **Récupérer les credentials**
   - Project ID
   - PAT (Personal Access Token)
   - Connection string Supabase

3. **Me fournir ces infos** pour lancer la Phase 1

---

*Document généré le 2026-09-06*
*Version: 2.0 (PowerSync Cloud)*
