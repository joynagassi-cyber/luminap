# Risques et Régressions — Analyse de Migration

> Date : 2026-09-07
> Objet : Identification et mitigation des risques de migration

---

## 1. Matrice des Risques

| Risque | Probabilité | Impact | Severity | Migration concernée | Atténuation |
|--------|------------|--------|----------|-------------------|-------------|
| Transaction APPROVED modifiée après garde | Moyenne | Critique | 🔴 HIGH | Tranche 2 | Tests characterization |
| Perte données lors migration caisses→accounts | Faible | Critique | 🔴 HIGH | Tranche 5 | Double write, rollback plan |
| Cotisation crash (isPaiementVerrouille) | 🔴 Certainty | Critique | 🔴 HIGH | Tranche 3 | Correction immédiate |
| Breaking changes dans les pages | Moyenne | Élevé | 🟡 MEDIUM | Toutes | Adapters, compatibility layer |
| Sync incomplet après migration | Moyenne | Élevé | 🟡 MEDIUM | Tranche 6 | Validation exhaustive |
| Permissions bloquent accès légitimes | Moyenne | Élevé | 🟡 MEDIUM | Tranche 7 | Mode debug, rollback rapide |
| ArchiveRegistry integration échoue | Faible | Moyen | 🟢 LOW | Tranche 8 | Tests unitaires |
| Reporting données périmées | Faible | Moyen | 🟢 LOW | Tranche 9 | PowerSync en temps réel |

---

## 2. Risques par Domaine

### 2.1 Finance — Transactions

**Risque TXN-1** : Suppression accidentelle de transactions APPROVED
- **Probabilité** : Moyenne
- **Impact** : Critique (intégrité financière)
- **Mitigation** :
  - Test de caractérisation (voir `05-characterization-tests.md`)
  - Double validation avant suppression
  - Audit log obligatoire
  - Rollback plan : restaurer depuis backup Supabase

**Risque TXN-2** : Modification du flux versement
- **Probabilité** : Faible
- **Impact** : Élevé (déséquilibre comptable)
- **Mitigation** :
  - Test d'atomicité (paire de transactions)
  - Vérification post-migration des versements existants
  - Conservation de l'ancien flux en parallèle

### 2.2 Organisation — Caisses vs Accounts

**Risque ORG-1** : Incohérence caisses/accounts
- **Probabilité** : Moyenne
- **Impact** : Critique (double comptabilité)
- **Mitigation** :
  - `CaisseAdapter` pour fusion progressive
  - Validation des soldes avant/suite migration
  - Double write pendant la transition
  - Rollback : restaurer caisses, ignorer accounts

**Risque ORG-2** : Perte hiérarchie groups
- **Probabilité** : Faible
- **Impact** : Élevé
- **Mitigation** :
  - Sauvegarde `org_units` avant suppression
  - Validation des `parent_group_id` après migration
  - Test de navigation hiérarchique

### 2.3 Cotisations

**Risque COT-1** : Crash application (isPaiementVerrouille)
- **Probabilité** : 100% (bug actuel)
- **Impact** : Critique (fonctionnalité bloquée)
- **Mitigation** :
  - Correction prioritaire (Tranche 3)
  - Test de caractérisation immédiatement
  - Validation manuelle du flux complet

**Risque COT-2** : Calcul avance erroné
- **Probabilité** : Faible
- **Impact** : Moyen
- **Mitigation** :
  - Tests `determinerStatutAvance`
  - Tests `calculerDon`
  - Validation des montants en cents

### 2.4 Offline Sync

**Risque SYNC-1** : Données perdues après réinstallation
- **Probabilité** : Moyenne (actuellement)
- **Impact** : Critique
- **Mitigation** :
  - Compléter tous les handlers sync (Tranche 6)
  - Test de réinstallation complète
  - Backup automatique avant migration

**Risque SYNC-2** : Sync en boucle (infinie)
- **Probabilité** : Faible
- **Impact** : Élevé
- **Mitigation** :
  - Vérifier les conditions de sortie dans les handlers
  - Limite de retries (5 max)
  - Backoff exponentiel

### 2.5 Permissions

**Risque PERM-1** : Blocage accès utilisateurs légitimes
- **Probabilité** : Moyenne
- **Impact** : Élevé
- **Mitigation** :
  - Mode debug `?debug=permissions`
  - Liste blanche admin par défaut
  - Rollback rapide (rétablir stub)

