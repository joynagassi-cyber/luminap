# Lumina — Product Requirements Document (PRD)

> **Version**: 1.0 · **Date**: 2026-09-29 · **Source**: analyse exhaustive du dépôt `dyad-apps/lumina`
>
> Lumina est une application de **gestion financière multi-organisation** (églises, écoles, ONG, entreprises) :
> caisses, transactions, événements & cultes, cotisations, groupes & membres, budgets, dons, formulaires dynamiques,
> rapports, archives/documents, invitations (QR/fichier), fédération multi-org, administration centrale, audit,
> notifications, le tout **offline-first** (PowerSync/SQLite + Supabase) avec UI React + Ionic (web + Android/Capacitor).

---

## 1. Résumé exécutif

| | |
|---|---|
| **Problème** | Les associations (églises, écoles, ONG) gèrent leurs finances sur papier/Excel : perte de traçabilité, pas de contrôle d'accès, pas de reporting, pas de travail hors-ligne (contexte FAFA — faible connectivité). |
| **Solution** | Application mobile/web locale d'abord : chaque mutation est écrite dans une base SQLite locale (PowerSync) et synchronisée avec Supabase au retour du réseau. RBAC 14 rôles + grants agnostiques + tags. Multi-organisation (fédération parent/enfant + admin central). |
| **Utilisateurs** | 1) **Créateur d'organisation** (pasteur principal, directeur…) — fonde l'org, configure thèmes/features/rôles. 2) **Membre invité** (trésorier, comptable, groupe…) — rejoint par invitation QR/code/fichier avec rôle + scope. 3) **Admin central** — cycle de vie des orgs (suspendre/archiver), grants `org_admins`, fédération. 4) **Bénévole/membre** — lecture. |
| **Valeur clé** | Hors-ligne total (claim d'invitation, transactions, cotisations), audit immuable, « réel » toujours dérivé des transactions APPROVED (pas de double-saisie), monétisation XOF (FCFA), export PDF/Excel/CSV. |
| **Stack** | React 19 + TS, Ionic 9, Capacitor 6 (Android), Zustand, TanStack Query, Supabase (Postgres + RLS + Storage + Auth + 3 edge functions), PowerSync (20+ streams), OneSignal (push), Vitest (40 fichiers), Playwright + Cypress + Maestro (mobile). |

---

## 2. Contexte & contraintes

- **Monnaie** : XOF/FCFA par défaut ; montants stockés en **cents (BIGINT)** partout ; helper `formatCentsToFCFA`.
- **Offline-first obligatoire** : aucune feature ne peut exiger le réseau. Écritures locales PowerSync d'abord, queue de sync au retour ; les claims d'invitation sont tranchées par un trigger serveur idempotent (`settle_invitation_claim`).
- **Multi-org** : toute table métier porte `org_id TEXT DEFAULT 'org-1'` (legacy seed). Le scoping RLS + PowerSync garantit qu'un user ne voit que ses orgs (`org_memberships ∪ profiles` double-scope réversible).
- **Audit « NeverBreak #6 »** : **toute** mutation produit une entrée `audit_entries` (before/after, acteur, rôle au moment de l'action).
- **Sécurité** : RLS FORCE sur chaque table business ; helpers `is_org_member` / `handle_new_user` en **SECURITY DEFINER** (fix récursion 54001 + 500 signup, migrations 20260928…) ; les policies permissives `USING (true)` restent limitées aux registres globaux serveurs.
- **Capacités (capabilities)** : 12 modules `src/capabilities/*` (identity, organization, security, workflow, lifecycle, relationship, resource, policy, notification, federation, invitation, budgets/giving/cotisation) — **interdiction d'imports croisés** (test `no-cross-imports`).

---

## 3. Personas & rôles

| Persona | Rôle(s) | Accès typique |
|---|---|---|
| Pasteur principal / fondateur | `PASTEUR_PRINCIPAL` (rang 100) | Tout : 23 permissions, admin:settings/roles |
| Ancien / Trésorier | `ANCIEN`, `TREASURIER` | Finance lourde : create/update/approve/reject transactions, versements, cotisations, invitations:create |
| Comptable | `COMPTABLE` | Lecture finance + rapports ; saisie limitée |
| Secrétaire | `SECRETAIRE` | Membres, événements, cotisations |
| Responsable groupe | `RESPONSABLE_GROUPE` | Sa caisse de groupe + versements vers caisse principale |
| Bénévole / Membre | `BENEVOLE`, `MEMBRE` | Lecture (`transaction:read`, `event:read`) |
| Admin central | grant `org_admins` ACTIVE (rôle `CENTRAL_ADMIN` UI) | `/admin*` : suspendre/archiver/reactiver les orgs, assigner/révover des admins, fédération |

**Hiérarchie numérique** (`ROLE_HIERARCHY`) : PASTEUR_PRINCIPAL=100 > PASTEUR_ASSOCIE > PASTEUR_JEUNESSE > ANCIEN > DIACRE > RESPONSABLE_DEPARTEMENT > TREASURIER > TREASURIER_ADJOINT > SECRETAIRE > SECRETAIRE_ADJOINT > COMPTABLE > RESPONSABLE_GROUPE > BENEVOLE > MEMBRE.

**27 permissions** au format `resource:action` (voir §9). Le RBAC canonique n'est pas encore activé (stub mono-église `checkPermission()` → true) ; la contrainte effective est portée par **RLS serveur** + `federation.canAccess` (grants + tags, vague 2.4).

---

## 4. Architecture applicative (vue d'ensemble)

```
src/
├── main.tsx                # initPowerSync() AVANT le montage React (fire-and-forget)
├── App.tsx                 # IonicApp + providers + nav
├── AppRouter.tsx           # monitor de session auth (sans routing)
├── ionic/
│   ├── routing.tsx         # registry (re-export)
│   └── routes/            # 11 sections (auth, core, finance, groups, events, members, reports, forms, invitations, admin, system) → 65 routes lazy
├── pages/                  # 50+ pages (une par feature, lazy-loaded)
├── capabilities/           # 12 modules métier testables (327+ tests)
├── store/useLocalStore.ts  # Zustand store legacy (13 pages migrées vers PowerSync)
├── lib/
│   ├── auth.ts             # Supabase Auth (PKCE, Google OAuth, OneSignal)
│   ├── dataLayer.ts        # hooks useXxx() → PowerSync d'abord, fallback cache local
│   ├── powersync/          # AppSchema (38 tables), SupabaseConnector, schemas invitation/multi-org/org-admin
│   ├── rbac.ts, audit.ts, cotisation-logic.ts, versement-service.ts,
│   ├── transaction-service.ts, event-service.ts, group-service.ts, member-service.ts,
│   ├── reporting.ts (QueryBuilder + AggregationEngine), formSystem.ts, export.ts (PDF/Excel/CSV)
│   ├── onesignal.ts, offline/{strategy,conflicts}.ts
├── server/                 # Nitro : middleware Autonoma + /api (test data)
supabase/
├── migrations/            # 95+ migrations (0000 → 20260928)
└── functions/             # signup, login, create_org (Deno, service_role gates)
powersync/sync-config.yaml # édition 3, 20+ streams
```

**Données** : PostgreSQL (Supabase) = SSoT cloud · SQLite PowerSync = SSoT locale · RLS = SSoT sécurité. Les **fichiers de migration sont le SSoT du schéma**, pas la base live.

---

## 5. Modélisation des données (38 tables)

| Domaine | Tables | Colonnes clés |
|---|---|---|
| **Identité** | `profiles` | email, first/last_name, role, org_id, status (PENDING/ACTIVE/DISABLED) |
|  | `members` | first/last_name, phone, email, status, joined_at, archived_*, **total_dons, montant_en_avance** |
|  | `org_memberships` (multi-org) | user_id, org_id, role, is_primary, status, joined/left_at |
|  | `grants` (agnostique) | subject_type (user/org_member/group_member/role/tag), subject_id, resource, action, scope_resource/id, granted_by/at, revoked_at |
|  | `tags` / `tag_assignments` | org_id, name, description ; (tag_id, user_id, assigned_at/by) |
| **Finance** | `transactions` | type (INCOME/EXPENSE), amount (cents), description, date, status (DRAFT/PENDING/APPROVED/REJECTED), category_id, event_id, source (CAISSE/COTISATION/PERSONNE/AUTRE), person_name, source_caisse_id, versement_id, reversal_of_id, cotisation_id, version, created/approved_by_id |
|  | `categories` | key, label_fr, type, org_id |
|  | `caisses` (legacy) / `accounts` (canon) | name, type MAIN/GROUP (legacy) ; owner_type ORGANIZATION/GROUP, owner_id, currency (XOF) |
|  | `versements` | from/to_account_id, amount_cents, date, status DRAFT→APPROVED, created/approved_by |
| **Événements** | `events` | name, start/end_date, status (PLANIFIED/ONGOING/COMPLETED/CANCELLED), **type EVENT/CULTE**, budget, budget_items JSON, description, active |
|  | `event_budgets` / `budget_lines` | event_id, currency, revised_at/by ; (event_budget_id, category_id, planned/actual_amount_cents) |
|  | `org_budgets` / `org_budget_lines` | fiscal_year, period (ANNUAL/Q1-Q4), cost_center_id/label, total_budgeted_cents, status, currency ; (budget_id, category_id, planned_amount_cents) |
| **Cotisations** | `cotisations` | **culte_id × membre_id**, statut (NON_PAYE/PAYE/ABSENT/EN_AVANCE), montantobligatoire, montantpaye, datepaiement, notes ⚠️ colonnes bas-cas legacy en PG — le schéma PowerSync DOIT porter ces noms exacts |
| **Groupes** | `groups` | name, parent_group_id (arborescence), responsable_member_id, status, archived_* |
|  | `group_memberships` | member_id, group_id, role_in_group (MEMBRE/RESPONSABLE), joined/left_at |
|  | `org_units` (legacy) | name, type, description, is_active |
| **Dons** | `giving_donors` | full_name, contact, member_id, tax_receipt_enabled, notes |
|  | `giving_campaigns` | name, purpose, fund, target_amount_cents, start/end_date, status |
|  | `pledges` | campaign_id, donor_id, pledged_amount_cents, schedule, amount_per_period_cents, période, status |
|  | `tax_receipts` | donor_id, year, receipt_no, total_amount_cents, issued_at (unique org/donor/year) |
|  | `transaction_giving` | transaction_id, donor_id, campaign_id, recorded_at (unique org/transaction) — **liaison fiscale** |
| **Formulaires** | `form_definitions` | key, name, version, target_entity_type, fields JSON, status DRAFT/PUBLISHED/ARCHIVED |
|  | `form_submissions` | form_definition_id, form_version, data JSON, entity_type/id, status SUBMITTED/PROCESSED/REJECTED, submitted_by/at |
|  | `custom_field_definitions` / `custom_field_values` | (org_id, entity_type, field_name/label/type, options, order) ; (entity_type, entity_id, field_name, value JSONB) — flexibilité sans migration |
| **Invitations** | `invitations` | code `LUM-XXXXXX`, target_role, target_scope_type ORG/GROUP (+B.3 scope libre resource/id), target_group/member_id, issued_by/at, expires_at, max_uses, used_count, status (ACTIVE/EXPIRED/REVOKED/EXHAUSTED), **grants_payload, tags_payload JSON** |
|  | `invitation_claims` | invitation_id, claimed_by_device_id, resulting_user_id, status (PENDING_SYNC/CONFIRMED/REJECTED_DUPLICATE/EXPIRED/EXHAUSTED/REVOKED), reject_reason |
| **Multi-org** | `organizations` | name, type (CENTRAL/CHURCH/SCHOOL/ENTERPRISE), status (PENDING/ACTIVE/SUSPENDED/ARCHIVED), **parent_org_id** (fédération), suspended/archived_* |
|  | `org_admins` | admin_profile_id, org_id, status, granted_by |
| **Transversal** | `notifications` | action_type (TRANSACTION_PENDING/APPROVED, BUDGET_EXCEEDED…), title, message, is_read, source_transaction_id |
|  | `audit_entries` | action (CREATE/UPDATE/DELETE/APPROVE/REJECT/ARCHIVE/RESTORE/SUBMIT/CLOSE/REVISE/REVOKES/CLAIM/STATUS_CHANGE), entity_type/id, before/after_state JSON, actor_role_at_time, comment, transaction_id ; index composite (20260922…) |
|  | `report_definitions` | kind (FINANCE/FEATURE/AUDIT), data_source, dimensions/metrics/filters/group_by JSON, is_template |
|  | `documents` | title, purpose, bucket (logos PUBLIC / archives / expense_proofs PRIVÉ), file_path/size, mime_type, entity_type/id, status ACTIVE/ARCHIVED/DELETED (soft-delete via status) |
|  | `config` | key, value (appConfig : churchName, etc.) |

**Invariant PowerSync** : `id` n'est JAMAIS déclaré explicitement dans `src/lib/powersync/*.ts` (ajouté comme pkey par PowerSync ; le déclarer corrompt la sync).

---

## 6. Parcours utilisateur (flows)

### 6.1 Boot & Splash
`/splash` : 2 phases statiques (logo 1,2 s → illustration 1,5 s) + gating : `needsOnboarding()` ? `/onboarding` : `/dashboard` ; si données non prêtes après ~2,7 s → spinner. `initPowerSync()` a déjà été lancé dans `main.tsx` (avant React) ; échec → app reste **offline** (fallback cache, jamais de crash blanc).

### 6.2 Authentification (`/auth`, `/auth/callback`, `/sessions`)
- **Email/password** : signup (email validé, password ≥ 8, prénom/nom) → `supabase.auth.signUp` (PKCE) → trigger **`handle_new_user` (SECURITY DEFINER)** insère `profiles` (rôle défaut MEMBRE, org-1, status ACTIVE, upsert ON CONFLICT) ; confirmation email côté serveur via edge function `signup` si service_role dispo.
- **Google OAuth** : PKCE, redirect `/auth/callback` (web) ou `lumina://auth/callback` (Android intent-filter) ; `isBrandNewUser` (fenêtre 5 min sur `user.created_at`) → force onboarding pour un 1er compte Google.
- **« Mes comptes » (`/sessions`)** : hub de persistance de session — les comptes restent après déconnexion ; un clic re-ouvre la session (lecture `sb-<ref>-auth-token` de localStorage pour afficher le bouton).
- Session validée toutes les 60 s ; renouvellement 5 min avant expiration.

### 6.3 Onboarding (`/onboarding`)
- **8 écrans de présentation** (welcome → dashboard → transactions → caisses & groupes → événements & budgets → rapports → marque org → features) + **écran 9 « Votre parcours »** avec 2 branches, état **persisté en localStorage** (reprise au reload) :
  - **Créateur** → `/org-setup` : nom (≥ 2), sigle, **type d'org avec templates** (Eglise / Ecole / Entreprise — chacun avec ses rôles + features par défaut), thème (`LUMINA_THEMES`), features activées (cotisations, groupes, événements, caisses, rapports, formulaires, invitations, archives), rôle → `updateConfig({churchName})` + `selectRole` + `completeOnboarding` → `/dashboard`. Le bootstrap **serveur** d'org (edge `create_org` + seed `org_admins`) est séparé (admin central).
  - **Membre** → `/invitation/claim`.
- Nouveau compte (email ou Google) → onboarding **toujours** ; compte existant → seulement si non finalisé sur ce navigateur.

### 6.4 Invitation (émettre / réclamer)
**Émission** (`/invitation/emit`, permission `invitation:create` — PASTEUR_PRINCIPAL/ANCIEN/TREASURIER par RLS) :
rôle cible + scope (ORG/GROUP/grant libre) + grants/tags → `createInvitation` (INSERT PowerSync + audit CREATE ; code `LUM-XXXXXX` généré, alphabet sans ambiguïté, défaut **expiration 7 jours, max_uses 1**) → affichage **QR code** (`QRCodeSVG`, payload JSON v2) + code + export fichier `.json` (`exportInvitationToFile`).

**Payload v2** (QR / fichier) :
```json
{ "v":2, "orgId", "invitationId", "code", "role",
  "scope": { "type":"ORG|GROUP|EVENT|REPORT", "groupId?", "resource?", "id?" },
  "memberId": null, "grants":[...], "tags":[...], "issuedAt", "expiresAt" }
```

**Claim** (`/invitation/claim`) — 4 transports : **QR scanner** (Capacitor Camera + ZXing), **code saisi**, **collage JSON**, **fichier `.json`** (T9 local). `parseQRPayload` valide ; si le code est inconnu localement → message explicite (l'invitation n'a pas encore sync'd → coller le JSON complet ou attendre). `claimInvitation(payload, deviceId, issuerId)` :
1. Vérifie l'expiration **locale**.
2. Crée un **user PENDING** (`profiles.status=PENDING`, email `pending-xxx@lumina.local`) + claim **`PENDING_SYNC` LOCALEMENT**, même si l'invitation n'est pas encore synchronisée (design B.4).
3. Applique le rôle de l'invitation à la session (`selectRole`) + `completeOnboarding` → l'app est utilisable **immédiatement, hors-ligne**.
4. Au retour du réseau, le trigger serveur **`settle_invitation_claim`** (idempotent, ne rejoue que les `PENDING_SYNC`, PK invitation+device, attend l'invitation dispo) tranche : **CONFIRMED** (profile → ACTIVE) ou **REJECTED_DUPLICATE/EXPIRED/EXHAUSTED/REVOKED** (+reason, audit).

**Gestion** (`/invitation/manage`) : liste des invitations de l'org (filtres status/rôle), **claims** par invitation, **confirm/reject** (miroir local du trigger + audit + déverrouillage du PENDING si confirmé), révocation (`revokeInvitation`).

### 6.5 Dashboard & navigation
`/dashboard` : salutation horaire, KPIs par **caisse** (soldes = revenus − dépenses des transactions APPROVED, pending), transactions récentes, événements à venir. **Barre de navigation 100 % configurable** (`src/lib/features.ts`, localStorage `lumina-features`) : l'UTILISATEUR compose ses 1 à 4 onglets (ajout/retir/déplacer) + menu « Plus » (visibilité par feature) ; défaut `["dashboard","finance","groups","cotisations"]` ; préchargement des chunks au repos (`requestIdleCallback`) → jamais de squelette au 1er clic.

### 6.6 Transactions
`/finance` (liste + filtres), `/transaction/new` (saisie), `/groups/:id/transaction/new` (caisse de groupe), `/transaction/:id` (détail + approuver/rejeté/annuler), `/transaction/:id/edit`, `/saisie-rapide/:id`. Workflow statuts : `DRAFT → PENDING → APPROVED / REJECTED` ; **annulation** = transaction miroir via `reversal_of_id` (jamais de hard-delete d'APPROVED) ; **batch approve/delete** ; garde de workflow (capability `workflow` : `transactionGuard` immuable + audit). Vérification de **versement atomique** (`versementValidateAtomic`).

### 6.7 Versements
`/versement` : transfert **caisse de groupe → caisse principale** ; crée 1 enregistrement `versements` (status APPROVED) + **paire de transactions** (dépense source + revenu cible, même `versement_id`, même `source_caisse_id`) ; politique `versementCheckBalance` (solde insuffisant → blocage).

### 6.8 Événements & cultes
`/events` + `/event/new` + `/event/:id` + `/event/:id/edit` : type `EVENT` ou **`CULTE`** ; budget (lignes `event_budgets`/`budget_lines` + `budget_items` JSON legacy : listes d'achat avec statuts PENDING/ORDERED/RECEIVED/CANCELLED) ; workflow `eventStatusGuard` (PLANIFIED → ONGOING → COMPLETED/CANCELLED).

**Cotisations** (`/cotisations`, `/culte/:id`, `/membres-en-avance`, `/groups/:id/cotisation`) :
- `createCulte` : crée l'événement CULTE + **une cotisation NON_PAYE par membre actif** (montant obligatoire paramétrable).
- Marquage : `markCotisationPaid` (validation montant + `total_dons` incrémenté membre), `markCotisationsAbsent`, **avance** (`EN_AVANCE` : solde prépayé reporté dans `members.montant_en_avance`, déterminé par `determinerStatutAvance`/`calculerDon`).
- **Verrouillage à 30 jours** : un culte > 30 jours et une cotisation déjà payée → paiement verrouillé (`isPaiementVerrouille`).
- Stats par culte (payé/absent/non payé/en avance, total collecté vs attendu).

### 6.9 Groupes & membres
`/groups` + `/groups/:id` : arborescence (`parent_group_id`), responsable, **caisse de groupe** (compte `GROUP`), cotisation du groupe. Adhésions `group_memberships` (MEMBRE/RESPONSABLE). `/members` + `/membre/:id` : fiche (statuts ACTIVE/INACTIVE/ARCHIVED + **archive/restore avec raison + audit** — capability `lifecycle`).

### 6.10 Budgets
- **`/budgets`** (org) : budgets par **exercice × période (ANNUAL/Q1-Q4) × centre de coûts** ; `computeBudgetReport` : prévu/réel/écart **le « réel » est DÉRIVÉ des transactions APPROVED — jamais stocké** (cohérence grand livre garantie) ; `budgetWindow` (fenêtre mensuelle).
- **`/budgets/:id`** : lignes budgétaires (catégorie + planifié), % utilisé, dépassements.

### 6.11 Dons & campagnes
`/giving` (onglets campagnes/donateurs/reçus + actions « donner »/« ajouter donateur ») + `/giving/campaigns/:id` : objectif + **progression** (`campaignProgress` = dons reçus + pledges vs cible), pledges échelonnés (schedule + montant/période), **reçus fiscaux annuels** par donateur, **`transaction_giving`** rattache chaque entrée de dîme/don à un donateur + campagne (traçabilité fiscale). ⚠️ **PSP hors périmètre** : Lumina trace, ne paie pas.

### 6.12 Rapports & bilan
- **`/reports`** : `report_definitions` (kind **FINANCE / FEATURE / AUDIT** — lot F, 2026-09-22), templates + rapports sauvegardés.
- **`/report-builder`** : constructeur (source, dimensions, metrics sum/count/avg/min/max, filtres, group_by mois/année/caisse/catégorie/type, sort) ; aperçu graphique Recharts (barres) ; **export PDF (jsPDF+autotable, signé au nom de l'org) / Excel (xlsx) / CSV (BOM + `;`)** ; `?kind=FEATURE|AUDIT` pour les sources `features` et `audit`.
- **`/balance`** : bilan financier (entrées/sorties/net par période + par caisse, graphique).
- Moteur : `reportEngine` (QueryBuilder + AggregationEngine, ~564 lignes) + `reportDefinitionRepo`.

### 6.13 Formulaires dynamiques & champs personnalisés
- **`/forms`** (FormBuilder) : construction de formulaires (key, nom, version, **entité cible**, champs text/number/date/select/boolean/currency/reference/textarea/file, required, validation min/max/regex/custom, options, conditional `showIf`, `mapsToEntityField`, ordre) ; statuts DRAFT/PUBLISHED/ARCHIVED.
- **`/form/fill/:id`** (FormFill) : remplissage avancé (dispatcher par entité — lot F), données JSON, verrou de version.
- **`/forms/:id/submissions`** : revue des soumissions (SUBMITTED/PROCESSED/REJECTED), rattachement entité.
- **`/custom-fields`** : définition de champs additionnels par type d'entité **sans migration** (vautés JSONB).

### 6.14 Documents & archives
`/archives` : documents (métadonnées `documents`) dans 3 buckets Supabase Storage — **`logos` PUBLIC**, **`archives` & `expense_proofs` PRIVÉS** (photos de justificatifs de dépenses). Upload `uploadLuminaFile(bucket, file)` (chemin `org_id/safeName`, échoue hors-ligne) ; **soft-delete via `status`** (migrations 0041-0053 : RLS par `org_member` SELECT/INSERT/UPDATE-via-status + grants service_role/powersync + policies de buckets read/write/delete).

### 6.15 Audit, historique & aide
- **`/trace`** : fil d'audit filtrable (entité : Transaction/Groupe/Membre/Événement/Budget/Formulaire) + **timeline visuelle** (lignes verticales, badges par action avec icônes/couleurs : Créé vert, Modifié bleu, Supprimé rouge, Approuvé vert, Rejeté rouge, Archivé gris, Rétabli vert, Révisé orange, Annulé rouge).
- **`/history`** : historique financier global (transactions + événements + groupes filtrables).
- **`/help`** + **`/tutoriel`** : aide et tutoriel.

### 6.16 Administration centrale & fédération (T7)
⚠️ Accès **strictement serveur** (RLS `is_org_member` sur `org_admins`) : la page s'ouvre seulement si l'utilisateur détient ≥ 1 grant `org_admins` ACTIVE (ou rôle CENTRAL_ADMIN UI). Chaque action est re-forcée côté serveur.
- **`/admin`** : KPIs (`getOrgStats`) + liste des orgs + actions : `suspendOrganization`/`reactivateOrganization`/`archiveOrganization` (soft-delete `archived_at/by/reason`), `assignOrgAdmin`/`revokeOrgAdmin`, `listAdminCandidates`.
- **`/admin/organizations/:id`** : détail org (stats, admins, activité récente `getRecentActivity`, carte rapport `getOrgReportCard`).
- **`/admin/federation`** + **`/admin/federation/tree`** : arborescence parent/enfant (`parent_org_id`), vue pré-agrégée `org_federation` + visualisation interactive **`@xyflow/react`** ; création d'org enfant via edge **`create_org`** (service_role : vérifie JWT appelant → gate grant `org_admins` ACTIVE (403 sinon) → crée org + grant self-admin, rollback si l'insert du grant échoue ; le 1er admin central est seedé par SQL par l'owner).
- **`/admin/units`** : gestion des `org_units` (centres/entités).
- Capability **`federation`** (388 lignes) : `FederationService` — `FederationOrg`, `OrgUnit`, **`canAccess` (vague 2.4 : grants + tags + scope, inv. 8/9/10 agnostiques)** — test `federation-canAccess`.

### 6.17 Paramètres (`/settings/*`)
7 sous-pages : **profil** (nom, rôle), **thème** (thèmes Lumina + mode clair/sombre persistés avant le 1er paint), **personnalisation** (signature rapports), **features** (nav 1-4 onglets + visibilité menu Plus + reset), **notifications** (push OneSignal par rôle + in-app), **gestion** (raccourcis : formulaires, mes comptes, champs personnalisés, archives, rapports, bilan, historique, trace, versement, tutoriel + **administration centrale si CENTRAL_ADMIN**), **à propos**.

---

## 7. Fiches feature détaillées

### F-01 Transactions & caisses
- **Description** : saisir, approuver, rejeter, annuler (via reverse), éditer et consulter des transactions rattachées à une caisse (org principale ou groupe), à une catégorie, à un événement, à une cotisation ou à un versement.
- **Entités** : `transactions`, `categories`, `caisses`/`accounts`, `versements`.
- **Use cases** :
  1. Saisie rapide (type, montant en francs → cents, description, date, catégorie, caisse, source, nom personne) → statut PENDING par défaut ; batch ou unitaire.
  2. Approbation (rôle avec `transaction:approve`) → APPROVED + `approved_by/at` + audit + notification `TRANSACTION_APPROVED`.
  3. Rejet (raison) → REJECTED + audit + notification.
  4. Annulation → crée une transaction miroir `reversal_of_id` (jamais de suppression d'APPROVED) + audit REVOKE/CANCEL.
  5. Édition → validation de workflow (statuts immuables) + version++ + audit.
  6. Suppression batch (uniquement DRAFT/REJECTED).
- **Règles d'affaires** : montants en **cents int** ; catégorie obligatoire ; caisse de groupe → le versement vers la principale passe par F-04 ; le « réel » des budgets est dérivé des APPROVED uniquement.
- **États** : DRAFT / PENDING / APPROVED / REJECTED.
- **Permissions** : `transaction:create/read/update/approve/reject/delete`.
- **API/servi** : `useLocalStore.addTransaction…` (legacy) + `executeWrite` PowerSync + hooks `useTransactions` (fallback cache).
- **Acceptation** : toute mutation = entrée audit avec before/after ; hors-ligne = écriture locale d'abord.

### F-02 Versements
- **UC** : 1) Transfert de caisse de groupe → principale (montant, commentaire) ; 2) Vérification solde source (`versementCheckBalance` → blocage si insuffisant) ; 3) Création atomique (`versementValidateAtomic`) : 1 `versements` + PAIRE de transactions (dépense source + revenu cible, même `versement_id`) en un appel.
- **Règle** : le versement est APPROVED à la création (workflow DRAFT/SUBMITTED réservable) ; audit CREATE + notification.

### F-03 Événements & budgets d'événement
- **UC** : 1) Créer un événement (nom, dates, type EVENT/CULTE, budget, liste d'achat JSON) ; 2) Modifier le statut (guard `eventStatusGuard`) ; 3) Ajouter/retirer des lignes budgétaires (catégorie + planifié) ; 4) Suivre le réalisé vs prévu (lignes `actual_amount_cents` mises à jour par les transactions rattachées à l'événement) ; 5) Réviser un budget (audit REVISE + `revised_at/by`).
- **Listes d'achat** (legacy) : statuts PENDING/ORDERED/RECEIVED/CANCELLED (`updateShoppingItemStatus`).

### F-04 Cotisations
- **UC** : 1) Créer un culte avec montant obligatoire (`createCulte` → 1 cotisation NON_PAYE par membre actif) ; 2) Marquer payé (montant validé par `cotisationValidateAmount` + `total_dons`++ + transaction source COTISATION optionnelle) ; 3) Marquer absent ; 4) Payer en **avance** (solde reporté `members.montant_en_avance`, statut EN_AVANCE sur les N cultes suivants via `determinerStatutAvance`/`calculerDon`) ; 5) Historique par membre ; 6) Liste des membres en avance.
- **Règle critique** : **verrouillage 30 jours** (`JOURS_VERROUILLAGE_CULTE`) : culte > 30 j + cotisation déjà payée → plus modifiable.
- **Permissions** : `cotisation:manage`.

