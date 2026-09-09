# Lumina — Guide d'Intégration

> Plateforme universelle d'organisation financière pour églises
> Version: 1.0 | Dernière mise à jour: 2026-09-09
> Status: Platform Complete

---

## ZOOMOUT 2 SENTENCES

Lumina is a local-first, offline-capable financial organization platform built on a capability-based architecture. All business logic lives in domain-agnostic capabilities with a template system for different organization types (church, school, NGO).

---

## ONE-SENTENCE CONTEXT

Production-ready platform with 574 tests, 10 capabilities, 38 Ionic pages, full PowerSync sync, and a template-driven business pack system.

---

## TL;DR

- **574 tests** passing, **0 TypeScript errors**, **build clean**
- **10 capabilities**: identity, lifecycle, notification, organization, policy, relationship, resource, security, workflow, federation
- **38 Ionic pages**, all wrapped in `IonPage`
- **14 roles** with full RBAC
- **PowerSync** with 20 streams → Supabase + IndexedDB fallback
- **Template system** with church.ts as reference implementation
- **Offline-first**: works without internet, syncs when connected
- **E2E tests**: 45+ covering auth, transactions, organizations, groups/events, cloud sync

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
| `pnpm test` | Tests unitaires (574 tests) |
| `pnpm test:e2e` | Tests E2E Playwright |
| `npx tsc --noEmit` | TypeScript type check |
| `supabase db push` | Appliquer migrations Supabase |
| `supabase functions list` | Lister les edge functions |

---

## 🏗️ Architecture

### Vue d'Ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (React 19 + Ionic)                │
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│   │  Pages   │  │Components│  │  Store   │  │    Hooks     │   │
│   │ (38)     │  │ (15)     │  │  Zustand │  │  (2)         │   │
│   │ IonPage  │  │ shadcn   │  │  894 lo  │  │  (toast)     │   │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│        │             │             │               │             │
│        └─────────────┴─────────────┴───────────────┘             │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │    dataLayer.ts   │                        │
│                    │ PowerSync primary │                        │
│                    │ IndexedDB fallback│                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   CAPABILITY LAYER  │
                    │                     │
                    │ identity  lifecycle │
                    │ notification org    │
                    │ policy    resource  │
                    │ relationship security│
                    │ workflow  federation│
                    │                     │
                    │ All domain-agnostic │
                    │ Cross-import guard  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │     ADAPTERS        │
                    │ CaisseAdapter       │
                    │ OrgUnitAdapter      │
                    │ TransactionLegacy   │
                    │ VersementLegacy     │
                    │ EventBudgetAdapter  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    DATA LAYER       │
                    │                     │
                    │  PowerSync (20      │
                    │   streams)          │
                    │       ↓             │
                    │  Supabase Postgres  │
                    │       ↓             │
                    │  RLS policies on    │
                    │  all 8 tables       │
                    └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │      Nitro          │
                    │  (Edge Server)      │
                    │  API Routes         │
                    └─────────────────────┘
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
| **Sync** | PowerSync | 20 streams |
| **Server** | Nitro | 3.0.260610-beta |
| **Styling** | Tailwind CSS | 3.4.19 |
| **UI** | shadcn/ui + Radix UI | - |
| **Mobile** | Capacitor | 6.2.2 |
| **Tests** | Playwright + Vitest | - |

### Patterns Clés

1. **Local-first**: IndexedDB comme source de vérité, sync background vers Supabase
2. **Offline-first**: L'app fonctionne sans internet, retry auto avec backoff
3. **Pas d'auth**: Accès direct, RLS open sur Supabase
4. **Montants en centimes**: Toutes les valeurs monétaires sont des entiers (ex: 50000 = 500 FCFA)
5. **Transactions immuables**: DRAFT → PENDING → APPROVED/REJECTED
6. **Capability-driven**: Toute la logique métier est dans `src/capabilities/`

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
├── pages/                 # Pages de l'application (38)
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
│   └── useLocalStore.ts   # Store Zustand (894 lignes — UI/session only)
│
├── capabilities/          # 10 capabilities (domain-agnostic)
│   ├── identity/          # User profiles
│   ├── lifecycle/         # Archive/restore with audit
│   ├── notification/      # OneSignal wrapper
│   ├── organization/      # Org context management
│   ├── policy/            # Business rules
│   ├── relationship/      # Group memberships
│   ├── resource/          # Generic CRUD
│   ├── security/          # RBAC evaluation
│   ├── workflow/          # Status transitions
│   └── federation/        # Multi-org management
│
├── lib/                   # Utilities & services (13 modules)
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
│   ├── orgContext.ts     # Organization context
│   ├── dataLayer.ts      # Unified data access (PowerSync primary)
│   └── versement-service.ts
│
├── templates/
│   ├── schema.ts         # Template interface definition
│   └── church.ts         # Church template (14 roles, 3 forms)
│
├── manifest/
│   ├── index.ts          # Manifest exports
│   └── compiler.ts       # ManifestCompilerService
│
├── runtime/
│   └── index.ts          # MinimalRuntime
│
├── adapters/
│   ├── CaisseAdapter.ts
│   ├── OrgUnitAdapter.ts
│   ├── TransactionLegacyAdapter.ts
│   ├── VersementLegacyAdapter.ts
│   └── EventBudgetAdapter.ts
│
├── types/
│   └── index.ts          # Types TypeScript
│
├── hooks/
│   └── use-toast.ts      # Système notifications
│
├── ionic/
│   ├── routing.tsx       # 48 Ionic routes
│   ├── theme.ts          # Theme configuration
│   └── theme.css         # CSS tokens
│
├── IonicApp.tsx           # Ionic app wrapper
│
└── integrations/
    └── supabase/
        └── client.ts     # Client Supabase
