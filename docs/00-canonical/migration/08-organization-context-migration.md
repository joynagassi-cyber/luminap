# Organization Context Migration — Suppression du Hardcode org-1

> Date : 2026-09-07
> Objet | Plan pour remplacer les 30+ hardcodes `org-1` par un contexte injecté

---

## 1. Inventaire des Hardcodes

| Fichier | Lignes | Usage |
|---------|--------|-------|
| `src/store/useLocalStore.ts` | 105, 113-121, 125, 129, 213, 372, 398, 609, 615, 634, 645, 756, 796, 839 | DEFAULT_USER, DEFAULT_CATEGORIES, DEFAULT_CAISSES, DEFAULT_ORG_UNITS, toutes les créations |
| `src/lib/audit.ts` | 25, 142 | defaultAuditEntry, writeAuditSummary |
| `src/lib/auth.ts` | 86 | upsertProfile default org_id |
| `src/lib/archiveService.ts` | 48, 70 | archive, restore audit entries |
| `src/lib/customFields.ts` | 14 | create audit |
| `src/lib/formSystem.ts` | 17, 79 | create, update audit |
| `src/lib/reporting.ts` | 106, 127 | create, delete audit |
| `src/pages/CustomFields.tsx` | 37 | create form |
| `src/pages/EventDetail.tsx` | 90 | create budget |
| `src/pages/EventNew.tsx` | 98 | create event |
| `src/pages/FormBuilder.tsx` | 32, 42 | list, create forms |
| `src/pages/FormFill.tsx` | 40 | submit form |
| `src/pages/Members.tsx` | 41 | create member |
| `src/pages/ReportBuilder.tsx` | 55 | create report |
| `src/pages/TransactionNew.tsx` | 82 | create transaction |
| `src/pages/TransactionNewGroup.tsx` | 69 | create transaction for group |

**Total** : 32 occurrences directes + 9 occurrences indirectes (via DEFAULT_*) = **41 hardcodes**

---

## 2. Architecture Cible

```
┌────────────────────────────────────────────────────┐
│  App (AppProvider, AppRouter)                      │
│         ↓                                          │
│  OrganizationContext (value: { id, name, type })   │
│         ↓                                          │
│  getOrganizationId() → string                      │
│  getOrganizationName() → string                    │
│  getOrganizationType() → OrgType                   │
└────────────────────────────────────────────────────┘
```

**Principe** :
1. Le contexte est initialisé une fois au démarrage
2. Les services读取 via une fonction pure
3. Les pages ne changent pas (trop risqué)

---

## 3. Implémentation

### 3.1 Context Organization

```typescript
// src/context/OrganizationContext.tsx
import { createContext, useContext } from 'react';
import type { OrgType } from '@/types';

export interface OrganizationContextType {
  id: string;
  name: string;
  type: OrgType;
  accentColor: string;
}

const DEFAULT_ORG: OrganizationContextType = {
  id: 'org-1',
  name: 'Église MFE-JC Centrale',
  type: 'Eglise',
  accentColor: '#FF6B00',
};

const OrganizationContext = createContext<OrganizationContextType>(DEFAULT_ORG);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  // TODO: Fetch from Supabase profiles table after auth
  const org = DEFAULT_ORG;
  
  return (
    <OrganizationContext.Provider value={org}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextType {
  return useContext(OrganizationContext);
}
```

---

### 3.2 Service d'Organisation

```typescript
// src/lib/orgContext.ts
import { getPowerSyncDatabase } from './powersync';
import type { Organization } from '@/types';

let _cachedOrg: Organization | null = null;

export async function getOrganization(): Promise<Organization> {
  if (_cachedOrg) return _cachedOrg;
  
  // TODO: Fetch from profiles table (auth.users join with profiles)
  // For now, return default
  _cachedOrg = {
    id: 'org-1',
    name: 'Église MFE-JC Centrale',
    type: 'Eglise',
    accentColor: '#FF6B00',
  };
  
  return _cachedOrg;
}

export function getOrganizationId(): string {
  return 'org-1'; // TODO: Use cached org id
}

export function getOrganizationName(): string {
  return 'Église MFE-JC Centrale'; // TODO: Use cached org name
}
```

---

### 3.3 Remplacement Progressif

#### Niveau 1 : Services uniquement (Faible risque)

```typescript
// src/lib/audit.ts — modifier defaultAuditEntry
import { getOrganizationId } from '@/lib/orgContext';

const defaultAuditEntry = {
  id: '',
  orgId: getOrganizationId(),  // ← Remplace 'org-1'
  transactionId: null,
  userId: 'local-user',
  actorRoleAtTime: null,
  action: 'CREATE',
  entityType: 'Transaction',
  entityId: '',
  beforeState: null,
  afterState: null,
  comment: null,
  createdAt: '',
};
```

**Fichiers à modifier (services)** :
- `src/lib/audit.ts` (2 occurrences)
- `src/lib/auth.ts` (1 occurrence)
- `src/lib/archiveService.ts` (2 occurrences)
- `src/lib/customFields.ts` (1 occurrence)
- `src/lib/formSystem.ts` (2 occurrences)
- `src/lib/reporting.ts` (2 occurrences)