### F-05 Groupes & adhésions
- **UC** : 1) Créer un groupe (arborescence `parent_group_id`, responsable membre) + caisse de groupe (`accounts` owner GROUP) ; 2) Adhérer/retirer un membre (rôle MEMBRE/RESPONSABLE) ; 3) Archive/restore (raison + audit, capability `lifecycle`) ; 4) Cotisation spécifique au groupe (`/groups/:id/cotisation`, contexte ORG|GROUP — capability `cotisation`).

### F-06 Membres
- **UC** : 1) Créer/éditer une fiche (statuts ACTIVE/INACTIVE/ARCHIVED) ; 2) Archiver (raison, `archived_by/at`) ; 3) Restaurer (audit RESTORE) ; 4) Suivre total dons + solde en avance (champ dérivé) ; 5) Fiche détail (`/membre/:id`).
- **Permissions** : `member:create/read/update/delete`.

### F-07 Budgets organisationnels
- **UC** : 1) Créer un budget (exercice, période ANNUAL/Q1-Q4, centre de coûts, total planifié, lignes par catégorie) ; 2) Voir le rapport (prévu/réel/écart/% utilisé par ligne + totaux — **réel dérivé, jamais stocké**) ; 3) Modifier une ligne (audit) ; 4) Notification `BUDGET_EXCEEDED` (dépassement).
- **Règle** : fenêtre de calcul par période (m1-m2 de l'année fiscale) ; transactions immuables APPROVED uniquement.

### F-08 Dons & campagnes
- **UC** : 1) Fiche donateur (contact, rattachement membre, opt-in reçu fiscal) ; 2) Campagne (but, fonds, cible, dates) ; 3) Pledge (engagement, schedule, montant/période, dates) ; 4) Enregistrer un don (transaction INCOME + `transaction_giving` → traçabilité fiscale) ; 5) Progression de campagne (dons + pledges vs cible) ; 6) Reçu fiscal annuel par donateur (unique org/donor/year).
- **Hors périmètre** : encaissement/PSP. Roadmap P1 : dons récurrents + rapports par donateur/fonds.

