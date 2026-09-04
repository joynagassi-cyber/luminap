# 🚀 Prompt — Lumina en React Native (Projet Neuf)

## Contexte
Créer **Lumina** — application mobile de gestion financière pour l'église MFE-JC Centrale — en **React Native** (Expo). Cette version remplace la version Capacitor actuelle.

**Stack cible :**
- React Native + Expo (Expo Router pour le routing)
- TypeScript
- Tailwind CSS (via NativeWind v4)
- Zustand (state management)
- Supabase (cloud sync)
- AsyncStorage / SQLite (stockage local offline-first)
- react-native-paper ou nativewind pour le design system

---

## 📱 Architecture de l'application

### Pages & Écrans (à créer)
```
/auth
  ├── Login               → simple clic, pas d'auth
  ├── RoleSelection       → choisir rôle (Pasteur, Trésorier, Secrétaire...)
  └── Onboarding          → première utilisation

/main (protégé après login)
  ├── Dashboard           → caisses, solde, transactions récentes, événements
  ├── Finance             → grand livre avec filtres (caisse, catégorie, statut, recherche)
  ├── TransactionNew      → formulaire création transaction
  ├── TransactionDetail   → détail transaction
  ├── TransactionEdit     → modifier (draft/rejeté seulement)
  ├── Balance             → bilan financier par période
  ├── Groups              → liste des groupes organisationnels
  ├── GroupDetail         → détail groupe + bouton verser
  ├── Events              → liste événements
  ├── EventNew            → créer événement
  ├── EventDetail         → détail événement (budget, liste shopping)
  ├── Versement           → transfert caisse groupe → caisse principale
  ├── Notifications       → centre notifications
  ├── Tutorial            → tutoriel utilisation
  ├── History             → historique actions
  ├── Help                → aide
  └── Settings            → paramètres (sync, stockage, config église)
```

---

## 🔴 Priorité 1 — Configuration Expo + Navigation

### 1a. Initialiser le projet Expo
```bash
npx create-expo-app@latest lumina --template blank-typescript
cd lumina
npx expo install expo-router
npm install @supabase/supabase-js zustand @react-native-async-storage/async-storage
npm install nativewind tailwindcss --save-dev
npm install -D tailwindcss
```

### 1b. Configurer NativeWind v4
Modifier `metro.config.js` et `tailwind.config.js` pour supporter Tailwind dans React Native.

### 1c. Créer la structure de navigation Expo Router
```
app/
  (auth)/
    login.tsx
    role-selection.tsx
    onboarding.tsx
  (main)/
    index.tsx              ← Dashboard
    finance.tsx
    transaction/
      new.tsx
      [id].tsx
      [id]/edit.tsx
    balance.tsx
    groups.tsx
    groups/
      [id].tsx
    events.tsx
    event/
      new.tsx
      [id].tsx
    versement.tsx
    notifications.tsx
    tutorial.tsx
    history.tsx
    help.tsx
    settings.tsx
  _layout.tsx
  +not-found.tsx
```

---

## 🔴 Priorité 2 — Design System (copié de la version web)

### Couleurs
```typescript
// src/theme/colors.ts
export const colors = {
  canvas: '#121212',
  surface: '#181818',
  surfaceHover: '#282828',
  surfaceActive: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  textPlaceholder: '#535353',
  income: '#1DB954',
  expense: '#E51332',
  pending: '#FFB800',
  accent: '#FF6B00',
  white: '#FFFFFF',
  black: '#000000',
};
```

### Composants de base à créer
- `Button` — bouton pill shape, gradient orange
- `Card` — carte surface avec bordure subtile
- `Input` — champ texte dark mode
- `BottomSheet` — drawer du bas
- `Modal` — confirmation
- `StatusBadge` — badge statut (draft/pending/approved/rejected)
- `TransactionCard` — carte transaction résumée
- `BottomNav` — navigation bottom bar (4 onglets: Accueil, Finance, Événements, Plus)
- `TopHeader` — header avec titre + icônes
- `Skeleton` — skeleton loading

---

## 🔴 Priorité 3 — State Management (Zustand)

Créer le store `src/store/useLocalStore.ts` avec :

