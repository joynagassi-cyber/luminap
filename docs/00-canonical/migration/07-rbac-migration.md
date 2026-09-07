# RBAC Migration — Migration du Système de Permissions

> Date : 2026-09-07
> Objet | Plan de migration du stub RBAC vers un système fonctionnel

---

## 1. État Actuel

| Élément | État | Localisation |
|---------|------|-------------|
| `checkPermission()` | **STUB** — retourne toujours `true` | `src/lib/rbac.ts:12-16` |
| `PERMISSION_MATRIX` | **DÉFINI** — 14 rôles, ~25 permissions | `src/lib/rbac.ts:42-164` |
| `ROLE_HIERARCHY` | **DÉFINI** — niveaux de 10 à 100 | `src/lib/rbac.ts:189-204` |
| `ROLE_LABELS` | **DÉFINI** — labels UI | `src/lib/rbac.ts:169-184` |
| Import dans store | **MORT** — importé mais JAMAIS utilisé | `src/store/useLocalStore.ts:9` |
| Tables BD | **EXISTENTES** — `role_assignments` avec policies RLS | PostgreSQL |

**Conséquence** : Toutes les vérifications de permission sont désactivées. Tout utilisateur fait tout.

---

## 2. Cible Architecturale

```
┌─────────────────────────────────────────────────────┐
│  UI Pages (buttons, routes)                         │
│         ↓                                           │
│  PermissionCapability                               │
│         ↓                                           │
│  PermissionEvaluator                                │
│         ↓                                           │
│  role_assignments table (Supabase)                  │
└─────────────────────────────────────────────────────┘
```

**Principe** :
- L'UI ne fait PAS de vérification directe
- La capability expose une interface propre
- L'évaluateur lit depuis la BD

---

## 3. Plan de Migration

### Phase 1 : Infrastructure (Jour 1)

Créer les fondations sans changer le comportement.

```typescript
// src/capabilities/permission/PermissionCapability.ts
import type { Role, Permission } from '@/types';

export interface PermissionCheck {
  can(role: Role, permission: Permission): boolean;
  cannot(role: Role, permission: Permission): boolean;
  getRolePermissions(role: Role): Permission[];
  hasHigherOrEqualRole(userRole: Role, requiredRole: Role): boolean;
}

export class PermissionCapability implements PermissionCheck {
  private matrix: Record<Role, Permission[]>;
  
  constructor() {
    // Copie de PERMISSION_MATRIX pour isolation
    this.matrix = { ...PERMISSION_MATRIX };
  }
  
  can(role: Role, permission: Permission): boolean {
    return this.matrix[role]?.includes(permission) ?? false;
  }
  
  cannot(role: Role, permission: Permission): boolean {
    return !this.can(role, permission);
  }
  
  getRolePermissions(role: Role): Permission[] {
    return this.matrix[role] ?? [];
  }
  
  hasHigherOrEqualRole(userRole: Role, requiredRole: Role): boolean {
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
  }
}

export const permissionCapability = new PermissionCapability();
```

**Validation** : `pnpm tsc --noEmit` — compilation successful

---

### Phase 2 : Remplacement du Stub (Jour 2)

Remplacer le stub par l'implémentation réelle.

```typescript
// src/lib/rbac.ts — modifier checkPermission
import { permissionCapability } from '@/capabilities/permission/PermissionCapability';

/**
 * Permission check using real matrix (not stub)
 */
export function checkPermission(role: Role, permission: Permission): boolean {
  return permissionCapability.can(role, permission);
}

/**
 * Backward compatibility alias
 */
export const hasPermission = checkPermission;
```

**Validation** : Les tests RBAC passent toujours (la matrice est la même)

---

### Phase 3 : Nettoyage du Store (Jour 3)

Supprimer l'import mort du store.

```typescript
// src/store/useLocalStore.ts — supprimer ligne 9
// Avant :
import { checkPermission } from '@/lib/rbac';

// Après : (supprimer cette ligne)
```

**Note** : `checkPermission` n'était JAMAIS appelé dans le store.
L'import était un résidu de développement.

---

### Phase 4 : Intégration UI (Jour 4-5)

Ajouter les gardes permission dans les pages critiques.

```typescript
// src/pages/Finance.tsx — exemple
import { permissionCapability } from '@/capabilities/permission/PermissionCapability';
import { useLocalStore } from '@/store/useLocalStore';

export default function Finance() {
  const { user } = useLocalStore();
  
  // Bouton supprimer seulement pour ceux avec permission
  const canDelete = permissionCapability.can(user.role, 'transaction:delete');
  const canApprove = permissionCapability.can(user.role, 'transaction:approve');
  
  return (
    <div>
      {/* ... existing code ... */}
      {canDelete && <DeleteButton />}
      {canApprove && <ApproveButton />}
    </div>
  );
}
```

