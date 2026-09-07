# Plan d'Intégration Kased — Système Complet de Cotisations dans Lumina

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Intégrer l'intégralité du système de cotisations de Kased dans Lumina, en exploitant l'infrastructure PowerSync déjà mise en place.

**Architecture actuelle (MIGRÉE VERS POWERSYNC):**
- ✅ PowerSync Cloud + Supabase configuré
- ✅ Schema PowerSync défini (20 tables syncées)
- ✅ Backend Connector Supabase implémenté
- ✅ Data Layer avec hooks React (`useQuery`, etc.)
- ✅ Provider PowerSync configuré
- ⚠️ **Reste à faire:** Ajouter les tables cotisations + enrichir membres/transactions

**Architecture cible:**
- Un **Culte** est un `Event` avec `type: 'CULTE'` — réutilise toute l'infrastructure Events.
- Les **Cotisations** sont une nouvelle table PowerSync (`cotisations`) qui lie `membre × culte`.
- Chaque paiement génère une **Transaction INCOME** vers la caisse principale avec `source: 'COTISATION'`.
- Le don (excédent) est automatiquement ajouté au `totalDons` du membre.
- Le paiement en avance (datePaiement < dateCulte) marque automatiquement `EN_AVANCE`.

**Tech Stack:** React 19 + TypeScript, Zustand, PowerSync (SQLite local + Supabase cloud), shadcn/ui, Recharts, jsPDF/xlsx.

**Note importante:** L'application utilise désormais PowerSync comme couche de synchronisation. Les opérations d'écriture doivent utiliser `executeWrite()` depuis `dataLayer.ts` au lieu de `db.put()` d'IndexedDB.

---

## 1. Modèle Métier Complet

### Flux de paiement complet (RÈGLES MÉTIER CRITIQUES)

```
1. CRÉATION D'UN CULT'E → système crée automatiquement N cotisations (N = membres actifs)
   - Chaque cotisation: statut='NON_PAYE', montantObligatoire=5000 (50 FCFA en cents)
   - Seuls les membres ajoutés AVANT la création du culte apparaissent
   - Les membres ajoutés APRES n'apparaîtront PAS dans ce culte

2. PAIEMENT RAPIDE (file d'attente)
   ┌─────────────────────────────────────────────────────────────────┐
   │ Clic "Payé" (50F)                                               │
   │   → Si montantEnAvance >= 5000: consomme l'avance (pas de tx)  │
   │   → Sinon: crée Transaction INCOME (5000 cents)                 │
   │   → Statut → 'PAYE' ou 'EN_AVANCE' (auto si date < culte)      │
   │   → Si don (100F, 150F…): excédent → totalDons += don          │
   │   → Passage automatique au membre suivant                       │
   └─────────────────────────────────────────────────────────────────┘

3. MONTANT LIBRE (dialog personnalisé)
   - Même logique que ci-dessus, montant = celui saisi
   - Don = montant - montantObligatoire
   - Validation: montant >= montantObligatoire sinon erreur

4. PAIEMENT EN AVANCE
   - Si datePaiement < dateCulte → statut='EN_AVANCE'
   - montantEnAvance du membre += montantPaye (si pas consommé)
   - Au culte suivant, le membre peut utiliser son avance

5. VERROUILAGE 30 JOURS (RÈGLE CRITIQUE)
   - Après 30 jours: un culte ne peut plus être modifié
   - Les paiements déjà validés sont verrouillés
   - Tentative de modification après 30 jours → Exception
```

### Règles de validation critiques

| Règle | Implémentation |
|---|---|
| **Montant minimum** | `montantPaye >= montantObligatoire` sinon erreur |
| **Verrouillage 30j** | `isLocked(dateCulte)` → interdit modification si `daysDiff > 30` |
| **Paiement verrouillé** | `isLocked && cotisationEstPaye` → interdit changement |
| **Consommation avance** | `montantEnAvance >= montant` → consomme l'avance, pas de transaction |
| **Membre dans culte** | Seulement si ajouté AVANT création du culte |

### Règle critique : Membres dans un culte
```
Un membre apparaît dans un culte SI ET SEULEMENT SI
il a été ajouté AVANT la création du culte (même de quelques minutes).
C'est la règle métier originale de Kased.
```

### Statuts des cotisations
| Statut | Signification |
|---|---|
| `NON_PAYE` | Pas encore payé |
| `PAYE` | Payé le jour du culte ou après |
| `ABSENT` | Membre marqué absent |
| `EN_AVANCE` | Payé AVANT la date du culte |

---

## 2. Schéma de Base de Données

### Migration 0035 : Type d'événement

```sql
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'EVENT'
  CHECK (type IN ('EVENT', 'CULTE'));
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
```

### Migration 0036 : Table cotisations

```sql
CREATE TABLE IF NOT EXISTS public.cotisations (
  id TEXT PRIMARY KEY,
  culte_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  membre_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'NON_PAYE'
    CHECK (statut IN ('NON_PAYE', 'PAYE', 'ABSENT', 'EN_AVANCE')),
  montantObligatoire BIGINT NOT NULL DEFAULT 5000,
  montantPaye BIGINT NOT NULL DEFAULT 0,
  datePaiement TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotisations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.cotisations TO authenticated;
ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotisations_open_all" ON public.cotisations
  FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cotisations_culte ON public.cotisations(culte_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_membre ON public.cotisations(membre_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_statut ON public.cotisations(statut);
```

### Migration 0037 : Enrichissement membres

```sql
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS total_dons BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS montant_en_avance BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_members_total_dons ON public.members(total_dons);
```

### Migration 0038 : Liens transaction-cotisation

```sql
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cotisation_id TEXT
  REFERENCES public.cotisations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_cotisation ON public.transactions(cotisation_id);
```

---

## 3. Fichiers à Créer / Modifier

```
src/
├── lib/
│   ├── cotisation-logic.ts       ← [CREATE] Logique pure (100% copié de kased)
│   ├── dataLayer.ts              ← [MODIFIER] Ajouter hooks cotisations + writes
│   └── utils.ts                  ← [MODIFIER] formatCotisationStatut()
│
├── lib/powersync/
│   └── schema.ts                 ← [MODIFIER] Ajouter table cotisations
│
├── types/
│   └── index.ts                  ← [MODIFIER] Cotisation, CotisationStatut
│
├── store/
│   └── useLocalStore.ts          ← [MODIFIER] Méthodes cotisations + createCulte
│
├── pages/
│   ├── Cotisations.tsx           ← [CREATE] Liste des cultes avec stats
│   ├── SaisieRapide.tsx          ← [CREATE] File d'attente paiement rapide
│   ├── CulteDetail.tsx           ← [CREATE] Détail culte + liste cotisations
│   ├── MembresEnAvance.tsx       ← [CREATE] Membres avec montantEnAvance > 0
│   ├── MembreDetail.tsx          ← [CREATE] Détail membre + historique paiement
│   └── EventNew.tsx              ← [MODIFIER] Ajouter type "Culte"
│
├── supabase/migrations/
│   ├── 0035_add_event_type_to_events.sql
│   ├── 0036_create_cotisations_table.sql
│   ├── 0037_enrich_members_table.sql
│   └── 0038_enrich_transactions_table.sql
│
└── powersync/
    └── sync-config.yaml          ← [MODIFIER] Ajouter stream cotisations
```

