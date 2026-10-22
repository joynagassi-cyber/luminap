# Matrice des fonctionnalités — Lumina

> Session agent 2026-10-22. Statuts : complète / incomplète / cassée / non analysée.
> Validation : validée (tests verts) / partielle / non validée.
> Légende des preuves : `V` = vitest, `C` = Cypress, `SQL` = requête base, `M` = manuel.

## Phase 0 — état initial

| # | Fonctionnalité | Rôle utilisateur | Points d'entrée | Statut initial | Défauts constatés | Actions menées | Tests | Validation |
|---|---|---|---|---|---|---|---|---|
| 1 | **Auth e-mail/mot de passe** | Créer un compte, se connecter | `/auth`, `src/lib/auth.ts`, edge `signup`/`login` | complète | — | — | `C: auth-real.cy.ts` (5/5) | validée (C) |
| 2 | **Déconnexion douce / reconnexion sans identifiants** | Retrouver son compte | `/sessions`, `authService.signOut/restoreSoftSession` | complète | — | — | `C: sessions.cy.ts`, `V: Sessions.test.tsx` | validée (C+V) |
| 3 | **Onboarding (création d'organisation)** | Configurer son organisation à l'inscription | `/onboarding`, edge `create_org` | complète | — | — | `C: auth-real.cy.ts` | validée (C) |
| 4 | **Isolation des données entre organisations (RLS)** | — (sécurité) | 127 policies `public.*`, `is_org_member`, `initplan_uid` | **cassée** | **`is_org_member(uid, org_id)` : le paramètre `org_id` était masqué par la colonne → `p.org_id = p.org_id` → toujours TRUE. Tout utilisateur authentifié lisait les 108 profils et les 5 organisations.** | Corrigé (migration `20261022000001`, qualification `is_org_member.org_id`) ; `org_roles` idem | `SQL` avant/après + `C: cross-tenant.cy.ts` | validée (SQL, 108→1 profils) |
| 5 | **Isolation RLS `grants` / `tags` / `tag_assignments`** | — (sécurité) | policies `grants_read_org`, `tags_read_org`, `ta_read_org` | **cassée** | Policies `FOR SELECT USING (true)` → lecture de toutes les lignes par tout authentifié | Corrigé (migration `fix_grants_tags_rls_org_scoping`) | `SQL` | validée (SQL) |
| 6 | **Synchronisation PowerSync filtrée par organisation** | — (sécurité/fiabilité) | `powersync/sync-config.yaml` (31 streams) | **cassée** | Streams `categories`, `org_units`, `caisses` en `SELECT *` **sans filtre org** → chaque client synchronisait les données de toutes les organisations | Corrigé (filtre `org_id IN (SELECT org_id FROM profiles …)`) ; **déploiement Cloud en attente** | `SQL`, à revalider en C après déploiement | partielle (fichier corrigé, pas déployé) |
| 7 | **Création d'organisation** | Ouvrir une nouvelle organisation | `/admin`, `/onboarding`, edge `create_org` | complète | — | — | `C: comprehensive-flow` | non validée (C en échec à confirmer) |
| 8 | **Invitations (code / QR / lien)** | Inviter un membre | `/invitation/*`, `invitations`, `invitation_claims`, `settle_invitation_claim` | complète | — | — | `C: invitations.cy.ts` | à valider |
| 9 | **Gestion des rôles et appartenances** | Attribuer un rôle | `org_memberships`, `org_admins`, `role_assignments`, `/admin/*` | complète | `org_roles` masquage (corrigé) | Corrigé | `V`, `SQL` | partielle |
| 10 | **Fédération (organisations parentes/enfants)** | Piloter plusieurs organisations | `/admin/federation`, `org_family`, `org_reports` | complète | — | — | `C: org-reports.cy.ts` | à valider |
| 11 | **Finances — transactions (entrée/sortie)** | Saisir un mouvement | `/finance`, `/transaction/new`, `/transaction/:id`, `transactions` | complète | 0 transaction en base (pas de données réelles) | — | `C: finance-deep.cy.ts` (2/5) | partielle |
| 12 | **Versements entre comptes** | Transférer entre caisses | `/versement`, `versements` | complète | — | — | `V: versement-cotisation.test.ts` | partielle |
| 13 | **Cultes / cotisations** | Collecter les cotisations d'un culte | `/cotisations`, `cotisations` | complète | — | — | `V: versement-cotisation`, `C` | partielle |
| 14 | **Rapports financiers et inter-organisations** | Produire et transmettre un rapport | `/reports`, `/balance`, `/budgets`, `org_reports`, `report_definitions` | complète | — | — | `C: org-reports.cy.ts`, `V: orgReport.test.ts` | partielle |
| 15 | **Formulaires dynamiques (builder + saisie)** | Créer un formulaire, le remplir | `/forms`, `/forms/fill/:id`, `/forms/:id/submissions` | **incomplète** | **`FormSubmissions.tsx` : `<EmptyState>` utilisé sans import → `ReferenceError` → page blanche à l'état vide** | Corrigé (import ajouté) | `V: FormSubmissions.test.tsx` | validée (V) |
| 16 | **Champs personnalisés** | Ajouter des champs métier | `custom_field_definitions/values` | complète | — | — | `V` | à valider |
| 17 | **Événements et tâches** | Planifier un culte, suivre ses tâches | `/events`, `/event/*`, `events`, `event_tasks` | complète | — | — | `C: events-tasks.cy.ts` (0/1) | non validée |
| 18 | **Groupes et appartenances de groupe** | Organiser des groupes | `/groups`, `groups`, `group_memberships` | complète | — | — | `C: groups-events.cy.ts` | à valider |
| 19 | **Membres (annuaire)** | Gérer les personnes | `/members`, `/membres-en-avance`, `members` | complète | — | — | — | non validée |
| 20 | **Dons et campagnes** | Suivre les dons | `/giving`, `giving_campaigns`, `giving_donors`, `pledges`, `tax_receipts` | complète | — | — | `V: budgets-giving.test.ts` | partielle |
| 21 | **Notifications** | Être averti d'un changement | `notifications`, triggers `notify_*`, `onesignal.ts` | complète | — | — | `V: notification.test.ts` | partielle |
| 22 | **Journal d'audit** | Tracer les changements | `/trace`, `audit_entries` | complète | — | — | `V` | à valider |
| 23 | **Navigation (barre basse + menu latéral)** | Se déplacer | `BottomNav.tsx`, `FeatureSidebar.tsx`, `features.ts` | complète | — | — | `C: local-dashboard.cy.ts` (**obsolète**), `V: a11y.test.ts` (2 échecs) | partielle |
| 24 | **Paramètres et personnalisation du profil** | Régler son compte | `/settings`, `profiles` | complète | — | — | — | non validée |
| 25 | **Aide / tutoriel intégré** | Apprendre l'app | `/help`, `Tutorial.tsx` | complète | — | — | — | non validée |
| 26 | **Export de données (CSV/Excel)** | Exporter | `src/lib/export.ts`, `downloadBlob` | complète | — | — | `V: formSystem-export.test.ts` | partielle |
| 27 | **Fichiers / documents (Storage)** | Joindre une preuve | buckets `logos`, `archives`, `preuves-depense`, `storageService.ts` | complète | — | — | — | non validée |
| 28 | **Mode hors ligne / reconnexion** | Travailler sans réseau | PowerSync, `/splash`, `cloud-sync.cy.ts` | complète | — | — | `C: cloud-sync.cy.ts` (1/1) | validée (C) |

## Tests unitaires — état initial (vitest)

- **1030 / 1048 passent**, **18 échecs** dans **9 fichiers**. Vitest **n'est pas exécuté en CI** → les 18 échecs sont invisibles pour le propriétaire.
- Fichiers en échec : `a11y.test.ts` (2), `policy-wiring.test.tsx` (6), `form-submissions-rejection.test.ts` (1), `use-calendar-data.test.ts` (1), `FormBuilder.edit.test.tsx` (2), `FormSubmissions-table.test.tsx` (1), `FormFill.currency.test.tsx` (3), `FormFill.submitBy.test.tsx` (1), `FormSubmissions.test.tsx` (1).

## Baseline Cypress (24 specs) — état initial

| Spec | Résultat initial |
|---|---|
| auth-real.cy.ts | 5/5 ✅ |
| cloud-sync.cy.ts | 1/1 ✅ |
| local-smoke.cy.ts | 3/3 ✅ |
| finance-deep.cy.ts | 2/5 ❌ |
| calendar.cy.ts | 0/1 ❌ |
| comprehensive-flow.cy.ts | 0/1 ❌ |
| cross-tenant.cy.ts | 0/1 ❌ |
| events-tasks.cy.ts | 0/1 ❌ |
| local-dashboard.cy.ts | 0/2 ❌ (spec obsolète) |
| (13 autres) | voir JOURNAL.md |

---

## Phase 1 — mises à jour (session 2026-10-22, ~19:30–20:30 UTC)

Défauts découverts **pendant** la session, non listés dans le tableau initial.
Tous ont été corrigés en base par migration versionnée, avec rollback, et
prouvés par un appel réel (REST/SQL) reproductible.

| # | Fonctionnalité | Défaut découvert | Preuve avant | Correctif | Preuve après | Migration |
|---|---|---|---|---|---|---|
| 29 | **Invitations — émission (QR/code)** | `generateCode()` appelé DEUX fois : le code affiché (QR + copier) n'était pas le code persisté → aucune invitation réclamable. De plus `createInvitationPS` générait un id différent de celui du service → id affiché ≠ id persisté (export fichier et claim visant une ligne inexistante) | Test unitaire ROUGE `invitation-code-consistency.test.ts` | `createInvitation` renvoie `{ id, code }` (code persisté) ; `createInvitationPS` réutilise l'id transmis | `V: invitation-code-consistency.test.ts` vert ; `npx vitest run` 60/60 fichiers | — (code) |
| 30 | **Invitations — limite d'usage (`max_uses`)** | Régression introduite par le durcissement `invitations` : `settle_invitation_claim` (SECURITY INVOKER) ne pouvait plus écrire `used_count` (policy filtrait sans erreur) → invitation réutilisable sans limite | Claim `max_uses=1` → `used_count=0` | Fonction repassée SECURITY DEFINER + EXECUTE retiré à PUBLIC/anon | Claim → `used_count=1` | `20261022000005` |
| 31 | **Profil — appartenance organisation** | `profiles.org_id` modifiable par UPDATE direct → rattachement à une organisation arbitraire (accès lecture via `is_org_member`) | `UPDATE profiles SET org_id='org-e2e'` accepté | Trigger `guard_profile_org_immutable` (BEFORE UPDATE) | `42501 ORG_ID_IMMUTABLE` | `20261022000005` |
| 32 | **Inscription / isolation des profils** | `handle_new_user` rattachait CHAQUE nouvel inscrit à `org-1` (organisation contenant de vraies adresses) → tout compte neuf lisait 59 profils | Compte neuf → `GET /profiles` = 59 | `handle_new_user` → `__no_org__` ; `upsert_profile` n'écrit plus `org_id` | 1 profil (le sien) | `20261022000006` |
| 33 | **Isolation — sentinelle « pas d'organisation »** | Après le correctif 32, la fuite se déplaçait sur `__no_org__` : `is_org_member` considérait tous les utilisateurs sans organisation comme membres d'une même organisation fictive | Compte neuf → 48 profils | `is_org_member` retourne `false` pour le sentinelle | 1 profil | `20261022000007` |
| 34 | **Fédération — visibilité des organisations** | La vue `org_family` n'avait pas `security_invoker` → contournait la RLS d'`organizations` : énumération de TOUTES les organisations, **même sans jeton** | `GET /org_family` sans jeton → 5 organisations | `security_invoker=true` + policy réécrite via `org_descendants(uid)` (SECURITY DEFINER, borné) | anon → 0 ; membre → 1 | `20261022000008` |
| 35 | **Surface d'API (fonctions RPC)** | `upsert_profile`, `is_org_member`, `current_org_id`, `org_descendants`, `can_manage_invitations` exécutables par `anon` ; `initplan_uid` à `search_path` mutable | Advisors Supabase (4 + 1 alertes) | EXECUTE retiré à anon/PUBLIC ; `search_path` figé | `POST /rpc/upsert_profile` sans jeton → 401 ; authentifié → 200 | `20261022000009` |

### Couverture de tests ajoutée / corrigée (Phase 1)

| Test | Type | Scénario | Résultat |
|---|---|---|---|
| `src/capabilities/__tests__/invitation-code-consistency.test.ts` | V | Le code et l'id renvoyés par `createInvitation` sont EXACTEMENT ceux persistés | vert |
| `cypress/e2e/rls-isolation-hardened.cy.ts` | C | Isolation RLS avec le **jeton réel** de l'utilisateur (les specs existantes `rls-leak`/`cross-tenant` utilisent la clé **anon** et ne testent donc pas l'utilisateur connecté) | à exécuter |

### Lacune de test identifiée (RISQUES R26)

`cypress/e2e/rls-leak.cy.ts` et `cross-tenant.cy.ts` envoient
`Authorization: Bearer <anonKey>` : ils valident le rôle `anon`, pas
l'utilisateur authentifié. Ils **ne peuvent pas** détecter une fuite
inter-utilisateurs (celle corrigée en 20261022000006/7). De plus `rls-leak`
échoue sur son assertion finale (« l'organisation courante est visible ») car
la clé anon ne voit aucune organisation. Le nouveau spec
`rls-isolation-hardened.cy.ts` lit le vrai jeton et comble ce trou.