### F-09 Formulaires & champs personnalisés
- **UC** : 1) Builder (définition de formulaire : entité cible, champs + validation + options + conditions + mapping entité) ; 2) Publier (version++, statuts) ; 3) Remplir (`/form/fill/:id`, dispatcher par entité, verrou de version) ; 4) Traiter les soumissions (SUBMITTED→PROCESSED/REJECTED, rattachement entité) ; 5) Champs personnalisés par type d'entité sans migration (definitions + valeurs JSONB).
- **Sécurité** : valeurs stockées JSONB, verrou de version de formulaire, audit sur publication/soumission.

### F-10 Rapports, bilan & exports
- **UC** : 1) Construire un rapport (source, dimensions, metrics, filtres, group_by, sort) ; 2) Aperçu graphique ; 3) Sauvegarder (template ou non, kind FINANCE/FEATURE/AUDIT) ; 4) **Exporter** PDF (signé org, jsPDF+autotable) / Excel (xlsx) / CSV (BOM+`;`) ; 5) Bilan financier par période et caisse (graphique Recharts).
- **Règle** : agrégations sur transactions APPROVED uniquement (cohérence grand livre).

### F-11 Invitations
- **UC** : 1) Émettre (rôle + scope + grants + tags + durée + max_uses) → QR + code + export fichier ; 2) Réclamer (4 transports : QR, code, JSON collé, fichier ; **claim hors-ligne PENDING_SYNC** puis settlement serveur idempotent) ; 3) Gérer (liste, claims, confirm/reject révocation).
- **Règle** : un code `LUM-XXXXXX` ; défaut expiration 7 j ; max_uses ; le claimant est créé **PENDING** et déverrouillé uniquement au CONFIRMED ; audit sur CREATE/REVOKE/CLAIM + settlement.
- **Permissions** : `invitation:create/revoke/manage` (émision limitée RLS : PASTEUR_PRINCIPAL/ANCIEN/TREASURIER).

