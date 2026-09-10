# Administration centrale multi-organisation — Plan

## Goal
Permettre à un admin central (rôle explicite + grants) d'administrer plusieurs organisations depuis un dashboard dédié, avec contexte organisationnel fiable, invitations offline réutilisées, RLS étendues et synchronisation PowerSync — sans créer de second modèle organisationnel.

## Modèle canonique (issu de l'inspection, ne pas réinventer)

| Entité | État réel | Classe | Décision |
|---|---|---|---|
| Organization | **Aucune table** — `org_id TEXT` implicite (`'org-1'` par défaut) sur toutes les tables ; `profiles.org_id` = membership user↔org ; `org_units` = sous-unités (≠ org) | MANQUANT | **Créer 1 table registre `organizations`** (source de vérité des états PENDING/ACTIVE/SUSPENDED/ARCHIVED). `org_units` conservé (groupe de sous-structure), `groups` conservé (métier). |
| User | `auth.users` + `profiles` (id=auth UUID, `role`, `org_id`) | CANONIQUE | Conserver. Rôle `CENTRAL_ADMIN` ajouté au CHECK `role`. |
| Member | `members` (personne physique, peut exister sans compte) | CANONIQUE | Conserver. Member ≠ User — l'invitation crée un User puis un Membership. |
| Membership | Via `profiles.org_id` (user→org) + `group_memberships` (user/membre→groupe) | CANONIQUE | Étendre `profiles` d'`org_admins` ? Non : **nouvelle table `org_admins`** (grant explicite admin central→org) — c'est le seul lien « central », réutilisable, pas un 2e système de membership. |
| Role | `profiles.role` (CHECK existant) + `role_assignments` (legacy per-session) | CANONIQUE / OBSOLÈTE | Rôle dans `profiles` est le canon ; `role_assignments` conservé (obsolète, non supprimé — impact non démontré). |
| Invitation | Sprint 27 : `invitations` + `invitation_claims` + trigger `settle_invitation_claim` + `InvitationService` + transports QR/code | CANONIQUE | **Réutiliser** ; ajouter transport « fichier JSON » ; scoping central-admin. |
| Audit | `audit_entries` (qui/quoi/quand/avant/après, enrichi en 0002) | CANONIQUE | Ajouter événements admin (`ORG_SUSPENDED`, `ADMIN_ASSIGNED`…). Pas de 2e système. |
| PowerSync | `AppSchema` = 24 tables + `invitations`/`invitation_claims` | CANONIQUE | Ajouter `organizations` + `org_admins`. |
| Contexte org | `src/lib/orgContext.ts` : variable module-level (`setOrganizationId`), consommée par ~10 modules capabilities | À MIGRER | Conserver l'API (peu d'impact), mais **l'alimentation devient un service** qui vérifie le grant avant d'activer le contexte. |

Règle de respectée : aucune donnée métier ne bouge « parce que le frontend l'autorise » — chaque nouveau pouvoir admin est couvert par RLS serveur (§ ci-dessous) ET par vérification de grant côté app.

## Tasks