**Risque PERM-2** : Fuite de données (BOLA)
- **Probabilité** : Faible
- **Impact** : Critique
- **Mitigation** :
  - RLS sur toutes les tables
  - Vérification `auth.uid() = user_id`
  - Audit des politiques RLS

---

## 3. Plans de Rollback

### 3.1 Rollback Transaction Immunity

```sql
-- Si les gardes causent des problèmes
-- Revert code: supprimer les guards dans useLocalStore.ts
-- Aucune donnée à restaurer
```

### 3.2 Rollback Caisses→Accounts

```sql
-- Restaurer caisses
INSERT INTO caisses (id, name, description, type, color, org_id, created_at, updated_at)
SELECT id, name, description, type, color, org_id, created_at, updated_at
FROM accounts WHERE owner_type = 'GROUP';

INSERT INTO caisses (id, name, description, type, color, org_id, created_at, updated_at)
SELECT 'main', 'Caisse principale', 'Fonds de l\'église', 'MAIN', '#FF6B00', 'org-1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM caisses WHERE id = 'main');

-- Supprimer accounts créés
DELETE FROM accounts WHERE owner_type = 'GROUP';
```

### 3.3 Rollback Cotisation Fix

```typescript
// Supprimer isPaiementVerrouille de cotisation-logic.ts
// Remplacer l'appel dans useLocalStore.ts par true (comportement actuel)
```

### 3.4 Rollback Sync Handlers

```typescript
// Supprimer les nouveaux handlers dans sync.ts
// Conserver les anciens handlers (caisses, orgUnits)
// Aucune donnée à restaurer (sync est idempotent)
```

### 3.5 Rollback Permissions

```typescript
// Rétablir le stub
export function checkPermission(_role: Role, _permission: Permission): boolean {
  return true;
}
```

---

## 4. Points de Vigilance

| Point | Description | Responsable | Fréquence |
|-------|-------------|-------------|-----------|
| **Intégrité financière** | Vérifier que les soldes ne changent pas | Dev | Après chaque tranche |
| **Audit log** | Vérifier que tous les changements sont audités | Dev | Après chaque tranche |
| **Permissions** | Tester avec différents rôles | QA | Avant chaque déploiement |
| **Sync** | Vérifier la synchronisation cloud | QA | Après Tranche 6 |
| **Performance** | Mesurer le temps de chargement | Dev | Après chaque tranche |
| **Rétrocompatibilité** | Tester avec l'ancien format de données | QA | Après Tranche 4 |

---

## 5. Indicateurs de Risque

### 5.1 Signs of Trouble

| Signal | Signification | Action |
|--------|--------------|--------|
| Solde différent avant/après migration | Erreur de calcul | Arrêter, rollback |
| Transactions orphanes (sans versementId) | Corruption données | Audit manuel |
| Double entrée audit | Bug sync | Corriger handler |
| Permission refusée pour admin | Problème RLS | Mode debug |
| Page blanche après migration | Erreur JS | Console browser |

### 5.2 Health Checks

```typescript
// src/lib/healthCheck.ts
export async function runHealthChecks() {
  const results = {
    transactions: await checkTransactionIntegrity(),
    balances: await checkBalanceConsistency(),
    sync: await checkSyncStatus(),
    permissions: await checkPermissionMatrix(),
  };
  
  return results;
}
```

---

## 6. Grille de Décision

| Scénario | Décision | Justification |
|----------|----------|---------------|
| Test characterization échoue | Rollback immédiat | Comportement cassé |
| Solde différent de 1 cent | Investiguer, corriger | Précision financière |
| Perte données > 1% | Rollback complet | Intégrité compromise |
| Performance dégradée > 50% | Bloquer migration | UX critique |
| Bug critique post-migration | Hotfix + test | Priorité utilisateur |

---

## 7. Résumé des Risques Critiques

| Risque | Niveau | Mitigation | Coût Correction |
|--------|--------|-----------|-----------------|
| TXN APPROVED modifiée | 🔴 HIGH | Garde + test | Faible |
| Perte données sync | 🔴 HIGH | Handlers complets | Moyen |
| Crash cotisation | 🔴 HIGH | Fix isPaiementVerrouille | Faible |
| Incohérence caisses/accounts | 🟡 MEDIUM | Adapter + double write | Moyen |
| Permissions bloquantes | 🟡 MEDIUM | Mode debug + rollback | Faible |