### F-12 Documents & archives
- **UC** : 1) Uploader (3 buckets : logos public, archives & expense_proofs privés) ; 2) Rattacher à une entité (type + id) ; 3) Archiver/restaurer (soft-delete via status) ; 4) Consulter les justificatifs de dépenses.
- **Règle** : accès privé par org (RLS `org_member`) ; service_role/powersync grants ; échec explicite hors-ligne.

### F-13 Administration centrale & fédération
- **UC** : 1) Voir les orgs (KPIs) ; 2) Suspendre/reactiver/archiver (soft, raisons) ; 3) Assigner/révoker un admin d'org (`org_admins`) ; 4) Créer une org enfant (edge `create_org`, gate grant self-admin, rollback) ; 5) Arborescence fédération (`parent_org_id`) + visualisation `@xyflow/react` ; 6) Rattachement `canAccess` par grants+tags (inv. agnostiques 8/9/10).
- **Règle** : tout est re-forcé RLS serveur (la UI n'accorde rien) ; **ARCHIVED ≠ DELETE** (l'historique reste intact).

### F-14 Audit & trace
- **UC** : 1) Journaliser (immuable, before/after, acteur, rôle au moment, commentaire) ; 2) Filtrer (entité, action, période) ; 3) Timeline visuelle ; 4) Rapport d'audit (kind AUDIT dans `/reports`).
- **Règle** : « NeverBreak #6 » — TOUTE mutation est tracée ; index composite (performance).

