# Lumina — Guide d'Intégration

> Plateforme universelle d'organisation financière pour églises
> Version: 1.0 | Dernière mise à jour: Septembre 2026

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** 22+
- **pnpm** 10+
- **Git**
- **Supabase CLI** (optionnel, pour la gestion BDD)

### Installation

```bash
# Cloner le repository
git clone <url-du-repo>
cd lumina

# Installer les dépendances
pnpm install

# Démarrer le serveur de développement
pnpm dev

# Ouvrir http://localhost:8080
```

### Commandes Utiles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Démarrer le dev server (Vite + Nitro) |
| `pnpm build` | Build production |
| `pnpm build:cap` | Build pour Capacitor (Android) |
| `pnpm lint` | Linter ESLint |
| `pnpm test` | Tests E2E Playwright |
| `supabase db pull --linked` | Pull le schema Supabase |
| `supabase functions list` | Lister les edge functions |

---

## 🏗️ Architecture

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (React 19 + TypeScript)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Pages/   │  │Components│  │  Store   │  │   Hooks    │  │
│  │ (32)     │  │  (15)    │  │Zustand   │  │  (2)       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │             │             │              │          │
│       └─────────────┴─────────────┴──────────────┘          │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │  lib/     │                            │
│                    │  (13)     │                            │
│                    └─────┬─────┘                            │
│                          │                                   │
│              ┌───────────┼───────────┐                       │
│              │           │           │                       │
│        ┌─────▼───┐ ┌─────▼───┐ ┌────▼────┐                  │
│        │ Indexed │ │ Sync    │ │ Audit   │                  │
│        │ DB      │ │ Engine  │ │ Logger  │                  │
│        └─────┬───┘ └─────┬───┘ └────┬────┘                  │
│              │           │           │                       │
│              └───────────┴───────────┘                       │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │ Supabase  │                            │
│                    │ (Cloud)   │                            │
│                    └───────────┘                            │
└─────────────────────────────────────────────────────────────┘
                          │
                    ┌─────▼─────┐                            │
                    │ Nitro     │                            │
                    │ (Server)  │                            │
                    │ API Routes│                            │
                    └───────────┘                            │
```

### Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Framework** | React | 19.2.8 |
| **Language** | TypeScript | 5.9.3 |
| **Builder** | Vite | 8.2.2 |
| **State** | Zustand | 5.0.15 |
| **ORM Local** | IndexedDB (native) | v14 |
| **Cloud DB** | Supabase Postgres | - |
| **Server** | Nitro | 3.0.260610-beta |
| **Styling** | Tailwind CSS | 3.4.19 |
| **UI** | shadcn/ui + Radix UI | - |
| **Mobile** | Capacitor | 6.2.2 |
| **Tests** | Playwright | 1.62.1 |

### Patterns Clés

1. **Local-first**: IndexedDB comme source de vérité, sync background vers Supabase
2. **Offline-first**: L'app fonctionne sans internet, retry auto avec backoff
3. **Pas d'auth**: Accès direct, RLS open sur Supabase
4. **Montants en centimes**: Toutes les valeurs monétaires sont des entiers (ex: 50000 = 500 FCFA)
5. **Transactions immuables**: DRAFT → PENDING → APPROVED/REJECTED

---

## 📁 Structure du Code

```
src/
├── App.tsx                 # Configuration routing + providers
├── main.tsx               # Point d'entrée React
├── globals.css            # Variables CSS globales
│
├── components/            # Composants UI partagés
│   ├── BottomNav.tsx      # Navigation bottom (4 onglets + Plus)
│   ├── TopHeader.tsx      # Header fixe en haut
│   ├── TransactionCard.tsx # Carte transaction
│   ├── ConfirmModal.tsx   # Modal de confirmation
│   ├── Skeleton.tsx       # Loaders
│   ├── SyncIndicator.tsx  # Indicateur sync
│   └── ui/                # Composants shadcn/ui
│
├── pages/                 # Pages de l'application (32)
│   ├── Dashboard.tsx      # Vue d'ensemble + caisses
│   ├── Finance.tsx        # Grand livre avec filtres
│   ├── TransactionNew.tsx # Création transaction
│   ├── TransactionDetail.tsx
│   ├── TransactionEdit.tsx
│   ├── Groups.tsx         # Liste des groupes
│   ├── GroupDetail.tsx    # Détail groupe + actions
│   ├── Events.tsx         # Liste événements
│   ├── EventNew.tsx       # Création événement
│   ├── EventDetail.tsx    # Détail événement
│   ├── Versement.tsx      # Transfert caisse → principale
│   ├── Members.tsx        # Gestion membres
│   ├── Archives.tsx       # Éléments archivés
│   ├── Trace.tsx          # Journal d'activité
│   ├── Reports.tsx        # Rapports financiers
│   ├── Balance.tsx        # Bilan par période
│   ├── History.tsx        # Historique complet
│   ├── Settings.tsx       # Paramètres
│   ├── Help.tsx           # Aide
│   ├── Login.tsx          # Sélection rôle
│   ├── Onboarding.tsx     # Première connexion
│   ├── FormBuilder.tsx    # Création formulaires
│   ├── FormFill.tsx       # Remplissage formulaire
│   ├── CustomFields.tsx   # Champs personnalisés
│   ├── ReportBuilder.tsx  # Constructeur rapports
│   └── Notifications.tsx  # Centre notifications
│
├── store/
│   └── useLocalStore.ts   # Store Zustand (1356 lignes)
│
├── lib/                   # Logique métier (13 modules)
│   ├── db.ts             # IndexedDB wrapper
│   ├── sync.ts           # Sync engine + retry
│   ├── audit.ts          # Journal d'audit
│   ├── rbac.ts           # Contrôles d'accès
│   ├── utils.ts          # Helpers (formatage, IDs)
│   ├── account.ts        # Calculs de solde
│   ├── export.ts         # Export PDF/Excel/CSV
│   ├── reporting.ts      # Moteur de rapports
│   ├── formSystem.ts     # Système formulaires
│   ├── customFields.ts   # Champs personnalisés
│   ├── archiveService.ts # Service archivage
│   └── cleanup.ts        # Nettoyage données
│
├── types/
│   └── index.ts          # Types TypeScript
│
├── hooks/
│   └── use-toast.ts      # Système notifications
│
└── integrations/
    └── supabase/
        └── client.ts     # Client Supabase