```

---

## 🗄️ Base de Données

### IndexedDB (Local)

**Nom:** `lumina-db` | **Version:** 14 | **Schema:** 3

**Stores (18+):**

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

**Tables syncées:** Même schéma qu'IndexedDB + tables auth/storage

**RLS:** Open (tous les utilisateurs peuvent lire/écrire)

**PowerSync:** 20 streams configurés dans `powersync/sync-config.yaml`

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
PowerSync (20 streams)
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
GROUP   → Caisse de chaque groupe (diacres, jeunesse, etc.)

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
| *(+ 8 autres rôles)* | |

**14 rôles au total** avec PERMISSION_MATRIX complète.

---

## 🛠️ Tâches Courantes

### Ajouter une Nouvelle Page

```bash
# 1. Créer le fichier
touch src/pages/NouvellePage.tsx

# 2. Ajouter le route dans src/ionic/routing.tsx
#    (Ionic IonRoute, pas React Router)

# 3. Ajouter à la navigation si nécessaire
# src/components/BottomNav.tsx
```

### Créer une Nouvelle Capability

```typescript
// src/capabilities/my-capability/index.ts
import type { Capability } from '../types';

export const myCapability: Capability = {
  name: 'my-capability',
  async init() { /* ... */ },
  // ... methods
};
```

**Règle:** Une capability ne peut pas importer d'autres capabilities ni de UI.

### Modifier le Store Zustand

```typescript
// src/store/useLocalStore.ts
// NE PAS ajouter de logique métier ici
// Ajouter seulement UI state (loading, form, pagination)
```

### Ajouter un Nouveau Type

```typescript
// src/types/index.ts
export type NouveauType = {
  id: string;
  nom: string;
  // ...
};
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
| Page 404 | Route manquante | Ajouter dans `src/ionic/routing.tsx` |
| Style cassé | clsx mal utilisé | Vérifier `tailwind-merge` |

---

## 📝 Conventions de Code

### Nommage

- **Composants:** PascalCase (`TransactionCard.tsx`)
- **Hooks:** camelCase avec préfixe `use` (`useLocalStore.ts`)
- **Pages:** PascalCase (`Dashboard.tsx`)
- **Lib:** camelCase (`db.ts`, `sync.ts`)
- **Capabilities:** kebab-case directories (`src/capabilities/my-capability/`)

### Imports

```typescript
// Priorité 1: Types du projet
import type { Transaction } from '@/types';

// Priorité 2: Capabilities
import { workflow } from '@/capabilities/workflow';

// Priorité 3: Lib interne
import { db } from '@/lib/db';
import { useLocalStore } from '@/store/useLocalStore';

// Priorité 4: UI Components
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';

// Priorité 5: External libs
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

### Tests Unitaires (Vitest)

```bash
# Lancer tous les tests
pnpm test

# Mode watch
pnpm test --watch

# Spécifique à un fichier
pnpm test src/capabilities/__tests__/security.test.ts
```

**574 tests** répartis dans 18 fichiers de test.

### Tests E2E (Playwright)

```bash
# Lancer les tests
pnpm test:e2e

# Lancer en mode headed
pnpm test:e2e --headed

# Spécifique à un fichier
pnpm test:e2e src/pages/Dashboard.spec.ts
```

**5 fichiers E2E:** auth, transactions, organizations, groups/events, cloud sync.

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

### Supabase

```bash
# Appliquer les migrations
supabase db push

# Appliquer les RLS policies
psql -d your_database -f docs/00-canonical/rls-policies.sql
```

---

## 📚 Documentation

### Fichiers Clés à Lire

| Fichier | Pourquoi le lire |
|---------|------------------|
| `src/ionic/routing.tsx` | Routing Ionic (48 routes) |
| `src/store/useLocalStore.ts` | State management et session UI |
| `src/lib/dataLayer.ts` | Unified data access (PowerSync + IndexedDB) |
| `src/lib/rbac.ts` | RBAC engine (source of truth) |
| `src/capabilities/*/index.ts` | Interfaces des 10 capabilities |
| `src/templates/church.ts` | Template church implementation |
| `src/manifest/compiler.ts` | ManifestCompilerService |
| `src/IonicApp.tsx` | Ionic app wrapper |
| `docs/00-canonical/MASTER-EXECUTION-ROADMAP.md` | Architecture et phases complètes |
| `docs/PLATFORM_COMPLETE.md` | Checklist de complétion plateforme |
| `docs/DEPLOYMENT.md` | Guide de déploiement complet |

### Documentation Externe

- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs
- **Zustand:** https://docs.pmnd.rs/zustand
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Supabase:** https://supabase.com/docs
- **PowerSync:** https://powersync.com/docs
- **Ionic:** https://ionicframework.com/docs
- **Nitro:** https://nitro.unjs.io
- **shadcn/ui:** https://ui.shadcn.com

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
- [ ] Tests unitaires passent (`pnpm test`)
- [ ] Tests E2E passent (`pnpm test:e2e`)
- [ ] Pas de console.error
- [ ] Accessibilité vérifiée (contraste, labels)
- [ ] Mobile testing (si changement UI)
- [ ] Une capability ne importe pas d'autres capabilities ni de UI

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

**Q: Comment créer un nouveau template business pack ?**
A: Copier `src/templates/church.ts` et implémenter l'interface `Template` avec vos workflows, rôles, et formulaires.

**Q: Quelle est la différence entre dataLayer et useLocalStore ?**
A: `dataLayer.ts` est la couche d'accès aux données (PowerSync primary, IndexedDB fallback). `useLocalStore.ts` est le state UI/session (Zustand) — pas de logique métier.

---

*Document généré automatiquement — à maintenir à jour avec le code*