### F-15 Notifications
- **UC** : 1) Push OneSignal (par rôle : `login(userId, role)` + tags) ; 2) In-app (table `notifications`, triggers DB sur événements transaction) ; 3) Marquer lu / tout lu.
- **Types** : `TRANSACTION_PENDING`, `TRANSACTION_APPROVED`, `BUDGET_EXCEEDED`, …

### F-16 Paramètres & personnalisation
- **UC** : profil, thème (persisté avant 1er paint), signature des rapports, **nav 1-4 onglets + menu Plus** (local-first, sync entre onglets via `storage` event), push, raccourcis « Gestion », à propos.

### F-17 Comptes & sessions
- **UC** : hub « Mes comptes » (persistance multi-session), déconnexion sans perte de compte, re-ouverture par clic.

---

## 8. Flux end-to-end de référence (pour l'agent de test)

### Flux 1 — Nouveau créateur (complet)
1. Lancement → `/splash` (logo→illustration) → session absente → `/auth`.
2. Signup email (ou Google OAuth → `/auth/callback` ou `lumina://auth/callback`).
3. `handle_new_user` (SECURITY DEFINER) crée le profile PENDING/ACTIVE (rôle défaut MEMBRE, org-1).
4. `isBrandNewUser` (5 min) → `/onboarding`.
5. 8 écrans présentation → écran 9 → **Créateur** → `/org-setup`.
6. Nom (≥ 2), sigle, type (template → rôles + features par défaut), thème, features, rôle → `updateConfig({churchName})` + `selectRole` + `completeOnboarding` → `/dashboard`.
7. Dashboard : KPIs caisse principale, transactions récentes, événements.