**Total Niveau 1** : 10 occurrences

---

#### Niveau 2 : Store (Moyen risque)

```typescript
// src/store/useLocalStore.ts — modifier les constantes
import { getOrganizationId } from '@/lib/orgContext';

// Avant :
const DEFAULT_USER: User = {
  id: 'local-user',
  email: '',
  firstName: 'Utilisateur',
  lastName: '',
  role: 'TREASURIER',
  org: {
    id: 'org-1',
    name: 'Église MFE-JC Centrale',
    type: 'Eglise',
    accentColor: '#FF6B00',
  },
};

// Après :
const DEFAULT_USER: User = {
  id: 'local-user',
  email: '',
  firstName: 'Utilisateur',
  lastName: '',
  role: 'TREASURIER',
  org: {
    id: getOrganizationId(),
    name: 'Église MFE-JC Centrale',
    type: 'Eglise',
    accentColor: '#FF6B00',
  },
};
```

**Fichiers à modifier (store)** :
- `src/store/useLocalStore.ts` (DEFAULT_USER + 9 catégories + 1 caisse + 1 orgUnit)

**Total Niveau 2** : 13 occurrences

---

#### Niveau 3 : Pages (Élevé risque — À faire lentement)

**Stratégie** : Ne PAS modifier les pages directement.
Utiliser le store qui contient déjà `user.org.id`.

```typescript
// src/pages/TransactionNew.tsx — exemple
import { useLocalStore } from '@/store/useLocalStore';

export default function TransactionNew() {
  const { user } = useLocalStore();
  const orgId = user.org.id; // ← Pas de hardcode ici
  
  // ... existing code ...
}
```

**Pour les pages avec hardcodes directs** :
- Remplacer par `getOrganizationId()` depuis `orgContext.ts`
- OU utiliser `useLocalStore().user.org.id`

**Pages à adapter (priority order)** :
1. `TransactionNew.tsx` — créer transaction
2. `TransactionNewGroup.tsx` — créer transaction groupe
3. `EventNew.tsx` — créer événement
4. `Members.tsx` — créer membre
5. `FormBuilder.tsx` — CRUD formulaires
6. `FormFill.tsx` — soumission formulaire
7. `ReportBuilder.tsx` — créer rapport
8. `CustomFields.tsx` — CRUD champs
9. `EventDetail.tsx` — budget événement
10. `Archive.tsx` — archives (indirect via store)

---

## 4. Order of Operations

| Ordre | Niveau | Fichiers | Risque | Validation |
|-------|--------|----------|--------|------------|
| 1 | Niveau 1 | 6 services | Faible | `pnpm tsc --noEmit` |
| 2 | Niveau 2 | Store | Moyen | Tests manuels creation |
| 3 | Niveau 3 | 10 pages | Élevé | Test de chaque page |

---

## 5. Validation Multi-Organization

Pour tester le multi-organization, ajouter un flag debug :

```typescript
// src/lib/orgContext.ts
export function setOrganizationForTest(org: Organization): void {
  _cachedOrg = org;
}

// Dans le code de test :
import { setOrganizationForTest } from '@/lib/orgContext';

setOrganizationForTest({
  id: 'org-2',
  name: 'Église Annexe',
  type: 'Eglise',
  accentColor: '#00A896',
});
```

---

## 6. Checklist de Migration

- [ ] Créer `src/context/OrganizationContext.tsx`
- [ ] Créer `src/lib/orgContext.ts`
- [ ] Remplacer `org-1` dans `audit.ts`
- [ ] Remplacer `org-1` dans `auth.ts`
- [ ] Remplacer `org-1` dans `archiveService.ts`
- [ ] Remplacer `org-1` dans `customFields.ts`
- [ ] Remplacer `org-1` dans `formSystem.ts`
- [ ] Remplacer `org-1` dans `reporting.ts`
- [ ] Remplacer `org-1` dans `useLocalStore.ts` (constantes)
- [ ] Remplacer `org-1` dans les pages (progressivement)
- [ ] Tester avec org-1 (backward compat)
- [ ] Tester avec org-2 (multi-org)
- [ ] Supprimer les imports `org-1` directs

---

## 7. Risques Spécifiques

| Risque | Mitigation |
|--------|-----------|
| Page cassée après remplacement | Test manuel de chaque page |
| Données créées avec mauvais orgId | Validation SQL post-migration |
| Différence de comportement entre org-1 et org-2 | Mode debug avec switch |
| Performance (appel fonction à chaque opération) | Cache mémoire dans orgContext.ts |

---

## 8. Commandes de Validation

```bash
# Compiler
pnpm tsc --noEmit

# Tester la création de transaction
# (manuellement via l'UI)

# Vérifier les org_id dans la BD
supabase db query "SELECT DISTINCT org_id FROM transactions;"

# Vérifier qu'aucun org-1 direct ne subsiste
grep -rn "'org-1'" src/ --include="*.ts" --include="*.tsx"
```