```

---

## 🗄️ Base de Données

### IndexedDB (Local)

**Nom:** `lumina-db` | **Version:** 14 | **Schema:** 3

**Stores (18):**

| Store | Clé | Description |
|-------|-----|-------------|
| `transactions` | id | Mouvements financiers |
| `categories` | id | Catégories (dîme, offrande, etc.) |
| `orgUnits` | id | Groupes organisationnels |
| `caisses` | id | Caisses (principale + groupes) |
| `accounts` | id | Comptes liés aux caisses |
| `events` | id | Événements (cultes, conférences) |
| `members` | id | Membres de l'église |
| `groups` | id | Groupes (diacres, jeunesse, etc.) |
| `group_memberships` | id | Appartenances groupe|membre |
| `versements` | id | Versements caisse→principale |
| `auditEntries` | id | Journal d'audit |
| `notifications` | id | Notifications utilisateur |
| `syncQueue` | id | File d'attente sync |
| `config` | key | Configuration app (clé=valeur) |
| `form_definitions` | id | Définitions formulaires |
| `form_submissions` | id | Réponses formulaires |
| `custom_field_definitions` | id | Champs personnalisés |
| `custom_field_values` | id | Valeurs champs personnalisés |
| `event_budgets` | id | Budgets d'événements |
| `budget_lines` | id | Lignes budgétaires |
| `report_definitions` | id | Rapports sauvegardés |

### Supabase (Cloud)

**URL:** `https://hhgovvrnalibhgpakswi.supabase.co`

**Tables syncées:** Même schéma qu'IndexedDB + tables auth/storage

**RLS:** Open (tous les utilisateurs peuvent lire/écrire)

**Edge Functions:**
- `signup` — Création compte (v2)
- `login` — Authentification (v2)

---

## 🔄 Sync Engine

### Fonctionnement

```
Action utilisateur
      │
      ▼
IndexedDB (immédiat)
      │
      ├─→ Sync Queue (si offline)
      │
      ▼
Background Sync (si online)
      │
      ▼
Supabase (cloud)
```

### Retry Policy

- **Max retries:** 5
- **Backoff:** 1s → 2s → 4s → 8s → 16s
- **Timeout:** 24h (items expirés supprimés)

### Activation

```typescript
import { startBackgroundSync } from '@/lib/sync';

// Démarrer au lancement
startBackgroundSync();
```