### Flux 2 — Membre invité (QR)
1. Émetteur (trésorier) : `/invitation/emit` → rôle + scope + grants/tags + expiration/max_uses → QR affiché + code + export `.json`.
2. Invité : `/auth` (signup) → `/onboarding` → écran 9 → **Membre** → `/invitation/claim`.
3. Scan QR (ou saisie code / collage JSON / fichier) → `parseQRPayload` → validation locale (expiré ?) → `claimInvitation` : user PENDING + claim PENDING_SYNC **créés localement** (offline OK) → `selectRole` + `completeOnboarding` → dashboard utilisable immédiatement.
4. Réseau : trigger `settle_invitation_claim` → CONFIRMED (profile → ACTIVE) ou REJECTED_* (+reason) ; miroir local + audit.
5. L'invité agit selon son rôle + grants + tags (`federation.canAccess`).

### Flux 3 — Cycle de vie d'un culte (cotisation)
1. `/cotisations` → nouveau culte (nom, date, montant obligatoire) → `createCulte` : événement CULTE + 1 cotisation NON_PAYE par membre actif.
2. `/culte/:id` : assises du culte (liste membres + statuts) → marquages payé/absent/en avance (verrouillage 30 j respecté).
3. Paiement → `total_dons`++ (+ transaction source COTISATION optionnelle) + audit + notification.
4. `/membres-en-avance` : soldes reportés ; `/groups/:id/cotisation` : contexte de groupe.

