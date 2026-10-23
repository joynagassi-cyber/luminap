# Modèle de domaine Lumina (déduit du code et de la base)

> Session agent — 2026-10-22. Source : `supabase/migrations/*`, `powersync/sync-config.yaml`,
> `src/lib/*.ts`, `src/types/index.ts`, `src/ionic/routes/*`.

## Hiérarchie des entités

```
auth.users (Supabase Auth — 1 ligne par compte)
   │ 1:1 (trigger handle_new_user)
   ▼
profiles ─── org_id ──────► organizations        (org « primaire », legacy 1:1)
   │                            ▲
   │ N:N (org_memberships)      │ parent_org_id (fédération)
   └────────────────────────────┘

organizations ──1:N──► org_units (annexes / unités : église, salle, antenne)
organizations ──1:N──► groups (groupes : chorale, département…)
organizations ──1:N──► members (personnes PHYSIQUES, non-comptes)
organizations ──1:N──► accounts (comptes financiers / caisses canoniques)
organizations ──1:N──► caisses (caisses legacy, encore utilisées par l'UI)
organizations ──1:N──► categories (catégories de transaction)
organizations ──1:N──► events (cultes, événements) ──1:N──► event_tasks
organizations ──1:N──► form_definitions ──1:N──► form_submissions
organizations ──1:N──► custom_field_definitions ──1:N──► custom_field_values
organizations ──1:N──► invitations ──1:N──► invitation_claims
organizations ──1:N──► org_budgets ──1:N──► org_budget_lines
organizations ──1:N──► giving_campaigns, giving_donors, pledges, tax_receipts
organizations ──1:N──► documents, tags, grants, report_definitions

accounts ──1:N──► transactions (mouvements : entrée/sortie/dépense…)
accounts ──1:N──► versements (transferts compte→compte)

events ──1:N──► event_budgets ──1:N──► budget_lines
events ──1:N──► cotisations (cotisations de culte)
groups ──1:N──► group_memberships ──► members
transactions ──1:N──► audit_entries (traçabilité)
transactions ──1:N──► notifications (trigger notify_transaction_change)

organizations ──N:N──► organizations  (fédération : parent_org_id + table org_family)
organizations ──1:N──► org_reports (rapports inter-organisations from_org_id → to_org_id)
```

## Vocabulaire ambigu — interprétation retenue

| Terme | Ambiguïté | Interprétation retenue (cohérente avec le code) |
|-------|-----------|--------------------------------------------------|
| **Organisation** | Structure juridique vs. entité affichée | `organizations` = entité de premier niveau (église locale, école, ONG). Porte l'isolation des données (`org_id`). |
| **Annexe** | Parfois « org_units », parfois « org enfant » | **Deux notions coexistent** : (1) `org_units` = annexe *interne* à une organisation (salle, site, département — pas d'isolation RLS propre, partage l'`org_id`) ; (2) org *enfant* via `parent_org_id` = organisation à part entière rattachée à une org mère (fédération, isolation RLS propre). La spec « une annexe peut générer un rapport » vise (2) — c'est `org_reports`. |
| **Membre** | Compte utilisateur vs. personne | `members` = personne physique de l'annuaire (n'a pas forcément de compte). Le compte utilisateur = `auth.users` + `profiles`. Un `member` peut être lié à un compte mais ce n'est pas obligatoire. |
| **Rôle** | `profiles.role` (global) vs `org_memberships.role` (par org) vs `role_assignments` | `profiles.role` = rôle historique mono-org (ADMIN, PASTEUR_PRINCIPAL, TRESORIER, MEMBRE…). `org_memberships.role` = rôle par organisation (modèle multi-org cible). `role_assignments` = attributions par session (legacy). |
| **Caisse** | `caisses` vs `accounts` | `accounts` = modèle canonique (owner_type/owner_id). `caisses` = modèle legacy, encore lu par le Dashboard et Versement. Les deux coexistent ; la convergence est un chantier (voir PROPOSITIONS.md). |
| **Rapport** | `report_definitions` (requête sauvegardée) vs `org_reports` (document transmis) | `report_definitions` = définition de requête réutilisable. `org_reports` = rapport transmis d'une org à une autre (fichier + métadonnées). |

## Rôles et permissions

Source : `src/lib/rbac.ts`, `src/lib/features.ts`, `profiles.role`, `org_memberships.role`.

- Rôles métier : `ADMIN`, `PASTEUR_PRINCIPAL`, `TRESORIER`, `SECRETAIRE`, `MEMBRE` (valeurs texte libres côté `profiles.role`).
- Admin central : `org_admins` (grant ACTIVE) — donne le droit de créer/administrer des organisations.
- Fédération : `org_family` (vue récursive ancêtre→descendant) — un admin d'une org mère voit sa famille.
- Les permissions par fonctionnalité sont déclarées dans `src/lib/features.ts` (`requiresRole`, `requiresPermission`) et vérifiées côté client (`canAccess`) ; côté serveur, seule l'appartenance à l'organisation (`is_org_member`) est vérifiée par RLS.

## Isolation des données (état constaté)

- RLS : toutes les tables `public` sont en RLS. Le prédicat quasi-unique est
  `is_org_member(initplan_uid(), org_id)` (ou dérivé transitif).
- PowerSync : `powersync/sync-config.yaml`, édition 3, 31 streams.
- **Écarts constatés** (détaillés dans FEATURES.md / RISQUES.md) :
  - `categories`, `org_units`, `caisses` sont synchronisés **sans filtre d'organisation**
    (`SELECT * FROM categories`) alors qu'ils portent un `org_id` → fuite de données inter-org
    côté client PowerSync.
  - `grants`, `tags`, `tag_assignments` ont une politique RLS `SELECT USING (true)` → lecture
    de toutes les lignes de toutes les organisations par tout utilisateur authentifié.