---

## 🎨 Design System

### Couleurs

| Role | Code | Usage |
|------|------|-------|
| **Canvas** | `#121212` | Fond principal |
| **Surface** | `#181818` | Cartes, modals |
| **Hover** | `#282828` | États hover |
| **Active** | `#333333` | États actifs |
| **Text Primary** | `#FFFFFF` | Titres, textes importants |
| **Text Secondary** | `#B3B3B3` | Texte normal |
| **Text Tertiary** | `#808080` | Texte secondaire |
| **Text Placeholder** | `#535353` | Placeholders |
| **Income** | `#1DB954` | Entrées d'argent |
| **Expense** | `#E51332` | Sorties d'argent |
| **Pending** | `#FFB800` | En attente |
| **Brand** | `#FF6B00` | Accent principal |

### Typography

- **Tailwind** pour tous les styles
- **clsx + tailwind-merge** pour les classes conditionnelles
- **Font:** System font stack (par défaut)

### Composants UI

Tous les composants UI viennent de **shadcn/ui** (Radix UI primitives).

```typescript
// Exemple d'import
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
```

---

## 🔐 Règles Métier

### Transactions

```typescript
// Cycle de vie
DRAFT → PENDING → APPROVED
                ↘ REJECTED

// Règles
- Montants en centimes (multiples de 100)
- Transactions APPROUVÉES sont immuables
- Les REJETÉES peuvent être révisées
- Les DRAFT peuvent être modifiées/supprimées
```

### Caisses

```typescript
// Types
MAIN    → Caisse principale de l'église
GROUP   → Caisse de每个 groupe (diacres, jeunesse, etc.)

// Versement
Groupe → Caisse principale
- Crée 2 transactions liées par versementId
- Débit du groupe, Crédit de la caisse principale
```

### Rôles

| Rôle | Permissions |
|------|-------------|
| **PASTEUR** | Validation transactions, consultation finances |
| **TREASURIER** | Accès complet (CRUD transactions, caisses, versements) |
| **SECRETAIRE** | Gestion événements, groupes, membres |
| **COMPTABLE** | Grand livre, bilans, rapports |
| **TREASURIER_ADJOINT** | Assisté trésorier principal |
| **SECRETAIRE_ADJOINT** | Assisté secrétaire |

---

## 🛠️ Tâches Courantes

### Ajouter une Nouvelle Page

```bash
# 1. Créer le fichier
touch src/pages/NouvellePage.tsx

# 2. Ajouter le route dans App.tsx
<Route path="/nouvelle-page" element={<NouvellePage />} />

# 3. Ajouter à la navigation si nécessaire
# src/components/BottomNav.tsx
```

### Créer un Nouveau Type

```typescript
// src/types/index.ts
export type NouveauType = {
  id: string;
  nom: string;
  // ...
};
```

### Ajouter un Champ à IndexedDB

```typescript
// src/lib/db.ts
// 1. Ajouter au type StoreName
export type StoreName = 'transactions' | ... | 'nouveauStore';

// 2. Ajouter dans le migration handler
{ name: 'nouveauStore', keyPath: 'id' }

// 3. Incrémenter DB_VERSION
const DB_VERSION = 15; // +1
```

### Modifier le Store Zustand

```typescript
// src/store/useLocalStore.ts
// Ajouter une action
addNouvelleAction: async (data) => {
  const id = generateId();
  const newItem = { id, ...data, createdAt: new Date().toISOString() };
  await db.put('nouveauStore', newItem);
  await enqueueSync({ /* ... */ });
  set(state => ({ nouveauStore: [...state.nouveauStore, newItem] }));
}
```

---

## 🐛 Debugging

### IndexedDB

```javascript
// Dans la console du navigateur
indexedDB.databases() // Liste des bases
// Ou utiliser DevTools → Application → IndexedDB
```

### Sync Queue

```typescript
// Voir les items en attente
const queue = await db.getSyncQueue();
console.log(queue);

// Nettoyer la file
await db.clear('syncQueue');
```

### Zustand Store

```typescript
// Inspecter l'état actuel
import { useLocalStore } from '@/store/useLocalStore';
const state = useLocalStore.getState();
console.log(state.transactions);
```