### Flux 4 — Transaction + versement + budget
1. `/transaction/new` : saisie → PENDING (ou DRAFT).
2. `/transaction/:id` : approbation (rôle autorisé) → APPROVED + audit + notification.
3. `/versement` : caisse groupe → principale : `versementCheckBalance` (solde OK ?) → `versementValidateAtomic` (1 versement + PAIRE de transactions, même `versement_id`) → audit.
4. `/budgets/:id` : rapport prévu/réel/écart (réel dérivé des APPROVED) ; dépassement → notification `BUDGET_EXCEEDED`.

### Flux 5 — Rapport & export
1. `/report-builder` : source + dimensions + metrics + filtres + group_by + sort → aperçu graphique Recharts.
2. Sauvegarder (kind FINANCE/FEATURE/AUDIT, template ou non).
3. Export **PDF (signé org) / Excel / CSV (BOM+`;`)**.
4. `/balance` : bilan par période + par caisse.

### Flux 6 — Admin central
1. `/settings/gestion` → « Administration centrale » (visible SI CENTRAL_ADMIN) → `/admin`.
2. KPIs + liste des orgs → suspendre / réactiver / archiver (soft, raisons).
3. `/admin/organizations/:id` : stats, admins (assigner/révocer), activité récente.
4. `/admin/federation` (+ `/tree` via `@xyflow/react`) : arborescence parent/enfant, création d'org enfant (edge `create_org` — gate grant self-admin + rollback), `canAccess` (grants+tags).
5. `/admin/units` : centres/entités.

---

## 9. Matrice de permissions (RBAC)

**Format** `resource:action`. 27 permissions ; matrice `PERMISSION_MATRIX` (`src/lib/rbac.ts`) ; capability `security` (facade). **NB** : le stub mono-église `checkPermission()` retourne `true` (amendement) — la contrainte EFFECTIVE est portée par le **RLS serveur** (`is_org_member` SECURITY DEFINER, fix récursion 54001) + `federation.canAccess`.

| Rôle | Permissions notables |
|---|---|
| **PASTEUR_PRINCIPAL** (100) | Tout : transaction (create/read/update/approve/reject/delete), versement (create/approve), group (create/read/update/delete), event (*), report (read/export), member (create/read/update), cotisation:manage, admin (settings/roles) — 23 perms |
| **PASTEUR_ASSOCIE / PASTEUR_JEUNESSE** | Lecture + approve transactions, events create/update, reports, members read, cotisations, groups read (8-10 perms) |
| **ANCIEN / TREASURIER** | Finance lourde : create/update/approve/reject transactions, versement approve, cotisations, invitations:create, rapports (16-18 perms) |
| **DIACRE** | Lecture + approve transactions, events read, reports, members read, cotisations, groups read (8 perms) |
| **RESPONSABLE_DEPARTEMENT / TREASURIER_ADJOINT / RESPONSABLE_GROUPE** | create/update transactions (groupe), events, members, cotisations (6-9 perms) |
| **SECRETAIRE / SECRETAIRE_ADJOINT** | members (create/update), events (create/update), cotisations, reports |
| **COMPTABLE** | Lecture finance + rapports (saisie limitée) |
| **BENEVOLE / MEMBRE** | `transaction:read`, `event:read` (lecture seule) |
| **CENTRAL_ADMIN** (grant `org_admins`) | `/admin*` : cycle de vie orgs, grants, fédération — **re-forcé RLS serveur**. **NB** : `CENTRAL_ADMIN` n'est PAS un `Role` canonique de `src/types` (14 rôles) — c'est un **rôle UI dérivé** détecté via le grant `org_admins` actif (voir §12) ; `src/types/index.ts` ne le définit pas.

Règle de hiérarchie : `hasHigherOrEqualRole` compare les rangs numériques (`ROLE_HIERARCHY`).

---

## 10. Non-fonctionnel & sécurité

