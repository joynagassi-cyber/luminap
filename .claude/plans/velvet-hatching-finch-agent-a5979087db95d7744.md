# Plan d'implémentation — Socle multi-org + modèle scopé + flux invitation (A→B→C)

## Contexte

Trois vagues séquentielles avec garde-fous ; l'agent s'arrête si une vague échoue.

```
Vague 1  Socle multi-org (SQL exact, à coller)      → assert 1.6 = PORT DE BLOQUANT
Vague 2  Modèle agnostique (contrats + pseudo-SQL)   → assert 2.5
Vague 3  Flux invitation scopé (contrats + trigger)  → assert 3.5
```

**Adaptation à l'état réel du repo** (à signaler dans les livrables) :

1. **Collision de numéros** — les `0054_org_memberships.sql … 0059_extend_settle_trigger.sql` du cahier des charges sont déjà pris (0054-0057 = budgets P0, 0058-0060 = giving P0). Les migrations suivantes sont timestampées (`20260910…`/`20260911…`). **Nommage retenu** : `20260921000001_…` → `20260921000007_…` (date du jour), qui s'applique après `20260911000001`.
2. **Aucune table `role_grants` n'existe** (grep : 0 référence) → pas de migration de données ; les vagues 2-3 purement additives.
3. **`createInvitationPS` écrit déjà `'PENDING'`** (`src/lib/dataLayer.ts:1611`) alors que le CHECK PG n'autorise que `('ACTIVE','EXPIRED','REVOKED','EXHAUSTED')` → toute upload d'invitation échoue (le 23xxx flagué §8). **Correction en Vague 1.0** (pré-migration, non bloquant) : `'PENDING'` → `'ACTIVE'`, aligné sur la correction §8 de Vague 3.

## Pré-migration 1.0 (NON bloquant, mais à faire d'abord)

- `pnpm test` (327 verts) + `pnpm exec tsc --noEmit` (0 erreur) → baseline.
- Sauvegarde PowerSync : copier `supabase/.temp/lumina.db` (si présent) + noter l'état des 23 streams (`powersync/sync-config.yaml`).
- **Correction `createInvitationPS`** : `src/lib/dataLayer.ts:1611` — dans le template SQL de l'INSERT, remplacer `'PENDING'` par `'ACTIVE'` (1 seul mot ; `used_count` reste 0, `status` aligné PG+TS). Réexécuter `pnpm test` pour confirmer 0 régression.

## Vague 1 — Socle multi-org (CODE SQL EXACT)

### 1.1 `supabase/migrations/20260921000001_org_memberships.sql`