---

## 3.1 Architecture PowerSync — Points Clés

### Ce qui existe déjà:
- ✅ Provider PowerSync (`src/components/PowerSyncProvider.tsx`)
- ✅ Connector Supabase (`src/lib/powersync/SupabaseConnector.ts`)
- ✅ Schema avec 20 tables (`src/lib/powersync/schema.ts`)
- ✅ Hooks de lecture (`src/lib/dataLayer.ts`)
- ✅ Config sync (`powersync/sync-config.yaml`, `powersync/service.yaml`)

### Ce qui doit être ajouté:
1. **Nouvelle table** `cotisations` dans le schema PowerSync
2. **Nouvelles colonnes** sur `members` (`total_dons`, `montant_en_avance`)
3. **Nouvelle colonne** sur `events` (`type`)
4. **Nouvelle colonne** sur `transactions` (`cotisation_id`)
5. **Nouveau stream** dans `sync-config.yaml`
6. **Nouveaux hooks** dans `dataLayer.ts`
7. **Nouvelles méthodes** dans le store Zustand

### Règle critique PowerSync:
```typescript
// Les writes doivent passer par executeWrite() de dataLayer.ts
// NE PAS utiliser db.put() d'IndexedDB pour les nouvelles tables PowerSync
import { executeWrite } from '@/lib/dataLayer';

await executeWrite(
  'INSERT INTO cotisations (id, culte_id, membre_id, statut, montantObligatoire, montantPaye, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  [id, culteId, membreId, 'NON_PAYE', 5000, 0, now, now]
);
```

---

# Tâche 1 : Types + Logique Pure

## Fichiers
- Modifier: `src/types/index.ts`
- Créer: `src/lib/cotisation-logic.ts`

### Modifications `src/types/index.ts`

**Ajouter après les types existants :**

```typescript
export type CotisationStatut = 'NON_PAYE' | 'PAYE' | 'ABSENT' | 'EN_AVANCE';

export type Cotisation = {
  id: string;
  culteId: string;
  membreId: string;
  statut: CotisationStatut;
  montantObligatoire: number;  // en cents (5000 = 50 FCFA)
  montantPaye: number;         // en cents
  datePaiement: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// Ajouter COTISATION à FundSource existant
// Remplacer: export type FundSource = 'CAISSE' | 'COTISATION' | 'PERSONNE' | 'AUTRE';
```

**Ajouter `cotisationId` à l'interface `Transaction` :**
```typescript
  cotisationId: string | null;
```

## Fichier: `src/lib/cotisation-logic.ts`

```typescript
import type { Cotisation, Event, Member } from '@/types';

export const COTISATION_STATUT_LABELS: Record<CotisationStatut, string> = {
  NON_PAYE: 'Non payé',
  PAYE: 'Payé',
  ABSENT: 'Absent',
  EN_AVANCE: 'En avance',
};

export const COTISATION_STATUT_COLORS: Record<CotisationStatut, string> = {
  NON_PAYE: '#EF4444',
  PAYE: '#10B981',
  ABSENT: '#808080',
  EN_AVANCE: '#3B82F6',
};

/**
 * Calcule le nombre de cultes en retard pour un membre.
 * Ignore les cultes antérieurs à la date d'adhésion.
 */
export function calculerNombreRetards(params: {
  cultes: Event[];
  cotisations: Cotisation[];
  dateAdhesion: string;
}): number {
  const { cultes, cotisations, dateAdhesion } = params;
  const adhesionDate = new Date(dateAdhesion);
  const cotisationsMap = new Map(cotisations.map(c => [c.culteId, c]));
  let retards = 0;

  for (const culte of cultes) {
    if (new Date(culte.startDate) < adhesionDate) continue;
    const cotisation = cotisationsMap.get(culte.id);
    if (cotisation === undefined) {
      retards++;
    } else if (cotisation.statut === 'NON_PAYE') {
      retards++;
    }
  }
  return retards;
}

/**
 * Calcule le montant total dû en FCFA à partir du nombre de retards.
 */
export function calculerMontantDu(
  nombreRetards: number,
  montantParCulteCents = 5000,
): number {
  return nombreRetards * montantParCulteCents;
}

/**
 * Détermine si un paiement a été fait avant le culte.
 * Retourne 'EN_AVANCE' si la date de paiement est strictement avant la date du culte.
 */
export function determinerStatutAvance(params: {
  datePaiement: string;
  dateCulte: string;
}): 'PAYE' | 'EN_AVANCE' {
  const paiementDay = new Date(params.datePaiement);
  const culteDay = new Date(params.dateCulte);
  const paiementDate = new Date(paiementDay.getFullYear(), paiementDay.getMonth(), paiementDay.getDate());
  const culteDate = new Date(culteDay.getFullYear(), culteDay.getMonth(), culteDay.getDate());
  return paiementDate < culteDate ? 'EN_AVANCE' : 'PAYE';
}

/**
 * Calcule l'excédent (don) d'un paiement.
 * Retourne 0 si le paiement est inférieur au montant obligatoire.
 */
export function calculerDon(montantPaye: number, montantObligatoire: number): number {
  return Math.max(0, montantPaye - montantObligatoire);
}

/**
 * Calcule les statistiques globales d'un culte.
 */
export function calculerStatsCulte(params: {
  cotisations: Cotisation[];
  culteId: string;
}): {
  total: number;
  paye: number;
  absent: number;
  nonPaye: number;
  enAvance: number;
  totalCollecte: number;
} {
  const cots = params.cotisations.filter(c => c.culteId === params.culteId);
  return {
    total: cots.length,
    paye: cots.filter(c => c.statut === 'PAYE').length,
    absent: cots.filter(c => c.statut === 'ABSENT').length,
    nonPaye: cots.filter(c => c.statut === 'NON_PAYE').length,
    enAvance: cots.filter(c => c.statut === 'EN_AVANCE').length,
    totalCollecte: cots.reduce((s, c) => s + c.montantPaye, 0),
  };
}
```

---

# Tâche 2 : Migrations Supabase

Créer les 4 fichiers SQL dans `supabase/migrations/`.

### `0035_add_event_type_to_events.sql`
```sql
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'EVENT'
  CHECK (type IN ('EVENT', 'CULTE'));
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
```

### `0036_create_cotisations_table.sql`
```sql
CREATE TABLE IF NOT EXISTS public.cotisations (
  id TEXT PRIMARY KEY,
  culte_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  membre_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'NON_PAYE'
    CHECK (statut IN ('NON_PAYE', 'PAYE', 'ABSENT', 'EN_AVANCE')),
  montantObligatoire BIGINT NOT NULL DEFAULT 5000,
  montantPaye BIGINT NOT NULL DEFAULT 0,
  datePaiement TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotisations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.cotisations TO authenticated;
ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotisations_open_all" ON public.cotisations
  FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cotisations_culte ON public.cotisations(culte_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_membre ON public.cotisations(membre_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_statut ON public.cotisations(statut);
```

### `0037_enrich_members_table.sql`
```sql
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS total_dons BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS montant_en_avance BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_members_total_dons ON public.members(total_dons);
```

### `0038_enrich_transactions_table.sql`
```sql
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cotisation_id TEXT
  REFERENCES public.cotisations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_cotisation ON public.transactions(cotisation_id);
```

---

