# Lumina — Audit base de données (Phase 1)

Date : 2026-09-13
Projet Supabase (source de vérité) : `hhgovvrnalibhgpakswi`
Instance PowerSync : `6a9dd96302481fb31b945823`

## Périmètre

Lecture uniquement. La base est la source de vérité ; toute dérive est corrigée côté
application (`src/lib/powersync/schema.ts`, types `PS*`, services) ou documentée ici.

## 1. État du schéma (26+1 tables publiques)

Tables repérées (27) : `accounts, audit_entries, budget_lines, caisses, categories,
cotisations, custom_field_definitions, custom_field_values, event_budgets, events,
form_definitions, form_submissions, group_memberships, groups, invitation_claims,
invitations, members, notifications, org_admins, org_federation, org_units,
organizations, profiles, report_definitions, role_assignments, transactions, versements`.

### Colonnes clés vérifiées (app ↔ DB)

| Table | Vérif | Statut |
|---|---|---|
| `transactions` | `cotisation_id` présente, nullable, FK→`cotisations` ON DELETE SET NULL | ✅ aligné (l'app passe `cotisation_id: null`) |
| `transactions` | `created_by_id`/`approved_by_id` en `uuid` (FK→`auth.users`) | ⚠️ voir §5 (risque écriture cloud) |
| `events` | `budget_items`, `type` présents | ✅ aligné avec `PSEvent` |
| `categories` | `key, label_fr, type, org_id, created_at` | ✅ aligné avec `PSCategory` |
| `org_units` | **pas de `updated_at`** (seulement `created_at`) | ✅ aligné — `OrgUnit.updatedAt?` rendu optionnel côté app (enrichissement local uniquement) |
| `cotisations` | colonnes bas-casse en PG : `montantobligatoire`, `montantpaye`, `datepaiement`, `createdat`, `updatedat` | ⚠️ voir §4 (drift camelCase/bas-casse) |

### Drift cotisations (à surveiller — Phase 2/4)

La table `cotisations` a des colonnes **bas-casse** en PostgreSQL (`montantobligatoire`,
`createdat`…) car elles ont été créées sans guillemets (PG plie en minuscule). L'app
lit/écrit en camelCase dans `dataLayer.ts` / `PSCotisation` / `schema.ts`
(`montantObligatoire`, `createdAt`). En lecture **locale** (SQLite PowerSync) c'est
cohérent tant que la table locale est créée selon `schema.ts`. Le point d'attention est
le **complément des colonnes locales à partir du flux PowerSync** : si le service
PowerSync émet les colonnes au nom PG (bas-casse), les colonnes camelCase de l'app ne
seront pas renseignées. **À vérifier en Phase 2** lors du cycle de sync ; si c'est
cassé, corriger soit les noms de `schema.ts` en bas-casse, soit renommer les colonnes PG
en camelCase (SQL ci-dessous, à faire uniquement si confirmé).

```sql
-- Option B (si le flux PowerSync doit servir camelCase) — à n'exécuter qu'après confirmation
-- ALTER TABLE public.cotisations RENAME COLUMN montantobligatoire TO "montantObligatoire";
-- ALTER TABLE public.cotisations RENAME COLUMN montantpaye TO "montantPaye";
-- ALTER TABLE public.cotisations RENAME COLUMN datepaiement TO "datePaiement";
-- ALTER TABLE public.cotisations RENAME COLUMN createdat TO "createdAt";
-- ALTER TABLE public.cotisations RENAME COLUMN updatedat TO "updatedAt";
```

> Conformément au plan : pas de migration manuelle ; cette dérive est **documentée**
> et n'est corrigée qu'après preuve en Phase 2. Le sens retenu par défaut = corriger
> l'app en bas-casse (source de vérité = base).

## 2. RLS

- Les **26 tables** du schéma public ont le RLS activé, avec policies `PERMISSIVE`
  `FOR authenticated` basées sur `is_org_member(auth.uid(), org_id)` (4 op : SELECT /
  INSERT / UPDATE / DELETE), sauf `invitation_claims` (3) et `organizations` (7).
- `is_org_member(uid, org_id)` : SECURITY DEFINER, vrai si profil actif dans l'org OU
  org_admins ACTIVE.
- **Modèle retenu** = auth Supabase (email/OTP/Google) + RLS `authenticated`.
  Les docs « RLS open / pas d'auth » sont obsolètes : la base est bien en mode auth.

### Points d'attention RLS

- **GRANTs complets sur `anon`** (SELECT/INSERT/UPDATE/DELETE/TRUNCATE…) sur toutes les
  tables. Inutiles car les policies sont `FOR authenticated` uniquement → `anon` ne voit
  aucune ligne (RLS par défaut = refus). **Hygiène** : à resserer à `anon` si jamais des
  politiques `FOR anon` sont ajoutées. Aucune fuite de données constatée.
- `powersync_role` : **SELECT uniquement** sur les 27 tables → le download PowerSync
  fonctionne ; les écritures cloud passent par le client Supabase authentifié
  (`uploadData`), conforme au modèle `authenticated`.

## 3. Realtime / réplication

- Publication `powersync` : **FOR ALL TABLES** (stream PowerSync, `powersync_role`).
- Publication `supabase_realtime` : tables explicites
  `audit_entries, categories, notifications, org_units, profiles, role_assignments, transactions`
  → flux `postgres_changes` (notifications + transactions). ✅
- `supabase_realtime_messages_publication` : tables système `realtime.*` (infrastructure).

## 4. Triggers (public, tous `O`=activés)

| Déclencheur | Table | Fonction | Rôle |
|---|---|---|---|
| `on_transaction_pending` | transactions (AFTER INSERT, status=PENDING) | `create_pending_transaction_notification` | notification PENDING |
| `on_transaction_approved` | transactions (AFTER UPDATE, status=APPROVED) | `create_approved_transaction_notification` | notification APPROVED |
| `on_transaction_change` | transactions (AFTER INSERT/UPDATE/DELETE) | `notify_transaction_change` | notification d'état |
| `settle_claim_on_insert` | invitation_claims (AFTER INSERT) | `tg_settle_claim` | settlement d'invitation |
| `settle_claims_on_invitation` | invitations | `tg_settle_claims_on_invitation` | settlement inversé |
| `trg_org_admins_audit` | org_admins | `log_org_admin_change` | audit |
| `trg_org_admins_updated_at` | org_admins | `update_updated_at_column` | updated_at |
| `trg_organizations_updated_at` | organizations | `update_updated_at_column` | updated_at |

> ⚠️ Les fonctions `create_*_transaction_notification` **hardcodent `org_id='org-1'`**
> (pas `NEW.org_id`). Multi-org : à corriger si l'org cible n'est pas org-1. Documenté
> comme limitation connue ; les flux Phase 4 se font sur org-1 donc inoffensif pour l'instant.

## 5. Données seed

- `organizations` = 3 : `org-central` (CENTRAL), `org-1` (CHURCH), `e2e-auth-org-1`
  (résidu de test e2e-auth — **à nettoyer**).
- `org-1` : **9 catégories** ✅ (conforme mockData), 11 org_units, 11 caisses
  (le mock attend 5 groupes / 6 caisses — l'écart vient de runs répétés ; pas un bug de
  schéma). `e2e-auth-org-1` : 0 seed.
- `transactions` = 0 (vide au boot — normal).
- `org_admins` = 0 → aucun admin seedé ; l'accès admin d'org-1 passe par `profiles`
  (8 lignes) via `is_org_member`.

## 6. Risque identifié (écriture cloud — Phase 2/4)

`transactions.created_by_id` / `approved_by_id` sont en **`uuid`** (FK→`auth.users`).
L'app écrit des identifiants de session type texte (`"local-user"`,
`localStorage["lumina-session"]`) ou `getOrganizationId()`-like. À l'upload PowerSync
vers Supabase, une valeur non-UUID échouerait la contrainte de type/foreign key.
**À trancher en Phase 2** : soit générer de vrais UUID de profile, soit rendre les
colonnes `text`. Documenté ici ; ne pas casser le flow offline.

## 7. Config PowerSync

- `powersync/service.yaml` pointe encore l'ancien projet `vvcdmqpbwfyhkzalwdli`
  (stale). `powersync/service-fetched.yaml` + la doc `POWERSYNC_READY.md` pointent le
  projet courant `hhgovvrnalibhgpakswi`. Le service cloud réel (`6a9dd963…`) est la
  référence ; le `service.yaml` est à resynchroniser (hors périmètre de stabilisation
  fonctionnelle — credentials/CLI externes).

## G1 — Verdict

- Schéma app↔DB : aligné sur les tables snake_case ; **1 dérive documentée**
  (naming cotisations) + **1 risque type** (uuid created_by/approved_by).
- RLS / Realtime / Triggers : cohérents avec le modèle auth retenu.
- Rapport écrit ✅.

Passage à la Phase 2 : le cycle de sync doit confirmer ou infirmer la dérive cotisations
et le risque uuid avant d'activer les écritures cloud.