**Pages à adapter** (priority order) :
1. `Finance.tsx` — delete button
2. `TransactionDetail.tsx` — approve/reject buttons
3. `Groups.tsx` — delete group button
4. `EventDetail.tsx` — delete event button
5. `Settings.tsx` — settings access
6. `Trace.tsx` — audit view

---

## 4. Permissions par Page

| Page | Bouton/Action | Permission Requise | Rôles Autorisés |
|------|--------------|-------------------|-----------------|
| Finance.tsx | Supprimer transaction | `transaction:delete` | TREASURIER, TREASURIER_ADJOINT, PASTEUR_PRINCIPAL, ANCIEN |
| TransactionDetail.tsx | Approuver | `transaction:approve` | Tous sauf MEMBRE, BENEVOLE |
| TransactionDetail.tsx | Rejeter | `transaction:reject` | TREASURIER, ANCIEN, PASTEUR_PRINCIPAL |
| Groups.tsx | Supprimer groupe | `group:delete` | TREASURIER, PASTEUR_PRINCIPAL, ANCIEN |
| EventDetail.tsx | Supprimer événement | `event:delete` | SECRETAIRE, TREASURIER, PASTEUR_PRINCIPAL |
| Settings.tsx | Accéder aux settings | `admin:settings` | PASTEUR_PRINCIPAL seulement |
| Trace.tsx | Voir l'audit | `report:read` | Tous les rôles administratifs |

---

## 5. Règles Hiérarchiques

### 5.1 Approbation en cascade

```typescript
// src/capabilities/permission/ApprovalChain.ts
import { ROLE_HIERARCHY } from '@/lib/rbac';
import type { Role } from '@/types';

export class ApprovalChain {
  /**
   * Vérifie si userRole peut approuver une action requérant requiredRole
   */
  static canApprove(userRole: Role, requiredRole: Role): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  }
  
  /**
   * Trouve le niveau hiérarchique minimum pour une action
   */
  static minRoleForPermission(permission: string): Role | null {
    const requirements: Record<string, number> = {
      'transaction:approve': 50,  // TREASURIER_ADJOINT minimum
      'transaction:delete': 55,   // TREASURIER minimum
      'group:delete': 55,         // TREASURIER minimum
      'event:delete': 45,         // SECRETAIRE minimum
      'admin:settings': 100,      // PASTEUR_PRINCIPAL seulement
    };
    
    const minLevel = requirements[permission];
    if (!minLevel) return null;
    
    // Trouver le rôle avec le niveau minimum
    for (const [role, level] of Object.entries(ROLE_HIERARCHY)) {
      if (level >= minLevel) {
        return role as Role;
      }
    }
    return null;
  }
}
```

---

## 6. Tests de Validation

```typescript
// tests/permission.spec.ts
import { checkPermission } from '@/lib/rbac';
import type { Role, Permission } from '@/types';

describe('RBAC Migration', () => {
  const testMatrix: Array<[Role, Permission, boolean]> = [
    // Transactions
    ['TREASURIER', 'transaction:create', true],
    ['TREASURIER', 'transaction:delete', true],
    ['MEMBRE', 'transaction:create', false],
    ['MEMBRE', 'transaction:read', true],
    
    // Groups
    ['TREASURIER', 'group:delete', true],
    ['SECRETAIRE', 'group:delete', false],
    
    // Admin
    ['PASTEUR_PRINCIPAL', 'admin:settings', true],
    ['TREASURIER', 'admin:settings', false],
    
    // Reports
    ['COMPTABLE', 'report:export', true],
    ['BENEVOLE', 'report:export', false],
  ];
  
  testMatrix.forEach(([role, permission, expected]) => {
    it(`should ${expected ? 'allow' : 'deny'} ${role} ${permission}`, () => {
      expect(checkPermission(role, permission)).toBe(expected);
    });
  });
});
```

---

## 7. Rollback Plan

En cas de problème :

```typescript
// src/lib/rbac.ts — rollback au stub
export function checkPermission(_role: Role, _permission: Permission): boolean {
  return true; // STUB — revenir en arrière
}
```

**Déclencheurs de rollback** :
- Utilisateurs bloqués accédant à des fonctionnalités légitimes
- Erreur 500 sur les endpoints avec permissions
- Temps de chargement > 2x normal

---

## 8. Checklist de Déploiement

- [ ] Phase 1 : PermissionCapability créé et testé
- [ ] Phase 2 : Stub remplacé, compilation successful
- [ ] Phase 3 : Import mort supprimé du store
- [ ] Phase 4 : Pages critiques adaptées (3 min)
- [ ] Tests RBAC passent (5 min)
- [ ] Test manuel : connexion avec 3 rôles différents
- [ ] Test manuel : vérification des boutons grisés
- [ ] Monitoring post-déploiement (24h)