# Tâche 3: Store Zustand — Opérations Cotisations (ADAPTÉ POWERSYNC)

## Fichier: `src/store/useLocalStore.ts`

### Modifications à appliquer

**1. Ajouter les imports nécessaires:**
```typescript
import { executeWrite, addMemberPS, addEventPS } from '@/lib/dataLayer';
```

**2. Ajouter au state interface (après `budgetLines`):**
```typescript
  cotisations: Cotisation[];
  createCulte: (data: {
    name: string;
    startDate: string;
    montantCotisationCents?: number;
  }) => Promise<void>;
  markCotisationPaid: (cotisationId: string, montantPayeCents: number, datePaiement: string) => Promise<void>;
  markCotisationsAbsent: (culteId: string, membreIds: string[]) => Promise<void>;
  updateCotisation: (id: string, data: Partial<Cotisation>) => Promise<void>;
  getCotisationsForCulte: (culteId: string) => Cotisation[];
  getMembreHistorique: (membreId: string) => { cotisation: Cotisation; culte: Event | undefined }[];
  getMembresEnAvance: () => { membre: Member; montant: number }[];
```

**3. Ajouter au state initial (après `budgetLines: []`):**
```typescript
  cotisations: [],
```

**4. Implémenter les méthodes (extrait du code complet dans la section suivante)**

```typescript
      // === COTISATIONS ===
      createCulte: async (data) => {
        const now = new Date().toISOString();
        const id = generateId();
        const sessionId = localStorage.getItem('lumina-session') || 'local-user';

        // Create the culte as an Event with type='CULTE'
        const culte: Event = {
          id,
          orgId: 'org-1',
          name: data.name,
          description: '',
          startDate: data.startDate,
          endDate: null,
          status: 'PLANIFIED',
          budget: 0,
          budgetItems: [],
          shoppingItems: [],
          createdAt: now,
          updatedAt: now,
        };

        // Create cotisations for ALL active members (règle: tous les membres actifs
        // au moment de la création — comme Kased: memberIds = tous les membres
        // actifs, pas ceux ajoutés après)
        const members = get().members.filter(m => m.status === 'ACTIVE');
        const montantObligatoireCents = data.montantCotisationCents ?? 5000;

        const newCotisations: Cotisation[] = members.map(m => ({
          id: generateId(),
          culteId: id,
          membreId: m.id,
          statut: 'NON_PAYE' as CotisationStatut,
          montantObligatoire: montantObligatoireCents,
          montantPaye: 0,
          datePaiement: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        }));

        const updatedCotisations = [...get().cotisations, ...newCotisations];
        set({
          events: [...get().events, culte],
          cotisations: updatedCotisations,
        });

        // === POWERSYNC: Écrire via executeWrite ===
        await executeWrite(
          'INSERT INTO events (id, org_id, name, description, start_date, end_date, status, budget, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, 'org-1', data.name, '', data.startDate, null, 'PLANIFIED', 0, 'CULTE', now, now]
        );

        for (const cot of newCotisations) {
          await executeWrite(
            'INSERT INTO cotisations (id, culte_id, membre_id, statut, montantObligatoire, montantPaye, datePaiement, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [cot.id, cot.culteId, cot.membreId, cot.statut, cot.montantObligatoire, cot.montantPaye, cot.datePaiement, cot.notes, cot.createdAt, cot.updatedAt]
          );
        }
      },

      markCotisationPaid: async (cotisationId, montantPayeCents, datePaiement) => {
        const now = new Date().toISOString();
        const cot = get().cotisations.find(c => c.id === cotisationId);
        if (!cot) return;

        const culte = get().events.find(e => e.id === cot.culteId);
        const membre = get().members.find(m => m.id === cot.membreId);
        if (!culte || !membre) return;

        // === VALIDATIONS CRITIQUES ===

        // 1. Vérifier verrouillage 30 jours
        if (isPaiementVerrouille({ dateCulte: culte.startDate, cotisationEstPaye: cot.statut === 'PAYE' || cot.statut === 'EN_AVANCE' })) {
          throw new Error('PAIEMENT_VERROUILLE: Ce paiement est verrouillé (culte de plus de 30 jours)');
        }

        // 2. Vérifier montant minimum
        if (montantPayeCents < cot.montantObligatoire) {
          throw new Error(`Le montant doit être au moins égal au montant obligatoire (${cot.montantObligatoire} cents)`);
        }

        // 3. Déterminer le statut (auto en avance si paiement avant le culte)
        const statut = determinerStatutAvance({ datePaiement, dateCulte: culte.startDate });
        const donCents = calculerDon(montantPayeCents, cot.montantObligatoire);

        // === LOGIQUE AVANCE ===
        // Si le membre a suffisamment d'avance, consommer l'avance au lieu de créer une transaction
        const aAvance = membre.montantEnAvance >= montantPayeCents;

        let updatedCot: Cotisation;
        let updatedMembre: Member | null = null;

        if (aAvance) {
          // Consomme l'avance
          updatedCot = {
            ...cot,
            statut,
            montantPaye: montantPayeCents,
            datePaiement,
            updatedAt: now,
          };
          updatedMembre = {
            ...membre,
            montantEnAvance: membre.montantEnAvance - montantPayeCents,
            updatedAt: now,
          };
          // PAS de transaction créée (avanced consommée)
        } else {
          // Crée une transaction normale
          updatedCot = {
            ...cot,
            statut,
            montantPaye: montantPayeCents,
            datePaiement,
            updatedAt: now,
          };

          // Créer la transaction INCOME (toujours vers la caisse principale)
          const sessionId = localStorage.getItem('lumina-session') || 'local-user';
          const tx: Transaction = {
            id: generateId(),
            orgId: 'org-1',
            type: 'INCOME',
            amount: montantPayeCents,
            description: `Cotisation ${membre.firstName} ${membre.lastName} — Culte du ${formatDate(culte.startDate)}`,
            date: datePaiement.split('T')[0],
            status: 'APPROVED',
            categoryId: 'cat-dime',
            orgUnitId: null,
            eventId: cot.culteId,
            source: 'COTISATION',
            personName: `${membre.firstName} ${membre.lastName}`,
            compensatesFor: null,
            comment: donCents > 0
              ? `Cotisation + don ${formatCentsToFCFA(donCents)} FCFA`
              : 'Cotisation',
            version: 1,
            sourceCaisseId: 'main',
            versementId: null,
            reversalOfId: null,
            cotisationId,
            createdAt: now,
            updatedAt: now,
            createdById: sessionId,
            approvedById: sessionId,
            approvedAt: now,
          };

          const updatedTxs = [...get().transactions, tx];
          set({ transactions: updatedTxs });
          // POWERSYNC: Écrire la transaction
          await executeWrite(
            `INSERT INTO transactions (
              id, org_id, type, amount, description, date, status,
              category_id, org_unit_id, compensates_for, comment,
              version, created_by_id, approved_by_id, created_at,
              updated_at, approved_at, event_id, source, person_name,
              source_caisse_id, versement_id, reversal_of_id, cotisation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tx.id, tx.orgId, tx.type, tx.amount, tx.description, tx.date, tx.status,
              tx.categoryId, tx.orgUnitId, tx.compensatesFor, tx.comment,
              tx.version, tx.createdById, tx.approvedById, tx.createdAt,
              tx.updatedAt, tx.approvedAt, tx.eventId, tx.source, tx.personName,
              tx.sourceCaisseId, tx.versementId, tx.reversalOfId, tx.cotisationId,
            ]
          );
        }

        // === MISE À JOUR COTISATION ===
        const updatedCotisations = get().cotisations.map(c => c.id === cotisationId ? updatedCot : c);
        set({ cotisations: updatedCotisations });
        // POWERSYNC: Mettre à jour la cotisation
        await executeWrite(
          `UPDATE cotisations SET statut = ?, montantPaye = ?, datePaiement = ?, updatedAt = ? WHERE id = ?`,
          [updatedCot.statut, updatedCot.montantPaye, updatedCot.datePaiement, now, cotisationId]
        );
        await enqueueSync({
          id: `sync-cot-${cotisationId}`,
          operation: 'update',
          entityType: 'cotisations',
          entityId: cotisationId,
          payload: updatedCot,
          attempts: 0,
          lastAttempt: null,
          createdAt: now,
        });

        // === MISE À JOUR MEMBRE (dons + avance) ===
        if (updatedMembre) {
          // Avance consommée
          const updatedMembers = get().members.map(m => m.id === membre.id ? updatedMembre! : m);
          set({ members: updatedMembers });
          // POWERSYNC: Mettre à jour le membre
          await executeWrite(
            `UPDATE members SET montant_en_avance = ?, updatedAt = ? WHERE id = ?`,
            [updatedMembre.montantEnAvance, now, membre.id]
          );
        } else if (donCents > 0) {
          // Don ajouté
          const updatedMembers = get().members.map(m =>
            m.id === membre.id
              ? { ...m, totalDons: (m.totalDons || 0) + donCents, updatedAt: now }
              : m
          );
          set({ members: updatedMembers });
          // POWERSYNC: Mettre à jour le membre
          await executeWrite(
            `UPDATE members SET total_dons = ?, updatedAt = ? WHERE id = ?`,
            [(membre.totalDons || 0) + donCents, now, membre.id]
          );
        }
      },

      markCotisationsAbsent: async (culteId, membreIds) => {
        const now = new Date().toISOString();
        const updated = get().cotisations.map(c =>
          c.culteId === culteId && membreIds.includes(c.membreId)
            ? { ...c, statut: 'ABSENT' as CotisationStatut, updatedAt: now }
            : c
        );
        set({ cotisations: updated });
        for (const cot of updated.filter(c => c.culteId === culteId && membreIds.includes(c.membreId))) {
          await db.put('cotisations', cot);
        }
      },

      updateCotisation: async (id, data) => {
        const now = new Date().toISOString();
        const updated = get().cotisations.map(c => c.id === id ? { ...c, ...data, updatedAt: now } : c);
        set({ cotisations: updated });
        const cot = updated.find(c => c.id === id)!;
        await db.put('cotisations', cot);
        await enqueueSync({
          id: `sync-cot-${id}`,
          operation: 'update',
          entityType: 'cotisations',
          entityId: id,
          payload: cot,
          attempts: 0,
          lastAttempt: null,
          createdAt: now,
        });
      },

      getCotisationsForCulte: (culteId) => {
        return get().cotisations.filter(c => c.culteId === culteId);
      },

      getMembreHistorique: (membreId) => {
        const cotisations = get().cotisations.filter(c => c.membreId === membreId);
        return cotisations
          .map(cot => {
            const culte = get().events.find(e => e.id === cot.culteId);
            return { cotisation: cot, culte };
          })
          .filter(({ culte }) => culte !== undefined)
          .sort((a, b) => {
            if (!a.culte || !b.culte) return 0;
            return new Date(b.culte.startDate).getTime() - new Date(a.culte.startDate).getTime();
          });
      },

      getMembresEnAvance: () => {
        return get().members
          .filter(m => m.montantEnAvance > 0 && m.status === 'ACTIVE')
          .map(m => ({ membre: m, montant: m.montantEnAvance }))
          .sort((a, b) => b.montant - a.montant);
      },