### Erreurs Courantes

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Données pas syncées | Offline + retry épuisé | Vérifier `syncQueue` |
| DB migration bloquée | Version mismatch | Incrémenter `DB_VERSION` |
| Page 404 | Route manquante | Ajouter dans `App.tsx` |
| Style cassé | clsx mal utilisé | Vérifier `tailwind-merge` |

---

## 📝 Conventions de Code

### Nommage

- **Composants:** PascalCase (`TransactionCard.tsx`)
- **Hooks:** camelCase avec préfixe `use` (`useLocalStore.ts`)
- **Pages:** PascalCase (`Dashboard.tsx`)
- **Lib:** camelCase (`db.ts`, `sync.ts`)

### Imports

```typescript
// Priorité 1: Types du projet
import type { Transaction } from '@/types';

// Priorité 2: Lib interne
import { db } from '@/lib/db';
import { useLocalStore } from '@/store/useLocalStore';

// Priorité 3: UI Components
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';

// Priorité 4: External libs
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
```

### Erreur Handling

```typescript
// Toujours gérer les erreurs async
try {
  await someAsyncOperation();
} catch (e: any) {
  setError(e.message || "Une erreur est survenue");
}

// Messages d'erreur: jamais techniques pour l'utilisateur
// ❌ "Error 500: Internal Server Error"
// ✅ "Nous n'avons pas pu charger les données. Veuillez réessayer."
```

---

## 🧪 Tests

### Tests E2E (Playwright)

```bash
# Lancer les tests
pnpm test

# Lancer en mode headed
pnpm test --headed

# Spécifique à un fichier
pnpm test src/pages/Dashboard.spec.ts
```

### Testing Manual

```bash
# 1. Démarrer le dev server
pnpm dev

# 2. Ouvrir http://localhost:8080
# 3. Tester les flux principaux:
#    - Créer une transaction
#    - Approver une transaction
#    - Faire un versement
#    - Créer un groupe
#    - Ajouter un membre
```

---

## 🚢 Déploiement

### Web (Vercel)

```bash
# Build
pnpm build

# Déployer sur Vercel
vercel --prod
```

### Android (Capacitor)

```bash
# Build pour Capacitor
pnpm build:cap

# Sync avec Android Studio
npx cap sync android
npx cap open android
```

---

## 📚 Ressources

### Documentation Externe

- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs
- **Zustand:** https://docs.pmnd.rs/zustand
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Supabase:** https://supabase.com/docs
- **Nitro:** https://nitro.unjs.io
- **shadcn/ui:** https://ui.shadcn.com

### Fichiers Clés à Lire

| Fichier | Pourquoi le lire |
|---------|------------------|
| `src/App.tsx` | Routing et structure de l'app |
| `src/store/useLocalStore.ts` | State management et logique métier |
| `src/lib/db.ts` | Accès IndexedDB |
| `src/lib/sync.ts` | Moteur de synchronisation |
| `src/components/BottomNav.tsx` | Navigation principale |
| `src/types/index.ts` | Types TypeScript |

---

## 🤝 Contribution

### Workflow Git

```bash
# 1. Créer une branche
git checkout -b feature/nom-de-la-feature

# 2. Committer avec des messages descriptifs
git commit -m "feat: ajouter validation inline sur formulaire"

# 3. Push et créer PR
git push origin feature/nom-de-la-feature
```

### Checklist PR

- [ ] TypeScript compile sans erreur
- [ ] ESLint passe sans warning
- [ ] Tests manuels passés
- [ ] Pas de console.error
- [ ] Accessibilité vérifiée (contraste, labels)
- [ ] Mobile testing (si changement UI)

---

## ❓ FAQ

**Q: Comment ajouter une nouvelle catégorie de transaction ?**
A: Via les paramètres ou directement dans IndexedDB. Les catégories sont stockées dans le store `categories`.

**Q: Pourquoi les montants sont en centimes ?**
A: Pour éviter les erreurs de virgule flottante. 500 FCFA = 50000 centimes.

**Q: Comment récupérer mes données si je change d'appareil ?**
A: Les données sont syncées sur Supabase. Se connecter avec le même compte restaurera tout.

**Q: L'app fonctionne-t-elle sans internet ?**
A: Oui, entièrement. La sync se fait dès que la connexion est disponible.

**Q: Comment modifier le design system ?**
A: Modifier `src/globals.css` pour les variables CSS, ou `tailwind.config.ts` pour les utilitaires.

---

*Document généré automatiquement — à maintenir à jour avec le code*