### Données
- `user` — utilisateur connecté (rôle, org)
- `transactions` — toutes les transactions
- `categories` — 9 catégories prédéfinies
- `orgUnits` — 5 groupes organisationnels
- `caisses` — 6 caisses (1 principale + 5 groupes)
- `events` — événements
- `notifications` — notifications
- `appConfig` — config église

### Actions principales
- `selectRole(role)` — sélectionner le rôle
- `addTransaction(tx)` — créer transaction
- `updateTransaction(id, data)` — modifier
- `deleteTransaction(id)` — supprimer
- `batchDeleteTransactions(ids)` — supprimer multiple
- `approveTransaction(id, userId?)` — approuver
- `batchApproveTransactions(ids, userId?)` — approuver multiple
- `addEvent(event)` — créer événement
- `updateEvent(id, data)` — modifier événement
- `deleteEvent(id)` — supprimer événement (cascade transactions)
- `syncEventBudget(eventId)` — recalculer budget événement
- `createGroup(data)` — créer groupe + caisse
- `updateGroup(id, data)` — modifier groupe
- `deleteGroup(id)` — supprimer groupe
- `createNotification(notif)` — créer notification
- `markNotificationRead(id)` — marquer lu
- `markAllNotificationsRead()` — tout marquer lu
- `updateConfig(config)` — mettre à jour config

### Règles métier
- Montants en **centimes** (5000 FCFA = 500000)
- State machine: `DRAFT → PENDING → APPROVED | REJECTED`
- Transactions approuvées **immuables**
- Versement = 2 transactions liées par `versementId`

---

## 🔴 Priorité 4 — Stockage Local + Sync Supabase

### 4a. Couche de stockage local
Remplacer IndexedDB par **AsyncStorage** (simple key-value) ou **SQLite** (plus robuste).

Si AsyncStorage :
```typescript
// src/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get(key: string) { ... },
  async set(key: string, value: string) { ... },
  async remove(key: string) { ... },
  async getAllKeys() { ... },
};
```

Si SQLite (recommandé pour les listes) :
```bash
npx expo install expo-sqlite
```
Créer les tables : `transactions`, `categories`, `orgUnits`, `caisses`, `events`, `notifications`, `syncQueue`, `config`.

### 4b. Sync avec Supabase
```typescript
// src/lib/sync.ts
import { supabase } from '@/integrations/supabase/client';

const MAX_RETRIES = 5;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];

// Enqueue une opération dans la file d'attente locale
export async function enqueueSync(item: SyncQueueItem) { ... }

// Sync la file d'attente vers Supabase
export async function processSyncQueue() {
  const queue = await getSyncQueue();
  for (const item of queue) {
    await syncWithBackoff(async () => {
      switch (item.entityType) {
        case 'transactions':
          if (item.operation === 'create') {
            await supabase.from('transactions').insert(item.payload);
          } else if (item.operation === 'update') {
            await supabase.from('transactions').update(item.payload).eq('id', item.entityId);
          } else if (item.operation === 'delete') {
            await supabase.from('transactions').delete().eq('id', item.entityId);
          }
          break;
        case 'notifications':
          // ...
      }
      await removeSyncItem(item.id);
    });
  }
}

// Sync avec backoff exponentiel
async function syncWithBackoff<T>(fn: () => Promise<T>, attempt = 0): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (attempt >= MAX_RETRIES) return null;
    const delay = BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
    await new Promise(r => setTimeout(r, delay));
    return syncWithBackoff(fn, attempt + 1);
  }
}

// Realtime subscriptions
export function startRealtimeSubscriptions() {
  // Subscribe to transactions and notifications changes
  // Update Zustand store on realtime events
}
```

### 4c. Background sync
Dans l'App, démarrer le background sync :
- Au démarrage de l'app
- À chaque retour du foreground (`AppStateChangeListener`)
- Quand la connexion revient (`NetInfo`)

---

## 🔴 Priorité 5 — Pages principales

### Dashboard (`app/(main)/index.tsx`)
- Header avec nom église + notification
- Carte hero : solde caisse principale
- Grille des caisses de groupe (avec solde)
- Liste des événements à venir
- Badges pending/draft
- Actions rapides (nouvelle entrée, nouvelle sortie, versement, événements)
- Dernières transactions
- FAB (bouton flottant) pour nouvelle transaction
- BottomNav

