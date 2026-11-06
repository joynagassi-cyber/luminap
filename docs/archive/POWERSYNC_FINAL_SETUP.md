# PowerSync Final Setup - Instructions

## ✅ Ce qui est déjà fait

- [x] Schema PowerSync créé (`src/lib/powersync/schema.ts`)
- [x] Connector Supabase implémenté (`src/lib/powersync/SupabaseConnector.ts`)
- [x] Initialisation de la base de données (`src/lib/powersync/index.ts`)
- [x] Provider React créé (`src/components/PowerSyncProvider.tsx`)
- [x] Configuration Vite pour WASM (`vite.config.ts`)
- [x] Secrets GitHub configurés
- [x] Fichiers de config PowerSync générés (`powersync/`)
- [x] service.yaml configuré avec ta connexion Supabase

## 🔧 Ce qu'il reste à faire

### Étape 1: S'authentifier à PowerSync

Ouvre un terminal et exécute :

```bash
powersync login
```

Suivez les instructions :
1. Le navigateur va s'ouvrir
2. Connecte-toi à ton compte PowerSync
3. Copie le Personal Access Token (PAT)
4. Colle-le quand on te le demande

### Étape 2: Lier l'instance

```bash
powersync link cloud --instance-id=6a9dd96302481fb31b945823
```

### Étape 3: Déployer la configuration

```bash
# Déployer le service config
powersync deploy service-config

# Déployer le sync config
powersync deploy sync-config
```

### Étape 4: Récupérer l'URL PowerSync

Après le déploiement, tu verras un message comme :
```
Created Cloud instance 6a9dd96302481fb31b945823
POWERSYNC_URL=https://6a9dd96302481fb31b945823.powersync.journeyapps.com
```

### Étape 5: Mettre à jour le secret GitHub

```bash
gh secret set POWERSYNC_URL --body "https://6a9dd96302481fb31b945823.powersync.journeyapps.com"
```

### Étape 6: Vérifier le statut

```bash
powersync status
```

Tu devrais voir :
- Connection to Supabase: ✅
- Sync config deployed: ✅
- Client auth: ✅

## 🚀 Test de l'intégration

### 1. Démarrer le serveur de dev
```bash
pnpm dev
```

### 2. Ouvrir l'application
```
http://localhost:8080
```

### 3. Vérifier la console
Ouvre les DevTools (F12) et regarde les logs :
```
[PowerSync] Initialized successfully
[PowerSync] Status changed: { connected: true, hasSynced: true }
```

## 📊 Monitoring

### Dashboard PowerSync
- URL: https://dashboard.powersync.com
- Project: lumina
- Instance: 6a9dd96302481fb31b945823

### Vérifier la sync
```bash
powersync status
powersync fetch config
```

## 🔐 Sécurité

- ✅ Pas de secrets dans le code
- ✅ Secrets dans GitHub Secrets
- ✅ `.env` ignoré par git
- ✅ RLS policies à configurer sur Supabase

## 📝 Prochaines étapes après setup

1. **Configurer les RLS policies** sur Supabase
2. **Tester l'authentification** (email/password, Google)
3. **Vérifier la sync** entre plusieurs appareils
4. **Migrer les composants** pour utiliser PowerSync

## 🆘 Dépannage

### Erreur: "Not logged in"
```bash
powersync login
```

### Erreur: "Instance not found"
Vérifie que tu utilises le bon instance ID:
```bash
powersync fetch instances
```

### Erreur: "Connection failed"
Vérifie que la publication PostgreSQL existe:
```sql
SELECT * FROM pg_publication;
-- Doit montrer: powersync
```

### Erreur: "RLS violation"
Vérifie les policies RLS sur Supabase.

## 📚 Ressources

- [PowerSync Docs](https://docs.powersync.com)
- [CLI Reference](https://docs.powersync.com/tools/cli)
- [Supabase Integration](https://docs.powersync.com/usage/integrations/supabase)

---

**Besoin d'aide ?** Consulte la console pour les logs détaillés ou crée un issue sur GitHub.
