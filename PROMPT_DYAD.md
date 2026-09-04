# 🚀 Prompt — Finalisation et Build de Lumina (3 jours)

## Contexte projet
Lumina est une app mobile Capacitor (React + Vite + TypeScript + Supabase) de gestion financière pour l'église MFE-JC Centrale. L'app est **70% fonctionnelle** mais il reste des fonctionnalités critiques à implémenter avant la mise en production.

**Stack :** React 19 + Vite 8 + TypeScript + Tailwind + shadcn/ui + Zustand + Capacitor 6 + Supabase + Nitro + IndexedDB (local-first)
**Projet :** `C:/Users/joyda/dyad-apps/lumina`
**Repo Git :** `github.com/joynagassi-cyber/luminap` (branche `main`)

---

## 🔴 Priorité 1 — Implémenter le système de sync (CRITIQUE)

### 1a. Compléter `src/lib/db.ts` — Ajouter les méthodes syncQueue

Le store `syncQueue` existe dans IndexedDB mais il n'y a **aucune méthode** pour l'utiliser. Ajoute ces méthodes à l'objet `db` exporté :

```typescript
async enqueueSync(item: {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: any;
  attempts: number;
  lastAttempt: string | null;
  createdAt: string;
}): Promise<void>
```

```typescript
async getSyncQueue(): Promise<any[]>
```

```typescript
async removeSyncItem(id: string): Promise<void>
```

```typescript
async updateSyncAttempt(id: string, attempt: number): Promise<void>
```

### 1b. Implémenter la logique d'enqueue dans `src/store/useLocalStore.ts`

Après CHAQUE mutation (addTransaction, updateTransaction, deleteTransaction, etc.), appeler automatiquement :

```typescript
await db.enqueueSync({
  id: `sync-${Date.now()}-${Math.random()}`,
  operation: 'create' | 'update' | 'delete',
  entityType: 'transactions' | 'caisses' | 'notifications',
  entityId: id,
  payload: data,
  attempts: 0,
  lastAttempt: null,
  createdAt: new Date().toISOString(),
});
```

### 1c. Implémenter `src/lib/sync.ts` — startRealtimeSubscriptions()

Utilise Supabase Realtime pour écouter les changements en temps réel :
- Subscribe sur la table `transactions` (INSERT, UPDATE)
- Subscribe sur la table `notifications` (INSERT)
- Quando un événement realtime arrive, mettre à jour le Zustand store local
- Gérer les erreurs de connexion et reconnecter automatiquement

### 1d. Implémenter `syncRoleAssignments()` dans sync.ts

Sync des rôles assignés vers Supabase.

### 1e. Activer le background sync

Dans `src/context/AppContext.tsx`, après le chargement initial :
- Lancer `startBackgroundSync()` en boucle (toutes les 30s ou sur événement `online`)
- Lancer `startRealtimeSubscriptions()` au démarrage
- Arrêter proprement quand l'utilisateur quitte l'app

---

## 🔴 Priorité 2 — Générer les projets natifs Capacitor

```bash
cd C:/Users/joyda/dyad-apps/lumina
npm run build
npx cap add android
npx cap sync
```

Ensuite tester sur l'émulateur Android Studio :
```bash
npx cap open android
```

---

## 🟡 Priorité 3 — Sécuriser les clés Supabase

Le fichier `src/integrations/supabase/client.ts` contient des clés exposées. Créer un fichier `.env` à la racine du projet :

```
VITE_SUPABASE_URL=https://hhgovvrnalibhgpakswi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh
```

Modifier `client.ts` pour utiliser `import.meta.env.VITE_SUPABASE_URL` etc.
Ajouter `.env` dans `.gitignore`.

---

## 🟡 Priorité 4 — Tests manuels (à faire sur le téléphone/émulateur)

Vérifier que chaque fonctionnalité fonctionne :
- [ ] Connexion → sélection du rôle → dashboard
- [ ] Ajouter une transaction (revenu + dépense)
- [ ] Voir la transaction en attente
- [ ] Approuver une transaction (depuis Finance)
- [ ] Créer un versement (groupe → caisse principale)
- [ ] Voir les soldes mis à jour
- [ ] Créer un événement avec budget
- [ ] Export PDF / Excel
- [ ] Mode offline : ajouter transaction sans WiFi → reconnecter → vérifier sync
- [ ] Notifications : nouvelle notification apparaît
- [ ] Navigation entre toutes les pages

---

## 📋 Règles importantes

1. **Ne jamais supprimer** de code existant — toujours ajouter/modifier
2. **Respecter le design system** : couleurs, espacements, typographie existants
3. **Les montants sont en centimes** (ex: 5000 FCFA = 500000 dans le code)
4. **State machine transactions** : DRAFT → PENDING → APPROVED | REJECTED
5. **Ne pas modifier** les fichiers dans `.dyad/` (c'est le dossier de travail de dyad)
6. **Chaque modification** doit être commitée proprement avec message conventionnel
7. **Tester après chaque modification** dans le preview dyad

---

## Ordre d'exécution recommandé

1. 🔴 Implémenter `db.ts` — méthodes syncQueue (5 min)
2. 🔴 Implémenter enqueue dans `useLocalStore.ts` (10 min)
3. 🔴 Implémenter `startRealtimeSubscriptions()` dans `sync.ts` (15 min)
4. 🔴 Implémenter background sync dans `AppContext.tsx` (5 min)
5. 🔴 Générer projets natifs Capacitor (10 min)
6. 🟡 Sécuriser clés Supabase avec `.env` (5 min)
7. 🟡 Tester toutes les fonctionnalités (30 min)

---

## Points d'attention techniques

- `sync.ts` : les fonctions `startBackgroundSync` et `syncNotifications` appellent `store.getSyncQueue()` et `store.removeSyncItem()` — ces méthodes doivent exister sur l'objet `db`
- `AppContext.tsx` : c'est le point d'entrée où il faut lancer le sync en background
- Capacitor : `webDir: 'dist'` signifie qu'il faut faire `npm run build` AVANT `npx cap sync`
- Supabase : RLS est ouvert (`anon` role autorisé) — pas d'auth nécessaire pour l'instant
- IndexedDB version : `DB_VERSION = 8` — ne pas modifier sans migration explicite