- **Offline-first** : PowerSync (SQLite) = SSoT locale ; `initPowerSync()` avant React ; fallback cache si non prêt ; écritures locales d'abord + queue de sync ; claims d'invitation hors-ligne.
- **Synchronisation** : `powersync/sync-config.yaml` édition 3, **20+ streams** ; scoping `WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())` (pas de fuite cross-org) ; tables de liaison → filtre transitif via parent ; streams globaux `auto_subscribe` (categories, org_units, caisses) ; org-scoped explicites (org_memberships, invitations, grants, tags, organizations…).
- **RLS** : FORCE sur chaque table business ; helpers **SECURITY DEFINER** (`is_org_member`, `handle_new_user`) corrigeant 54001 (récursion) et 500 (signup) ; policies permissives limitées aux registres globaux serveurs (justifiées par commentaire `Rationale:`) ; schéma **additif** (aucune altération des tables legacy partagées).
- **Auth** : Supabase Auth (PKCE) + Google OAuth + OneSignal ; session validée 60 s ; renouvellement 5 min avant expiration ; métadonnées (prénom/nom/rôle) au signup.
- **Edge functions** (Deno) : `signup` (validation + confirmation email serveur si service_role), `login` (lecture profile, rôle défaut TREASURER, org legacy `org-1`), `create_org` (service_role obligatoire : vérifie JWT → gate grant `org_admins` → crée org + self-admin, rollback) — CORS `*`, URL Supabase par défaut dev.
- **Audit immuable** : toute mutation → `audit_entries` (before/after, acteur, rôle au moment, commentaire, index composite).
- **Documents** : 3 buckets (logos PUBLIC ; archives & expense_proofs PRIVÉS) + RLS `org_member` + grants service_role/powersync + soft-delete via status.
- **Exports** : PDF (jsPDF+autotable, signature org), Excel (xlsx), CSV (BOM + `;`) ; `exportCausesData`.
- **Thème & UI** : tokens design Lumina → variables CSS Ionic ; thème + mode (dark défaut) persistés AVANT le 1er paint ; nav configurable (localStorage + sync inter-onglets) ; préchargement des chunks nav au repos.

---

## 11. Tests (état actuel)

| Type | Outils | Couverture |
|---|---|---|
| **Unitaires** | Vitest | **40 fichiers** ; ~574 tests (capabilities : a11y, budgets-giving, e2e, federation-canAccess, invitation-file-transport/scope, lifecycle(-adapters), multi-org-wave1, no-cross-imports, no-hardcoded-amounts, notification, organization(-central), policy, relationship, resource, security, workflow ; components : core, FormBuilder, FormSubmissions, HomeIndicator, policy-wiring ; hooks, lib, pages, store, adapters native) |
| **E2E** | Playwright (`e2e/specs/`) + `e2e-tests/` | isolation (guard-negative), events, finance (balance, transaction-detail/new), preflight ; budgets, features-nav, federation-tree, finance-type, giving, invitations-admin, nav-bar/determinism/header/no-black-page, reports, settings-tabs, splash |
| **Cypress** | `cypress/e2e/` | cloud-sync, comprehensive-flow, groups-events, local-dashboard, local-smoke, persistence, simple-check |
| **Magnitude** | `tests/magnitude/` | auth-negative, auth-smoke |
| **Mobile (Maestro)** | `.maestro/` | scénarios mobile (mcp__maestro__*) |
| **Gates** | scripts | `check-rls.sh`, `check-view-joins.ts`, `check-boundaries.sh` (statiques, scannent les fichiers migrations) |

**Invariants testés** : no-cross-imports (capabilities), no-hardcoded-amounts, policy-wiring, nav-determinism, canAccess (fédération), transport de fichiers d'invitation.

---

## 12. Limites, hypothèses & risques

1. **RBAC canonique inactif** : le stub mono-église `checkPermission()` → `true` ; la contrainte repose sur RLS serveur + `canAccess`. Risque : une permission accordée à l'UI peut ne pas être enforceée côté données si le RLS diverge.
2. **Org legacy `org-1`** : `login` renvoie org `org-1` (« Église MFE-JC Centrale ») par défaut — à migrer vers le multi-org (`org_memberships`).
3. **Colonnes bas-cas de `cotisations`** : `montantobligatoire`/`montantpaye`/`datepaiement` — le schéma PowerSync DOIT porter ces noms exacts (mapping par nom) ; toute correction côté PG corrompt la sync locale.
4. **PSP hors périmètre** : la feature dons trace mais n'encaisse pas (roadmap P1).
5. **Premier admin central seedé par SQL** (service_role) — l'edge `create_org` ne peut pas créer le tout premier admin.
6. **Offline writes** : la file de sync (OPFS/`lib/offline`) peut rejeter en cas de conflits de version sur les tables canoniques (`transactions.version`).
7. **Confidentialité des données** : RLS `USING(true)` sur certains registres globaux (modèle « open_all » hérité du legacy) — à revisiter pour le multi-tenant (le scoping PowerSync reste strict).

---

## 13. Glossaire

| Terme | Définition |
|---|---|
| **Culte** | Événement de type `CULTE` — porte les cotisations |
| **Caisse** | Compte principal (legacy `caisses` / canon `accounts` ORGANIZATION) |
| **Groupe** | Entité avec sa propre caisse (`accounts` GROUP) et son responsable |
| **Versement** | Transfert caisse de groupe → caisse principale (paire de transactions) |
| **Cotisation** | Participation d'un membre à un culte (NON_PAYE/PAYE/ABSENT/EN_AVANCE) |
| **Avance** | Solde prépayé reporté sur les N cultes suivants (`montant_en_avance`) |
| **Fédération** | Arborescence parent/enfant d'organisations (`parent_org_id`) |
| **Grant** | Permission agnostique (subject_type/resource/action/scope) — vague 2 |
| **Tag** | Population dynamique nommée d'une org (sujet de grant) |
| **Claim** | Réclamation d'invitation (PENDING_SYNC → CONFIRMED/REJECTED_*) |
| **Settlement** | Tranchement serveur d'un claim (`settle_invitation_claim`) |
| **NeverBreak #6** | Invariant : toute mutation est tracée en audit |
| **PENDING** | Utilisateur créé par claim, non encore confirmé par le serveur |