Table `org_memberships` multi-rôles + 2 index + RLS, **avec 2 ajustements techniques** par rapport au SQL du cahier (à coller tels quels dans les autres vagues, mais ici l'agent vérifie) :
- **`ON CONFLICT (user_id, org_id, role)` exige une contrainte UNIQUE correspondante** ; sinon erreur PG 3916 au backfill. Ajout de `UNIQUE (user_id, org_id, role, status)` (ou `UNIQUE (user_id, org_id, role)` + gestion du statut dans le trigger V3 ; l'agent tranche et documente le choix dans le fichier).
- **`om_grant_read`/`om_grant_write`** : la sou-select ne référence pas la ligne courante (pas de `USING (org_id IN …)`) → la policy SELECT ne peut pas corréler avec `org_memberships.org_id` ; l'agent corrige en corrélant par `org_memberships.org_id` :
  ```sql
  USING (EXISTS (SELECT 1 FROM org_admins a
                 WHERE a.admin_profile_id = auth.uid()
                   AND a.org_id = org_memberships.org_id
                   AND a.status = 'ACTIVE'));
  ```
- Colonne `org_id` en **TEXT** (cohérent avec `organizations.id TEXT` et `profiles.org_id TEXT` — jamais UUID FK ici ; invariants 6 & 8).

### 1.2 `supabase/migrations/20260921000002_backfill_org_memberships.sql`

Backfill 1:1 `profiles → org_memberships` (code SQL exact du cahier, `ON CONFLICT DO NOTHING`).

### 1.3 `supabase/migrations/20260921000003_extend_is_org_member.sql`

`CREATE OR REPLACE public.is_org_member(uid UUID, org_id TEXT)` **étendu** (jamais réécrit) :
- membership legacy (`profiles`)
- ∪ `org_memberships` ACTIVE/PENDING
- ∪ `org_admins` ACTIVE
- `SET search_path = public` (invariant 3 : ~50 policies RLS **non touchées** — seule cette fonction change).

### 1.4 `supabase/migrations/20260921000004_org_roles.sql`

Helper `public.org_roles(uid UUID, org_id TEXT) RETURNS TEXT[]` (liste des rôles actifs de l'user dans l'org, code SQL exact du cahier).

### 1.5 `powersync/sync-config.yaml` — stream `org_memberships` nouveau + double-scope `transactions`

- Ajout du stream `org_memberships` (`auto_subscribe: false`, query `user_id = auth.uid() OR org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())`).
- Double-scope du stream `transactions` comme modèle à répliquer aux autres (réversible tant que le backfill 1:1 est exact). Les 22 autres streams métier gardent leur query 1:1 jusqu'à l'Étape 2.
- **Attention invariants 6 & 8** : id implicite, colonnes UUID, pas de texte forcé, pas de minuscule.

### 1.6 Assert de validation Vague 1 (POINT DE BLOQUANT)

```sql
-- (a) Union identique avant/après pour tout user 1-org :
SELECT u.id,
       (SELECT count(*) FROM transactions t WHERE t.org_id = p.org_id) AS before,
       (SELECT count(*) FROM transactions t
        WHERE t.org_id IN (
          SELECT org_id FROM org_memberships m
          WHERE m.user_id = u.id AND m.status IN ('ACTIVE','PENDING')
          UNION
          SELECT org_id FROM profiles p2 WHERE p2.id = u.id
        )) AS after
FROM auth.users u JOIN profiles p ON p.id = u.id
WHERE u.email NOT LIKE 'pending-%@lumina.local';

-- (b) Aucun user ne voit MOINS de données (before = after pour les users legacy).
```

**L'agent s'ARRÊTE ici si l'assert échoue.**

**Critères de passage Vague 1** :
- [ ] 327 tests verts + 0 erreur TS
- [ ] Test `no-cross-imports` vert ; `canAccess` restant dans `federation/index.ts`
- [ ] `is_org_member` **étendu** (pas réécrit) ; ~50 policies RLS intactes
- [ ] Trigger `settle_invitation_claim` **non dupliqué** (Vague 3 : extension)
- [ ] `used_count` incrémenté **une seule fois** au trigger (jamais au client — la double-incrementation actuelle de `claimInvitationPS` sera corrigée en Vague 3)
- [ ] Convention PowerSync respectée (invariant 6)
- [ ] Matrice `PERMISSION_MATRIX` **inchangée** (invariant 7)
- [ ] Colonnes `scope_resource`/`scope_id` **sans CHECK** (invariant 8)
- [ ] `resource`/`action` **TEXT libres** (invariant 9)
- [ ] `subject_type='tag'` sujet de première classe (invariant 10)
- [ ] Assert 1.6(a) et (b) verts

**→ L'agent ne passe PAS à la Vague 2 sans validation 1.6.**

## Vague 2 — Modèle agnostique (contrats + pseudo-SQL)

### 2.1 `src/types/federation.ts` — types partagés

Fichier **nouveau** (n'existe pas) ; importé par `federation`, `security`, `resource` capabilities :

```typescript
export interface AccessScope { resource: string; id: string }
export interface Grant {
  id?: string;
  subjectType: 'user' | 'org_member' | 'group_member' | 'role' | 'tag';
  subjectId: string;
  resource: string;   // LIBRE — pas de CHECK, pas d'enum
  action: string;     // LIBRE — pas de CHECK, pas d'enum
  scope?: AccessScope;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
}
export interface Tag { id: string; orgId: string; name: string; description?: string; createdAt: string; updatedAt: string }
export interface TagAssignment { tagId: string; userId: string; orgId: string; assignedAt: string; assignedBy: string }
```

`@/types` (index.ts) reste non touché — les types vivent dans le sous-module.

### 2.2 `supabase/migrations/20260921000005_grants_tags.sql` — tables `grants` + `tags` + `tag_assignments`

Pseudo-SQL ; l'agent écrit le SQL final :
- `grants` : `id` UUID PK, `subject_type` (CHECK sur les 5 valeurs), `subject_id` TEXT, `resource` TEXT, `action` TEXT, `scope_resource`/`scope_id` TEXT optionnelles (NULL = global), `granted_by` UUID, `granted_at`, `revoked_at` TIMESTAMPTZ. Index sur `(subject_type, subject_id)` et `(scope_resource, scope_id)`. RLS activé.
- `tags` : `id` UUID, `org_id` TEXT, `name` TEXT, `description` TEXT, `created_at`/`updated_at`, `UNIQUE (org_id, name)`. Index `org_id`. RLS.
- `tag_assignments` : `id` UUID, `tag_id` UUID FK → `tags(id)`, `user_id` UUID FK → `auth.users(id)`, `org_id` TEXT, `assigned_at`, `assigned_by` UUID, `UNIQUE (tag_id, user_id, org_id)`. Index `user_id`. RLS.

**Contrat minimal** : seul le CHECK sur `subject_type` reste (garantit le typage des 5 sources de résolution). `resource`/`action`/`scope_*` libres — aucune migration pour ajouter une feature.

### 2.3 Formule d'union (5 sources de résolution)

```
canAccess(uid, orgId, resource, action, scope?) =
  1. GRANTS DIRECTS          (subject_type='user', subject_id=uid)
  2. GRANTS VIA TAG          (JOIN tag_assignments, subject_type='tag')
  3. GRANTS VIA MEMBERSHIP   (JOIN org_memberships, subject_type='org_member')
  4. RÔLES CANON             (PERMISSION_MATRIX[r] pour chaque r ∈ org_roles(uid, orgId) — inchangée)
  5. GRANTS VIA GROUPE       (JOIN group_memberships, subject_type='group_member')
```

- `grants` **n'ajoute pas, il étend** la matrice legacy (27 permissions, 14 rôles canon).
- Un grant scope NULL = global dans l'org ; scope non-NULL = restreint au `resource+id`.
- Cumulatif, aucun rôle ne retire les droits d'un autre.
- `ROLE_HIERARCHY` reste pour le tri UI + `hasHigherOrEqualRole` (dorénavant par org).

### 2.4 `canAccess` dans `src/capabilities/federation/index.ts`

Pseudo-contrat (l'agent implémente) :
```typescript
async canAccess(userId, orgId, resource, action, scope?): Promise<boolean>
```
1. Rôles canon (SQLite local via `org_roles` ou RPC)
2. Grants directs
3. Grants via tags
4. Grants via memberships (org + groupe)
5. Compatibilité scope (NULL = ok, sinon ressource+id doit couvrir)

**GARDE-FOU** : `canAccess` vit dans `federation/index.ts` (jamais sous-module), **ne JAMAIS importer de `security/index.ts`** ; types viennent de `@/types/federation.ts`.

### 2.5 RLS vs canAccess

- **Lecture des données (RLS)** : `is_org_member` + `group_memberships` (scoping org/groupe) — inchangé.
- **Vérification de permission** : `canAccess` — synchrone (UI, via store de rôles) + asynchrone (RPC serveur pour les actions dangereuses : approve/delete/invitation).

### 2.6 Assert de validation Vague 2

- `pnpm test` + `tsc` verts (0 régression).
- Test unitaire : user avec 2 rôles dans la même org → UNION des permissions.
- Test scopé : grant `{ scope: { resource: 'group', id: 'G1' } }` ne permet PAS `report:read` au niveau org.
- Test tag : user assigné au tag "bénévoles" avec grant `{ subjectType:'tag', subjectId: tagId, resource:'report', action:'read' }` → accès aux rapports même sans rôle canon qui le couvre.
- Test resource libre : grant `{ resource:'ai', action:'approve' }` fonctionne sans migration (pas de CHECK).
- **L'agent s'arrête si l'union diverge d'un des tests.**

## Vague 3 — Flux invitation scopé (contrats + pseudo-SQL)

### 3.1 `Invitation` granulaire (dans `src/types/federation.ts`)

```typescript
export interface Invitation {
  id: string; code: string; orgId: string;
  role: Role;
  scope?: AccessScope;            // LIBRE { resource, id }
  grants?: Grant[];              // grants agnostiques
  tags?: string[];               // tag_ids à assigner au claim
  targetScopeResource?: string;  // LIBRE
  targetScopeId?: string;
  maxUses: number; usedCount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED'; // PENDING RETIRÉ
  issuedBy: string; expiresAt?: string;
}
```

PENDING retiré (correction §8) : PENDING est un état de **claim**, pas d'invitation.

### 3.2 `supabase/migrations/20260921000006_extend_settle_trigger.sql`

Extension du trigger `settle_invitation_claim` **EXISTANT** (`supabase/migrations/20260909000003_invitation_confirmation_trigger.sql`) — **on n'ajoute pas de 2ᵉ trigger** (invariant 4 : l'idempotence reste dans UN seul trigger).

Dans la branche `CONFIRMED`, **APRÈS** le profil actif :
1. **`org_memberships`** (idempotent, `ON CONFLICT … DO UPDATE SET status='ACTIVE'`)
2. **`group_memberships`** si `target_scope_resource = 'group'` (COMBLE le gap §8 "transporté mais jamais matérialisé")
3. **Grants agnostiques** : `INSERT INTO grants (subject_type, subject_id, resource, action, scope_resource, scope_id, granted_by) … ON CONFLICT DO NOTHING` (parsage JSONB du payload)
4. **Tags** : `INSERT INTO tag_assignments (tag_id, user_id, org_id, assigned_by) … ON CONFLICT DO NOTHING`
5. **`used_count++`** : **UNE SEULE FOIS, ICI** (pas au client).

### 3.3 Les 3 corrections §8

1. Scope ciblé enfin matérialisé (`group_memberships` au claim si `target_scope_resource='group'`).
2. `used_count++` unique au trigger (fin du double-incrément client + trigger).
3. `status` invitation aligné TS+PG (PAS de PENDING sur l'invitation).

### 3.4 Limites connues (l'agent ne s'y engage PAS)

- **Bridge `auth.users`** optionnel (Vague 3.5, post) : socle multi-org + scopé marche avec un **profil PENDING** ; le bridge = edge-function `bridge-auth.ts` (idempotent sur l'email canonique, rattache les memberships au `auth.users.id` réel) — **jamais importé par les capabilities**.
- **Drift `AppSchema` vs 23 streams** (§3) : à trancher à part.
- **Dégradation RLS `invitations_insert`** de T3 (§2) : on ne la "répare" pas ligne à ligne — on la **remplace** par le gate scopé `canAccess` (UI + RPC pour actions dangereuses).

### 3.5 Assert de validation Vague 3

- Trigger rejoué 2× = **aucun doublon** (ON CONFLICT partout) — test d'idempotence.
- Claim `target_scope_resource='group'` → `group_memberships` ACTIVE créée (gap §8 comblé).
- `used_count` incrémente d'**exactement 1** par claim confirmé.
- Claim avec tags → `tag_assignments` créées, l'user a accès aux grants qui ciblent ce tag.
- 327 tests + les nouveaux tests multi-org/scopés verts.

## Scope de modification

### À TOUCHER

| Fichier | Vague |
|---------|-------|
| `supabase/migrations/20260921000001_org_memberships.sql` | 1 |
| `supabase/migrations/20260921000002_backfill_org_memberships.sql` | 1 |
| `supabase/migrations/20260921000003_extend_is_org_member.sql` | 1 |
| `supabase/migrations/20260921000004_org_roles.sql` | 1 |
| `powersync/sync-config.yaml` (+ `org_memberships`, `grants`, `tags`, `tag_assignments`) | 1, 2 |
| `src/types/federation.ts` (AccessScope, Grant, Tag, TagAssignment, Invitation) | 2, 3 |
| `src/capabilities/federation/index.ts` (`canAccess` 5 sources) | 2 |
| `src/lib/dataLayer.ts` (helpers `createGrantPS`, `listUserOrgs` multi-org, tag helpers) | 2, 3 |
| `supabase/migrations/20260921000005_grants_tags.sql` | 2 |
| `supabase/migrations/20260921000006_extend_settle_trigger.sql` | 3 |
| `supabase/functions/bridge-auth.ts` (OPTIONNEL, post-Vague-3) | 3.5 |

### NE PAS TOUCHER

- `src/lib/rbac.ts` (matrice + 14 rôles canon inchangés)
- `src/capabilities/security/index.ts` (façade, singleton)
- Les ~50 policies RLS (sauf le helper `is_org_member`, étendu pas réécrit)
- Le moteur d'idempotence du trigger `settle` (on ajoute des lignes, on ne réécrit pas)
- Le schéma `AppSchema` (l'écart 27/23 est un gap à trancher à part)
- `src/types/index.ts` (les nouveaux types vont dans `src/types/federation.ts`)

## Ordre d'exécution

```
1.0  Baseline tests/TS + sauvegarde + correction createInvitationPS 'PENDING'→'ACTIVE'
1.1  Migration 20260921000001 (org_memberships)
1.2  Migration 20260921000002 (backfill)
1.3  Migration 20260921000003 (is_org_member étendu)
1.4  Migration 20260921000004 (org_roles helper)
1.5  sync-config.yaml (stream org_memberships + double-scope transactions)
1.6  ASSERT → GO/NO-GO (si NO-GO : stop, on ne passe pas à la Vague 2)
2.1  src/types/federation.ts
2.2  Migration 20260921000005 (grants + tags + tag_assignments)
2.3  Formule d'union (documentation interne)
2.4  canAccess dans federation/index.ts
2.5  ASSERT tests + unitaires
3.1  Invitation granulaire dans src/types/federation.ts
3.2  Migration 20260921000006 (extension du trigger settle)
3.3  Les 3 corrections §8
3.5  ASSERT idempotence + nouveaux tests
```

## Livrables par vague

- Fichiers SQL / TS créés ou modifiés (voir Scope de modification)
- Tests nouveaux (unitaires Vague 2, idempotence Vague 3)
- Rapport de passage des asserts (1.6, 2.5, 3.5)
- Notes sur les adaptations au repo (numéro de migrations, CHECK UNIQUE, `createInvitationPS` PENDING→ACTIVE)