- [ ] **T1 — Migration registre** `supabase/migrations/<ts>_create_organizations_registry.sql` : `organizations(id TEXT PK, name TEXT, type TEXT CHECK ('CENTRAL','CHURCH','SCHOOL','ENTERPRISE'), status CHECK ('PENDING','ACTIVE','SUSPENDED','ARCHIVED'), suspended_at/by, archived_at/by/reason, created_at, updated_at)` + seed de la centrale (`'org-central'`, type CENTRAL, ACTIVE) et backfill de `'org-1'` (ACTIVE) + FK **optionnelle** (pas de `REFERENCES` sur les `org_id` existants : backfill d'abord, FK à l'étape 2 si propre) + index + RLS (lecture : admin central gérant l'org, ou membre de l'org ; écriture : admin central gérant l'org, jamais via frontend simple). **Verify** : `supabase-lumina` `apply_migration` OK ; `SELECT` seed OK ; backfill n'a pas cassé les lignes existantes.
- [ ] **T2 — Migration grants admin central** : `org_admins(id UUID, admin_profile_id UUID→profiles, org_id TEXT, status CHECK ('ACTIVE','REVOKED'), granted_by UUID, created_at, UNIQUE(admin_profile_id, org_id))` + trigger d'audit (`ADMIN_ASSIGNED`/`ADMIN_REMOVED` dans `audit_entries`) + RLS (l'admin voit ses propres grants, la centrale voit ceux de son scope). **Verify** : migration appliquée ; double grant impossible (UNIQUE).
- [ ] **T3 — RLS étendue (sécurité)** : ajouter la branche « admin central gérant l'org » dans les policies de lecture des tables métier (`transactions`, `members`, `groups`, `events`, `caisses`/`accounts`, `audit_entries`, `invitations`…) : `OR auth.uid() IN (SELECT admin_profile_id FROM org_admins WHERE org_id = X.org_id AND status='ACTIVE')`. Ne PAS toucher la branche « même org » existante. **Verify** : tests SQL via supabase-lumina — (a) user org A ne voit rien de org B ; (b) central admin avec grant B voit B ; (c) sans grant : zéro ligne ; (d) `org_admins` REVOKED ⇒ accès retiré.
- [ ] **T4 — Service contexte** `src/capabilities/organization/context.ts` (ou `src/lib/organization-context.ts` si plus proche du pattern existant) : `enterOrganization(orgId)` (vérifie le grant local PowerSync sur `org_admins`, sinon refuse), `exitToCentral()`, `currentContext()` (CENTRAL | {orgId}), alimentant `setOrganizationId` de `orgContext.ts`. Les hooks `useOrganizationContext` (dataLayer) exposent l'état React fiable. **Verify** : test unitaire — enter sans grant = throw ; enter avec grant = `getOrganizationId()` === orgId ; exit = centrale.
- [ ] **T5 — PowerSync + dataLayer** : `src/lib/powersync/schema.ts` ← `organizations` + `org_admins` (colonnes exactes = T1/T2) ; dataLayer : `useOrganizations`, `useOrgAdmins`, `useOrganizationContext`, écritures `setOrganizationStatusPS` (SUSPEND/REACTIVATE/ARCHIVE), `grantOrgAdminPS`, `revokeOrgAdminPS`, `createOrganizationPS`. **Verify** : build ; hook renvoie les lignes seedées.
- [ ] **T6 — Capability + audit** : étendre `src/capabilities/organization` avec les actions centrales (suspend/reactivate/archive, assign/revoke admin, stats par statut, activité récente via `audit_entries`) — chaque action écrit `audit_entries` (qui/quoi/quand/org/avant/après/pourquoi). **Verify** : tests unitaires capability (pattern existant `__tests__`).
- [ ] **T7 — Dashboard central (UI)** : page `src/pages/CentralAdmin.tsx` (IonPage, style sombre existant, distinct visuellement — bandeau « ADMINISTRATION CENTRALE ») : KPIs (total, actives, en attente, suspendues, archivées, invitations en attente, admins), liste des organisations (nom/statut/membres/groupes/dernière activité/admins) + actions contextuelles (Ouvrir → T4, Suspendre, Réactiver, Archiver, Inviter, Historique). Routes : `/admin` (vue d'ensemble), `/admin/organizations/:id`. **Verify** : build Capacitor ; navigation manuelle documentée dans le registre.
- [ ] **T8 — Contexte dans l'app métier (UI)** : quand `currentContext() = org X`, bandeau « Organisation : X » + action « Retour à l'administration centrale » dans `TopHeader` ; entrée du dashboard central uniquement pour `role === 'CENTRAL_ADMIN'` (Settings). **Verify** : le bandeau et le retour fonctionnent ; un non-central n'y a pas accès (vérif. UI + RLS).
- [ ] **T9 — Invitations : transport fichier + scope central** : réutiliser `InvitationService` ; ajouter export/import JSON (fichier d'invitation, 4ᵉ transport, même moteur) ; depuis le dashboard central, émettre une invitation **ciblée sur org A** (l'admin central, si grant actif, agit avec `issued_by` = lui-même, `org_id` = A). Idempotence garantie par le trigger existant (aucun doublon membership) — **ne pas la réimplémenter**. **Verify** : test double-acceptation (déjà couvert par le trigger : rejoue), test création from-central pour org A, test import de fichier.
- [ ] **T10 — Tests finaux + registre** : pack de tests Vitest (séparation cross-org, grant, cycle de vie org, contexte, invitations offline/online, aucun doublon) + `tsc --noEmit` + `vitest run` + `CAPACITOR_BUILD=true vite build` + registre `STATUS/PLAN/CHANGES/TESTS/RISKS/VALIDATION` dans le commit. **Verify** : tout vert ; aucun `useLocalStore` réintroduit ; aucune table `organizations` concurrente.

Ordre = phases 0–12 de la spec (T1–T3 = données/sécurité, T4–T6 = logique, T7–T9 = UI/réutilisation, T10 = validation). Réordonner uniquement si T3 révèle une incohérence RLS existante → s'arrêter, documenter, corriger avant T4 (règle de stop).

## Done When
- [ ] Les 10 tasks cochées et chaque « Verify » exécuté
- [ ] RLS démontrée en base (pas seulement dans le code) : les 4 cas de T3 + user A ⇏ B
- [ ] 1 central admin + grants sur 2 orgs : dashboard utilisable offline, resync au retour réseau
- [ ] Invitation créée hors-ligne par l'admin central pour org A ⇒ acceptée hors-ligne ⇒ confirmé par le trigger au retour de connexion, **1 seul membership**
- [ ] Compilation + tests + build Capacitor verts, rapport final (STATUS…CERTIFICATION)

## Notes
- **Risque principal T1** : les `org_id` existants sont des TEXT sans FK ; le seed/backfill de `organizations` doit se faire **avant** toute FK pour ne pas casser l'existant. Si le backfill est ambigu (org_id orphelins), s'arrêter et lister les valeurs distinctes.
- **Sur-architecte interdit** : pas de « central scope engine » — 2 tables (`organizations`, `org_admins`) + 1 service contexte, tout le reste réutilise capabilities/RLS/PowerSync existants.
- `role_assignments` (0011) : obsolète mais conservé tant que son impact n'est pas démontré (à vérifier dans T10 : si rien ne l'écrit plus depuis le signup, le marquer deprecated).
- Le fichier du plan vit ici (racine du projet) ; ne pas dupliquer le contenu dans `.claude/`.