```

### 3e. Ajouter le chargement des cotisations dans `loadInitialData`

```typescript
        // Load cotisations
        const cotisations = await db.getAll<Cotisation>('cotisations').catch(() => [] as Cotisation[]);
        set({ cotisations });
```

### 3f. Ajouter `'cotisations'` au `StoreName` dans `src/lib/db.ts`

```typescript
export type StoreName = 'transactions' | 'categories' | 'orgUnits' | 'auditEntries' | 'events' | 'syncQueue' | 'config' | 'caisses' | 'notifications' | 'members' | 'groups' | 'accounts' | 'group_memberships' | 'versements' | 'event_budgets' | 'budget_lines' | 'report_definitions' | 'form_definitions' | 'form_submissions' | 'custom_field_definitions' | 'custom_field_values' | 'cotisations';
```

### 3g. Ajouter le store `cotisations` dans le schéma IndexedDB (`onupgradeneeded`)

```typescript
        { name: 'cotisations', keyPath: 'id' },
```

---

# Tâche 4 : Page Cotisations (Liste des cultes)

## Fichier: `src/pages/Cotisations.tsx`

```typescript
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { Calendar, CheckCircle, Clock, Plus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function Cotisations() {
  const navigate = useNavigate();
  const { events, cotisations } = useLocalStore();

  const cultes = useMemo(() =>
    events
      .filter(e => e.type === 'CULTE')
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  , [events]);

  const getCulteStats = (culteId: string) => {
    const cots = cotisations.filter(c => c.culteId === culteId);
    const paye = cots.filter(c => c.statut === 'PAYE' || c.statut === 'EN_AVANCE').length;
    const absent = cots.filter(c => c.statut === 'ABSENT').length;
    const nonPaye = cots.filter(c => c.statut === 'NON_PAYE').length;
    const total = cots.length;
    const collected = cots.reduce((s, c) => s + c.montantPaye, 0);
    return { paye, absent, nonPaye, total, collected };
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Cotisations" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-text-primary font-bold text-xl">Cotisations</h1>
            <p className="text-text-tertiary text-xs mt-0.5">{cultes.length} culte{cultes.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/event/new', { state: { defaultType: 'CULTE' } })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}
          >
            <Plus className="w-4 h-4" /> Nouveau culte
          </button>
        </div>

        {cultes.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Calendar className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm mb-2">Aucun culte</p>
            <p className="text-text-tertiary text-xs mb-4">Créez votre premier culte dominical</p>
            <button
              onClick={() => navigate('/event/new', { state: { defaultType: 'CULTE' } })}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: '#FF6B00' }}
            >
              Créer un culte
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cultes.map(culte => {
              const stats = getCulteStats(culte.id);
              const progress = stats.total > 0 ? (stats.paye / stats.total) * 100 : 0;
              const progressColor = progress === 100 ? '#10B981' : progress > 50 ? '#F59E0B' : '#EF4444';

              return (
                <button
                  key={culte.id}
                  onClick={() => navigate(`/saisie-rapide/${culte.id}`)}
                  className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
                  style={{ backgroundColor: '#212121' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                      <Calendar className="w-5 h-5" style={{ color: '#FF6B00' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-semibold truncate">{culte.name}</p>
                      <p className="text-text-tertiary text-xs mt-0.5">{formatDate(culte.startDate)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" style={{ color: '#10B981' }} />
                          <span className="text-xs" style={{ color: '#10B981' }}>{stats.paye}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" style={{ color: '#EF4444' }} />
                          <span className="text-xs" style={{ color: '#EF4444' }}>{stats.nonPaye}</span>
                        </div>
                        <div className="text-text-tertiary text-xs">{stats.absent} abs</div>
                        <div className="ml-auto text-right">
                          <p className="text-text-primary font-bold text-sm">{formatCurrencyCompact(stats.collected)} F</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: '#282828' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: progressColor }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
```

---

# Tâche 5 : Page Saisie Rapide (Cœur du système)

## Fichier: `src/pages/SaisieRapide.tsx`

C'est la page la plus importante — elle reproduit le flux « swipe » de Kased.

```typescript
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { determinerStatutAvance, calculerDon } from '@/lib/cotisation-logic';
import type { Cotisation } from '@/types';
import { CheckCircle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function SaisieRapide() {
  const { id: culteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, members, cotisations, markCotisationPaid, markCotisationsAbsent, getCotisationsForCulte, user } = useLocalStore();

  const [queue, setQueue] = useState<string[]>([]); // member IDs en file
  const [showCustomPay, setShowCustomPay] = useState(false);
  const [customAmount, setCustomAmount] = useState('50');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const culte = events.find(e => e.id === culteId);
  const cotisationsCulte = getCotisationsForCulte(culteId!);
  const montantObligatoireCents = culte ? 5000 : 5000; // 50 FCFA

  // Build queue: all members for this culte who are NOT yet paid, sorted alphabetically
  useEffect(() => {
    if (!cotisationsCulte || members.length === 0) return;

    const paidMemberIds = new Set(
      cotisationsCulte.filter(c => c.statut === 'PAYE' || c.statut === 'EN_AVANCE').map(c => c.membreId)
    );

    const remaining = members
      .filter(m => m.status === 'ACTIVE' && !paidMemberIds.has(m.id))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
      .map(m => m.id);

    setQueue(remaining);
  }, [cotisationsCulte, members]);

  const currentMemberId = queue[0];
  const currentMember = currentMemberId ? members.find(m => m.id === currentMemberId) : null;
  const currentCotisation = currentMemberId
    ? cotisationsCulte.find(c => c.membreId === currentMemberId)
    : null;

  const payesCount = cotisationsCulte.filter(c => c.statut === 'PAYE' || c.statut === 'EN_AVANCE').length;
  const total = cotisationsCulte.length;

  const handleMarkPaid = async () => {
    if (!currentMemberId) return;
    const amountCents = Math.round(parseFloat(customAmount || '50') * 100);
    await markCotisationPaid(currentCotisation!.id, amountCents, paymentDate);
    // Move to next member
    setQueue(prev => prev.slice(1));
    // Reset
    setCustomAmount('50');
    setShowCustomPay(false);
  };

  const handleSkip = () => {
    if (!currentMemberId) return;
    // Mark as absent and move to next
    markCotisationsAbsent(culteId!, [currentMemberId]);
    setQueue(prev => prev.slice(1));
  };

  const handleNext = () => {
    setQueue(prev => [...prev.slice(1), prev[0]]);
  };

  if (!culte) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <p className="text-text-tertiary">Culte introuvable</p>
      </div>
    );
  }

  const allDone = queue.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <TopHeader title={culte.name} />
      <div className="max-w-lg mx-auto px-4 pb-8 pt-12">

        {/* Progress */}
        <div className="text-center mb-6">
          <div className="h-1.5 rounded-full bg-gray-200 mb-3">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${total > 0 ? (payesCount / total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-gray-500 text-sm font-semibold">
            {payesCount} / {total} payés
          </p>
          <p className="text-gray-400 text-xs mt-1">{montantObligatoireCents / 100} FCFA</p>
        </div>

        {allDone ? (
          /* All done screen */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tout le monde a été traité</h2>
            <p className="text-gray-500 mb-8">{payesCount} paiements enregistrés pour ce culte.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-3 rounded-full text-sm font-semibold text-white bg-orange-500"
            >
              Fermer
            </button>
          </div>
        ) : currentMember ? (
          /* Current member card */
          <div className="flex flex-col items-center">
            <div className="text-center mb-8">
              <p className="text-gray-400 text-sm font-medium mb-1">{currentMember.firstName}</p>
              <p className="text-3xl font-bold text-gray-900">{currentMember.lastName.toUpperCase()}</p>
              <div className="mt-4 px-6 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                <p className="text-gray-900 font-bold">{currentMember.firstName} {currentMember.lastName}</p>
                <p className="text-gray-400 text-sm mt-1">Tapez Payé ou passez au suivant</p>
              </div>
            </div>

            <div className="w-full space-y-3">
              {/* PAYÉ button */}
              <button
                onClick={handleMarkPaid}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: '#10B981' }}
              >
                <CheckCircle className="w-6 h-6" /> Payé
              </button>

              {/* Montant libre */}
              <button
                onClick={() => setShowCustomPay(!showCustomPay)}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: '#1246C8', color: '#fff' }}
              >
                <DollarSign className="w-5 h-5" /> Montant libre
              </button>

              {/* Custom amount input */}
              {showCustomPay && (
                <div className="rounded-2xl p-4" style={{ backgroundColor: '#f5f5f5' }}>
                  <label className="text-gray-500 text-xs mb-2 block">Montant à saisir (FCFA)</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-gray-900 text-lg font-bold outline-none text-center"
                    style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleMarkPaid();
                    }}
                  />
                  {parseInt(customAmount) > 50 && (
                    <p className="text-center text-sm mt-2" style={{ color: '#3B82F6' }}>
                      Don de {(parseInt(customAmount) - 50).toLocaleString('fr-FR')} FCFA
                    </p>
                  )}
                  <button
                    onClick={handleMarkPaid}
                    className="w-full mt-3 py-3 rounded-xl text-white font-semibold"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    Confirmer {customAmount} FCFA
                  </button>
                </div>
              )}

              {/* Passer (skip) */}
              <button
                onClick={handleSkip}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-600"
              >
                Passer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">Aucun membre à traiter</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
```

---

# Tâche 6 : Page Culte Detail

## Fichier: `src/pages/CulteDetail.tsx`

```typescript
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { calculerStatsCulte } from '@/lib/cotisation-logic';
import { ArrowLeft, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import type { CotisationStatut } from '@/types';

const STATUT_COLORS: Record<CotisationStatut, string> = {
  NON_PAYE: '#EF4444',
  PAYE: '#10B981',
  ABSENT: '#808080',
  EN_AVANCE: '#3B82F6',
};

const STATUT_LABELS: Record<CotisationStatut, string> = {
  NON_PAYE: 'Non payé',
  PAYE: 'Payé',
  ABSENT: 'Absent',
  EN_AVANCE: 'En avance',
};

export default function CulteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, members, cotisations, markCotisationPaid, markCotisationsAbsent, user } = useLocalStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatch, setShowBatch] = useState(false);
  const [batchAmount, setBatchAmount] = useState('50');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);

  const culte = events.find(e => e.id === id);
  if (!culte) return <div className="min-h-screen bg-[#121212] flex items-center justify-center"><p className="text-text-tertiary">Culte introuvable</p></div>;

  const cots = cotisations.filter(c => c.culteId === id);
  const stats = calculerStatsCulte({ cotisations: cots, culteId: id! });

  const toggleSelect = (membreId: string) => {
    setSelectedIds(prev => prev.includes(membreId) ? prev.filter(i => i !== membreId) : [...prev, membreId]);
  };
  const selectAll = () => setSelectedIds(cots.filter(c => c.statut === 'NON_PAYE').map(c => c.membreId));
  const clearSelection = () => setSelectedIds([]);

  const handleBatchPay = async () => {
    const amountCents = Math.round(parseFloat(batchAmount) * 100);
    for (const memberId of selectedIds) {
      const cot = cots.find(c => c.membreId === memberId);
      if (cot) {
        await markCotisationPaid(cot.id, amountCents, batchDate);
      }
    }
    setSelectedIds([]);
    setShowBatch(false);
  };

  const handleMarkPaid = async (cotisationId: string, montantCents: number) => {
    await markCotisationPaid(cotisationId, montantCents, new Date().toISOString().split('T')[0]);
  };

  const handleMarkAbsent = async (membreId: string) => {
    const cot = cots.find(c => c.membreId === membreId);
    if (cot) {
      await useLocalStore.getState().updateCotisation(cot.id, { statut: 'ABSENT' });
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Détail culte" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-text-primary font-bold text-xl">{culte.name}</h1>
            <p className="text-text-tertiary text-sm mt-1">{formatDate(culte.startDate)}</p>
          </div>
          <button
            onClick={() => navigate(`/saisie-rapide/${id}`)}
            className="px-4 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}
          >
            Saisie rapide
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" style={{ color: '#FF6B00' }} />
              <span className="text-text-tertiary text-xs">Membres</span>
            </div>
            <p className="text-text-primary font-bold text-2xl">{stats.total}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span className="text-text-tertiary text-xs">Collecté</span>
            </div>
            <p className="text-text-primary font-bold text-2xl">{formatCurrencyCompact(stats.totalCollecte)} F</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span className="text-text-tertiary text-xs">Payés</span>
            </div>
            <p className="text-text-primary font-bold text-2xl">{stats.paye}<span className="text-text-tertiary text-sm font-normal">/{stats.total}</span></p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" style={{ color: '#EF4444' }} />
              <span className="text-text-tertiary text-xs">En retard</span>
            </div>
            <p className="text-text-primary font-bold text-2xl">{stats.nonPaye}</p>
          </div>
        </div>

        {/* Batch action */}
        {stats.nonPaye > 0 && (
          <button
            onClick={() => setShowBatch(true)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white mb-4"
            style={{ backgroundColor: '#FF6B00' }}
          >
            Paiement massif ({stats.nonPaye} membres)
          </button>
        )}

        {/* List */}
        <div className="space-y-2">
          {cots.map(cot => {
            const membre = members.find(m => m.id === cot.membreId);
            if (!membre) return null;
            const color = STATUT_COLORS[cot.statut];
            const label = STATUT_LABELS[cot.statut];

            return (
              <div
                key={cot.id}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#212121' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color + '20' }}
                >
                  <span className="text-sm font-bold" style={{ color }}>
                    {membre.firstName[0]}{membre.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-semibold text-sm truncate">
                    {membre.firstName} {membre.lastName}
                  </p>
                  <p className="text-text-tertiary text-xs">{label}</p>
                </div>
                <div className="text-right">
                  {cot.montantPaye > 0 ? (
                    <p className="text-text-primary font-bold text-sm">{formatCurrencyCompact(cot.montantPaye)} F</p>
                  ) : (
                    <p className="text-text-tertiary text-sm">—</p>
                  )}
                </div>
                {/* Quick actions */}
                <div className="flex gap-1">
                  {(cot.statut === 'NON_PAYE' || cot.statut === 'ABSENT') && (
                    <button
                      onClick={() => handleMarkPaid(cot.id, 5000)}
                      className="p-2 rounded-lg"
                      style={{ color: '#10B981' }}
                      title="Marquer payé"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {cot.statut === 'NON_PAYE' && (
                    <button
                      onClick={() => handleMarkAbsent(cot.membreId)}
                      className="p-2 rounded-lg"
                      style={{ color: '#808080' }}
                      title="Marquer absent"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Batch payment dialog */}
        {showBatch && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowBatch(false)} />
            <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 pb-8" style={{ backgroundColor: '#1e1e1e' }}>
              <h2 className="text-text-primary font-bold text-lg mb-4">Paiement massif</h2>
              <div className="mb-4">
                <label className="text-text-tertiary text-xs mb-1.5 block">Montant (FCFA)</label>
                <input
                  type="number"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#282828', border: '1px solid #383838' }}
                />
              </div>
              <div className="mb-6">
                <label className="text-text-tertiary text-xs mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#282828', border: '1px solid #383838' }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatch(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#282828', color: '#B3B3B3' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleBatchPay}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#FF6B00' }}
                >
                  Confirmer ({stats.nonPaye})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
```

---

# Tâche 7 : Page Membres En Avance

## Fichier: `src/pages/MembresEnAvance.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact } from '@/lib/utils';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function MembresEnAvance() {
  const navigate = useNavigate();
  const { members } = useLocalStore();

  const membresEnAvance = members
    .filter(m => m.montantEnAvance > 0 && m.status === 'ACTIVE')
    .sort((a, b) => (b.montantEnAvance || 0) - (a.montantEnAvance || 0));

  const totalAvance = membresEnAvance.reduce((s, m) => s + (m.montantEnAvance || 0), 0);

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Membres en avance" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Summary */}
        <div className="rounded-xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, #1246C8, #FF6B00)' }}>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Total en avance</p>
          <p className="text-white font-bold text-3xl">{formatCurrencyCompact(totalAvance)} F</p>
          <p className="text-white/60 text-sm mt-1">{membresEnAvance.length} membre{membresEnAvance.length !== 1 ? 's' : ''}</p>
        </div>

        {/* List */}
        {membresEnAvance.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm">Aucun membre en avance</p>
          </div>
        ) : (
          <div className="space-y-2">
            {membresEnAvance.map(m => (
              <button
                key={m.id}
                onClick={() => navigate(`/membre/${m.id}`)}
                className="w-full text-left rounded-xl p-4 flex items-center gap-3 transition-all active:scale-95"
                style={{ backgroundColor: '#212121' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3B82F620' }}>
                  <span className="text-sm font-bold" style={{ color: '#3B82F6' }}>{m.firstName[0]}{m.lastName[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-semibold text-sm">{m.firstName} {m.lastName}</p>
                  <p className="text-text-tertiary text-xs">Montant en avance</p>
                </div>
                <p className="text-[#3B82F6] font-bold text-sm">{formatCurrencyCompact(m.montantEnAvance || 0)} F</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
```

---

# Tâche 8 : Page Membre Detail (Historique de paiement)

## Fichier: `src/pages/MembreDetail.tsx`

```typescript
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { calculerNombreRetards } from '@/lib/cotisation-logic';
import { ArrowLeft, Calendar, CheckCircle, Clock, DollarSign, CreditCard } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import type { CotisationStatut } from '@/types';

const STATUT_LABELS: Record<CotisationStatut, string> = {
  NON_PAYE: 'Non payé',
  PAYE: 'Payé',
  ABSENT: 'Absent',
  EN_AVANCE: 'En avance',
};

const STATUT_COLORS: Record<CotisationStatut, string> = {
  NON_PAYE: '#EF4444',
  PAYE: '#10B981',
  ABSENT: '#808080',
  EN_AVANCE: '#3B82F6',
};

export default function MembreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { members, events, cotisations, archiveMember, restoreMember, user } = useLocalStore();
  const [filter, setFilter] = useState<CotisationStatut | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const membre = members.find(m => m.id === id);
  if (!membre) return <div className="min-h-screen bg-[#121212] flex items-center justify-center"><p className="text-text-tertiary">Membre introuvable</p></div>;

  const allCultes = events.filter(e => e.type === 'CULTE');
  const membreCotisations = cotisations.filter(c => c.membreId === id);
  const cultesPayes = membreCotisations.filter(c => c.statut === 'PAYE' || c.statut === 'EN_AVANCE').length;
  const totalCultes = allCultes.length;
  const totalDons = membreCotisations.reduce((s, c) => s + Math.max(0, c.montantPaye - c.montantObligatoire), 0);
  const cadence = totalCultes > 0 ? (cultesPayes / totalCultes) * 100 : 0;
  const retards = calculerNombreRetards({ cultes: allCultes, cotisations: membreCotisations, dateAdhesion: membre.joinedAt });

  // Build history: link each cotisation to its culte
  const historique = membreCotisations
    .map(cot => {
      const culte = allCultes.find(e => e.id === cot.culteId);
      return { cotisation: cot, culte };
    })
    .filter(({ culte }) => culte !== undefined)
    .sort((a, b) => new Date(b.culte!.startDate).getTime() - new Date(a.culte!.startDate).getTime());

  const filteredHistory = historique.filter(({ cotisation, culte }) => {
    if (filter && cotisation.statut !== filter) return false;
    if (searchQuery && culte?.name?.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    return !searchQuery || true;
  });

  return (
    <div className="min-h-screen bg-[#121212]">
      <TopHeader title="Détail membre" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Header card */}
        <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: 'linear-gradient(135deg, #1246C8, #FF6B00)' }}>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">{membre.firstName[0]}{membre.lastName[0]}</span>
          </div>
          <h1 className="text-white font-bold text-xl">{membre.firstName} {membre.lastName}</h1>
          <p className="text-white/60 text-xs mt-1">Inscrit le {formatDate(membre.joinedAt)}</p>
          {membre.montantEnAvance > 0 && (
            <p className="text-white/80 text-sm mt-2">
              <CreditCard className="w-3 h-3 inline mr-1" />
              En avance: {formatCurrencyCompact(membre.montantEnAvance)} F
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-primary font-bold text-lg">{cultesPayes}/{totalCultes}</p>
            <p className="text-text-tertiary text-xs">Cultes payés</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-primary font-bold text-lg">{retards}</p>
            <p className="text-text-tertiary text-xs">Retards</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-primary font-bold text-lg">{formatCurrencyCompact(totalDons)}</p>
            <p className="text-text-tertiary text-xs">Total dons</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-text-tertiary mb-1">
            <span>Cadence</span>
            <span>{Math.round(cadence)}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: '#282828' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${cadence}%`, backgroundColor: cadence >= 80 ? '#10B981' : cadence >= 50 ? '#F59E0B' : '#EF4444' }}
            />
          </div>
        </div>

        {/* Historique filter */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text-primary font-bold text-lg">Historique de paiement</h2>
          <select
            value={filter ?? ''}
            onChange={(e) => setFilter(e.target.value ? e.target.value as CotisationStatut : null)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ backgroundColor: '#282828', color: '#B3B3B3', border: '1px solid #383838' }}
          >
            <option value="">Tous</option>
            <option value="PAYE">Payé</option>
            <option value="EN_AVANCE">En avance</option>
            <option value="NON_PAYE">Non payé</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>

        {/* History list */}
        <div className="space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ backgroundColor: '#212121' }}>
              <p className="text-text-tertiary text-sm">Aucun historique</p>
            </div>
          ) : (
            filteredHistory.map(({ cotisation, culte }) => {
              const don = Math.max(0, cotisation.montantPaye - cotisation.montantObligatoire);
              return (
                <div
                  key={cotisation.id}
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ backgroundColor: '#212121' }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (STATUT_COLORS[cotisation.statut] || '#808080') + '20' }}>
                    {cotisation.statut === 'PAYE' || cotisation.statut === 'EN_AVANCE' ? (
                      <CheckCircle className="w-5 h-5" style={{ color: STATUT_COLORS[cotisation.statut] }} />
                    ) : cotisation.statut === 'ABSENT' ? (
                      <Clock className="w-5 h-5" style={{ color: '#808080' }} />
                    ) : (
                      <Clock className="w-5 h-5" style={{ color: '#EF4444' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold text-sm truncate">{culte?.name || 'Culte'}</p>
                    <p className="text-text-tertiary text-xs">{formatDate(culte?.startDate || '')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-primary font-bold text-sm">{formatCurrencyCompact(cotisation.montantPaye)} F</p>
                    {don > 0 && (
                      <p className="text-[#3B82F6] text-xs">{formatCurrencyCompact(don)} F don</p>
                    )}
                    <p className="text-xs" style={{ color: STATUT_COLORS[cotisation.statut] }}>
                      {STATUT_LABELS[cotisation.statut]}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
```

---

# Tâche 9 : Modifier EventNew pour les Cultes

## Fichier: `src/pages/EventNew.tsx`

### Modifications à appliquer

**1. Dans les imports, ajouter `useLocation` :**
```typescript
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
```

**2. Déstructurer `members` et `createCulte` du store :**
```typescript
const { addEvent, members, createCulte } = useLocalStore();
```

**3. Ajouter un state pour le type d'événement :**
```typescript
  const location = useLocation();
  const defaultType = (location.state as any)?.defaultType === 'CULTE' ? 'CULTE' : 'EVENT';
  const [eventType, setEventType] = useState<'EVENT' | 'CULTE'>(defaultType);
  const [montantCotisation, setMontantCotisation] = useState('50');
```

**4. Ajouter l'UI de sélection du type (avant le champ `name`) :**
```typescript
        {/* Type selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setEventType('EVENT')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${eventType === 'EVENT' ? 'text-white' : 'text-text-tertiary'}`}
            style={eventType === 'EVENT' ? { backgroundColor: '#FF6B00' } : { backgroundColor: '#212121' }}
          >
            Événement
          </button>
          <button
            onClick={() => setEventType('CULTE')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${eventType === 'CULTE' ? 'text-white' : 'text-text-tertiary'}`}
            style={eventType === 'CULTE' ? { backgroundColor: '#FF6B00' } : { backgroundColor: '#212121' }}
          >
            Culte dominical
          </button>
        </div>

        {/* Cotisation settings (only for cultes) */}
        {eventType === 'CULTE' && (
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-xs font-medium mb-3 uppercase tracking-wider">Paramètres de cotisation</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-text-tertiary text-xs mb-1.5 block">Montant obligatoire (FCFA)</label>
                <input
                  type="number"
                  value={montantCotisation}
                  onChange={(e) => setMontantCotisation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                  style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
                  min="0"
                />
              </div>
            </div>
            <p className="text-text-tertiary text-xs mt-2">
              {members.filter(m => m.status === 'ACTIVE').length} membre{members.filter(m => m.status === 'ACTIVE').length !== 1 ? 's' : ''} actif{members.filter(m => m.status === 'ACTIVE').length !== 1 ? 's' : ''} — des cotisations seront créées automatiquement
            </p>
          </div>
        )}
```

**5. Modifier le `handleSubmit` :**
```typescript
  const handleSubmit = async () => {
    if (!name.trim()) { setError('Le nom est requis'); return; }
    setError('');

    if (eventType === 'CULTE') {
      const montantCotisationCents = Math.round(parseFloat(montantCotisation || '50') * 100);
      await createCulte({
        name: name.trim(),
        startDate,
        montantCotisationCents,
      });
      navigate('/cotisations');
      return;
    }

    // Flow existant pour les événements normaux
    await addEvent({
      orgId: 'org-1',
      name: name.trim(),
      description: description.trim(),
      startDate,
      endDate: endDate || null,
      status,
      budget: totalBudget,
      budgetItems,
      shoppingItems: [],
    });
    navigate('/events');
  };
```

---

# Tâche 10 : Router + Navigation

## Fichier: `src/App.tsx`

Ajouter les imports :
```typescript
import SaisieRapide from "./pages/SaisieRapide";
import CulteDetail from "./pages/CulteDetail";
import MembresEnAvance from "./pages/MembresEnAvance";
import MembreDetail from "./pages/MembreDetail";
import Cotisations from "./pages/Cotisations";
```

Ajouter les routes dans `<Routes>` :
```typescript
        {/* Cotisations (Kased integration) */}
        <Route path="/cotisations" element={<Cotisations />} />
        <Route path="/saisie-rapide/:id" element={<SaisieRapide />} />
        <Route path="/culte/:id" element={<CulteDetail />} />
        <Route path="/membres-en-avance" element={<MembresEnAvance />} />
        <Route path="/membre/:id" element={<MembreDetail />} />
```

## Fichier: `src/components/BottomNav.tsx`

**Modifier `NAV_ITEMS` pour remplacer "Événements" par "Cultes" :**
```typescript
const NAV_ITEMS = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: Landmark, label: 'Finances', path: '/finance' },
  { icon: Users, label: 'Groupes', path: '/groups' },
  { icon: CalendarPlus, label: 'Cultes', path: '/cotisations' },
];
```

**Modifier `MORE_ACTIONS` pour ajouter les liens cotisations :**
```typescript
const MORE_ACTIONS = [
  { icon: Wallet, label: 'Versement', path: '/versement' },
  { icon: BarChart3, label: 'Rapports', path: '/reports' },
  { icon: LineChart, label: 'Bilan', path: '/balance' },
  { icon: ClipboardList, label: 'Membres', path: '/members' },
  { icon: CalendarPlus, label: 'Membres en avance', path: '/membres-en-avance' },
  { icon: History, label: 'Historique', path: '/history' },
  { icon: Archive, label: 'Archives', path: '/archives' },
  { icon: ListChecks, label: 'Trace', path: '/trace' },
  { icon: FileText, label: 'Formulaires', path: '/forms' },
  { icon: Settings, label: 'Paramètres', path: '/settings' },
  { icon: HelpCircle, label: 'Aide', path: '/help' },
];
```

---

# Tâche 11 : Tester le flux complet

## Scénario de test

### Test 1 : Création d'un culte
```bash
npm run dev
```
1. Ouvrir l'app, aller dans l'onglet "Cultes"
2. Cliquer "Nouveau culte"
3. Remplir : nom "Culte du 7 septembre", date aujourd'hui
4. Vérifier : montant par défaut = 50 FCFA
5. Cliquer "Créer" → redirection vers `/cotisations`

### Test 2 : Saisie rapide
```bash
# Dans l'app
```
1. Cliquer sur le culte créé
2. Cliquer "Saisie rapide"
3. Voir le premier membre apparaître
4. Cliquer "Payé" → passage au membre suivant
5. Cliquer "Montant libre" → saisir 100 → confirmer
6. Vérifier : notification "Don de 50 FCFA enregistré"
7. Passer tous les membres → écran "Tout le monde a été traité"

### Test 3 : Paiement en avance
1. Créer un culte pour demain
2. En saisie rapide, choisir "Montant libre" = 50 FCFA
3. Changer la date de paiement à AUJOURD'HUI (avant le culte)
4. Confirmer
5. Vérifier : statut = "En avance", membre a 50 FCFA de montantEnAvance

### Test 4 : Page Membres en avance
1. Aller dans "Plus" → "Membres en avance"
2. Vérifier : le membre avec avance apparaît avec son montant

### Test 5 : Historique membre
1. Aller dans "Membres" → cliquer sur un membre
2. Vérifier : page détail avec stats + historique de tous les cultes

### Test 6 : Export
1. Aller dans "Finances"
2. Filtre par "Cotisation" (source)
3. Exporter en PDF/Excel
4. Vérifier : les cotisations apparaissent

---

## 6. Résumé des Tâches avec Efforts

| Tâche | Fichiers | Effort | Dépendances |
|---|---|---|---|
| 1. Types + Logique pure | `types/index.ts`, `lib/cotisation-logic.ts` | 30 min | — |
| 2. Migrations SQL | 4 fichiers `.sql` | 15 min | Tâche 1 |
| 3. Store Zustand | `store/useLocalStore.ts`, `lib/db.ts` | 1h30 | Tâche 1, 2 |
| 4. Page Cotisations | `pages/Cotisations.tsx` | 30 min | Tâche 3 |
| 5. Page SaisieRapide | `pages/SaisieRapide.tsx` | 1h | Tâche 3, 4 |
| 6. Page CulteDetail | `pages/CulteDetail.tsx` | 45 min | Tâche 3, 4 |
| 7. Page MembresEnAvance | `pages/MembresEnAvance.tsx` | 20 min | Tâche 3 |
| 8. Page MembreDetail | `pages/MembreDetail.tsx` | 45 min | Tâche 3, 5 |
| 9. Modifier EventNew | `pages/EventNew.tsx` | 20 min | Tâche 3 |
| 10. Router + Nav | `App.tsx`, `BottomNav.tsx` | 15 min | Tâche 4-8 |
| 11. Tests | Manuel | 30 min | Toutes |

**Total estimé : ~5 heures**

---

## 7. Points de Vigilance Critiques

### 7.1 Règle des 30 jours
```typescript
// À implémenter dans markCotisationPaid et markCotisationsAbsent
if (isPaiementVerrouille({ dateCulte, cotisationEstPaye })) {
  throw new Error('PAIEMENT_VERROUILLE');
}
```

### 7.2 Consommation de l'avance
```typescript
// À implémenter dans markCotisationPaid
if (membre.montantEnAvance >= montantPayeCents) {
  // Consomme l'avance, PAS de transaction créée
  membre.montantEnAvance -= montantPayeCents;
} else {
  // Crée une transaction normale
}
```

### 7.3 Validation montant minimum
```typescript
// À implémenter dans markCotisationPaid
if (montantPayeCents < cot.montantObligatoire) {
  throw new Error('MONTANT_INSUFFISANT');
}
```

### 7.4 Membres dans un culte
```typescript
// createCulte crée des cotisations pour TOUS les membres actifs
// au moment de la création. Les membres ajoutés après n'apparaîtront pas.
const members = get().members.filter(m => m.status === 'ACTIVE');
```