### Finance (`app/(main)/finance.tsx`)
- Filtres : période, caisse, statut, catégorie
- Recherche textuelle
- Liste des transactions avec toggle select
- Batch approve
- Export PDF/Excel (via `expo-file-system`)
- Totaux income/expense/net

### TransactionNew (`app/(main)/transaction/new.tsx`)
- Type : revenu / dépense
- Montant (input numérique)
- Date
- Catégorie (picker)
- Groupe (optionnel)
- Événement (optionnel)
- Nom personne
- Commentaire
- Statut : Brouillon / En attente
- Bouton soumettre

### Versement (`app/(main)/versement.tsx`)
- Sélectionner groupe (caisse source)
- Montant (total ou personnalisé)
- Validation (max = solde groupe)
- Aperçu du versement (2 transactions)
- Confirmation

### Groups (`app/(main)/groups.tsx`)
- Liste des groupes
- Bouton "Créer un groupe"
- Chaque groupe : nom, type, solde, bouton "Détail"

### GroupDetail (`app/(main)/groups/[id].tsx`)
- Infos groupe
- Solde caisse
- Historique transactions du groupe
- Bouton "Verser à la caisse principale"

### Events (`app/(main)/events.tsx`)
- Liste événements (filtrée par statut)
- Bouton "Nouvel événement"
- Statut coloré (PLANIFIED/ONGOING/COMPLETED/CANCELLED)
- Barre de progression budget

### EventDetail (`app/(main)/event/[id].tsx`)
- Infos événement
- Budget avec items (ajout/suppression)
- Liste shopping (ajout/suppression/changement statut)
- Transactions liées

---

## 🟡 Priorité 6 — Sécurité & Production

### 6a. Variables d'environnement
Créer `.env` :
```
EXPO_PUBLIC_SUPABASE_URL=https://hhgovvrnalibhgpakswi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh
```

### 6b. Ne pas commiter les secrets
```
# .gitignore
.env
.env.local
```

### 6c. Build de production
```bash
npx expo build:android
# ou
eas build --platform android
```

---

## 📋 Règles importantes

1. **Ne jamais supprimer** de code existant sans justification
2. **Respecter le design system** (couleurs, espacements, typographie)
3. **Les montants sont en centimes** — toujours convertir avant affichage
4. **State machine transactions** : DRAFT → PENDING → APPROVED | REJECTED
5. **Offline-first** : tout doit fonctionner sans internet
6. **Tester sur émulateur** après chaque page complète
7. **Committer proprement** avec messages conventionnels

---

## 📅 Planning de développement (3 jours)

### Jour 1 — Fondations
- [x] Initialiser Expo + TypeScript + NativeWind
- [ ] Configurer navigation (Expo Router)
- [ ] Créer le Design System (composants de base)
- [ ] Implémenter le Zustand Store
- [ ] Implémenter le stockage local (SQLite/AsyncStorage)

### Jour 2 — Pages
- [ ] Login → RoleSelection → Onboarding
- [ ] Dashboard complet
- [ ] Finance (avec filtres + batch approve)
- [ ] TransactionNew + TransactionDetail
- [ ] Groups + GroupDetail
- [ ] Versement
- [ ] Events + EventDetail
- [ ] Balance + Notifications + Settings

### Jour 3 — Sync + Tests + Build
- [ ] Implémenter sync Supabase (background + realtime)
- [ ] Implémenter export PDF/Excel
- [ ] Tests manuels complets
- [ ] Build production Android (APK)
- [ ] Préparation formation utilisateurs

---

## Notes techniques

- **Navigation** : utiliser Expo Router (fichier-based routing)
- **Icônes** : `@expo/vector-icons` ou `lucide-react-native`
- **Picker** : `@react-native-picker/picker` pour les sélecteurs
- **Date** : `date-fns` pour le formatting
- **Charts** : `victory-native` ou `react-native-chart-kit` pour les graphiques
- **Export** : `expo-file-system` + `jspdf` pour PDF, `xlsx` pour Excel
- **SQLite** : `expo-sqlite` pour le stockage local structuré
- **Offline** : utiliser `NetInfo` pour détecter la connexion
