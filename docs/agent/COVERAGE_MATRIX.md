# COVERAGE_MATRIX — couverture feature × test

> Chaque ligne pointe vers **au moins un test vert** (V = vitest, C = Cypress,
> SQL = requête d'audit). Une feature sans test = ligne rouge.
> Mis à jour à chaque cycle.

## Correctifs transverses (baseline 2026-10-22→24)

| # | Feature / correctif | Test(s) | Statut |
|---|---|---|---|
| T1 | `PowerSyncProvider` monté | `C: members.cy.ts` | couvert |
| T2 | `usePowerSyncStatus` (registerListener) | `V` + sonde | couvert |
| T3 | Client Supabase B en mémoire seule | trace token | couvert |
| T4 | `cy.session()` (isolation Cypress 16) | `C: invitations.cy.ts` | couvert |
| T5 | `slot="input"` retiré (61 champs) | sonde DOM | couvert |
| T6 | `scroll-padding-top` (header) | `C: finance-deep.cy.ts` | couvert |
| T9 | `lumina-user` persisté | `V` + sonde | couvert |
| T10 | Cache `canAccess` invalidé | `V: useCanAccessMulti.test.tsx` | couvert |
| T11 | Contexte d'org réactif | `V` + `C` | couvert |
| T12 | `isInitializingRead()` borné | `V` 1049/1049 | couvert |

## Phases du contrat

| Phase | Feature | Test(s) | Statut |
|---|---|---|---|
| 2 | `resolveRoute` + registre unique | `V: route-resolver.test.ts` (32) | **couvert** |
| 2 | Écrans 404 / forbidden / needs-membership / update-required | `V: route-resolver.test.ts` (outcomes) + `V: useOrgMembership.test.tsx` + `V: needs-membership-escape.test.tsx` (échappatoire R120) + `V: r142-route-permission-wiring.test.ts` | **couvert** — needs-membership **câblé** (R107) + **échappatoire réelle** (R120) ; `forbidden` **câblé** (R142, 2026-10-31) |
| 2 | `data-screen-state` (shell + écrans d'état) | `C: zero-black-screen.cy.ts` (61) + `V: route-registry-drift` (5, dont couverture crawler + matrice deep link) | **couvert** (crawler livré + anti-dérive) |
| 2 | `ErrorBoundary` par route | `LazyRouteErrorBoundary` (pré-existant) | couvert |
| 2 | Watchdog `app-ready` (armé hors React, surcouche statique) | `V: boot-watchdog.test.ts` (4, jsdom) | **couvert** |
| 2 | `ChunkLoadError` rechargement | `V: chunk-error-recovery.test.ts` (3, jsdom) | **couvert** (anti-boucle) |
| 2 | Deep links (web + `appUrlOpen`) | `V: route-resolver.test.ts` (`parseDeepLink`, 7) | **couvert** (parsing) |
| 2 | `client_errors` capture + redaction PII | `V: client-errors.test.ts` (8) | **couvert** |
| 3 | Arbre multi-org : anti-cycle + clôture transitive | `V: org-tree.test.ts` (11) + preuves SQL | **couvert** |
| 3 | Table de fermeture matérialisée (perf) | — | proposition |
| 4 | RBAC décision unique DB↔TS | `V: permissions.test.ts` (19, dont garde registre↔matrice R105) + preuves SQL | **couvert** |
| 4 | RLS réécrites sur `has_permission` | — | proposition (PR18) |
| 5 | Auth parcours complets | `C: auth-real.cy.ts`, `sessions.cy.ts` | partiel |
| 6 | Invitations (code/QR/lien) | `C: invitations.cy.ts`, `V: invitation-rls-hardening`, `invitation-code-entropy`, `sync-config-invitations` | partiel (E1) |
| 7 | Finance transactions | `C: finance-deep.cy.ts`, `V: migration-notify-transaction` | partiel (R101/R102 corrigés) |
| 8 | Isolation RLS | `SQL` + `C: cross-tenant.cy.ts` | partiel (E1) |
| 8 | Injection d'organisation via le chemin INSERT de `profiles` (`upsert_profile(p_org_id)` + DELETE/INSERT direct) → lecture inter-org | `SQL: 20261101000004` (trigger BEFORE INSERT + upsert_profile borné) + `V: profile-org-insert-guard.test.ts` (3, non-vacuité vérifiée) | **couvert** (application live en attente — E9) |
| 8 | Invariant « RLS + ≥1 politique par table » (audit exécutable CI) | `V: rls-inventory.test.ts` (4) + `docs/agent/rls-inventory.json` | **couvert** |
| 8 | Surface RPC : aucune fonction de trigger `SECURITY DEFINER` exposée + garde R103 (`pg_trigger_depth`) | `V: revoke-trigger-functions.test.ts` (4) + `settle-claim-rpc-hardening.test.ts` (4) + preuves SQL | **couvert** (R115) |
| 8 | Escalade RPC (`settle_invitation_claim`) | `V: settle-claim-rpc-hardening` (4) + preuve SQL | **couvert** |
| 8 | Entrées hostiles : injection formule CSV | `V: csv-escape` (7) | **couvert** |
| 9 | Sync hors-ligne | `C: cloud-sync.cy.ts` (bloqué env.) | **bloqué (E2)** |
| 10 | Responsive / a11y | `C: responsive-skeleton.cy.ts` + `V: responsive-container-guard.test.tsx` | **couvert** (garde statique ; E2E en CI) |
| 10 | Responsive (contenu borné/centré, grand viewport ; R119) | `V: responsive-container-guard.test.tsx` (3 : 62 pages montées) | **couvert** |
| 11 | Pre-mortem / chaos | `V: chaos-offline-resilience.test.ts` (13, 5 scénarios) + `V: chaos-feature-catalogue.test.ts` (38, 7 domaines) | **couvert** (12 domaines au total) |
| 11 | Page « État du système » (santé, PR4) + « Signaler un problème » (PR5) | `V: health.test.ts` (22 : diagnostic copiable sans PII, **nom d'org au lieu de l'ID technique**, jamais le terme « PowerSync ») + `V: report-problem.test.ts` (32 : structure sans PII, **audit PII adversarial** — e-mail/jeton/téléphone/**nom de membre**/**orgId**, envoi réel, journal borné, **PII des tiers : noms de membres retirés par valeur**) + `C: robustness-features.cy.ts` (PR4 : état général + relevés ; PR5 : signalement réellement journalisé) | **couvert** (non-vacuité vérifiée : scrub `orgId` par valeur + `redact(note)` + **scrub des noms de membres** + affichage `orgName`) |
| 11 | Drapeaux de fonctionnalités (kill switches, PR7/R118) | `V: feature-flags.test.ts` (18 : fail-open, désactivation, surcharge locale, câblage) + `V: onesignal-killswitch.test.ts` (2 : comportemental — drapeau coupé ⇒ no-op, absent ⇒ init) | **couvert** |
| 12 | Crawler zéro écran noir | `C: zero-black-screen.cy.ts` (toutes routes × état marqué) | **couvert** (hors-cloud) |
| 13 | Tutoriel — guide visuel (captures annotées intégrées) | `V: screen-guide-gallery.test.tsx` (5 : manifeste cohérent + captures présentes + rendu) + `C: screen-guide.cy.ts` (2 : capture annotée réellement servie) | **couvert** (non-vacuité : section sans capture ⇒ pas de galerie) |
| 14 | Personnalisation profil/org | à créer (C) | **non couvert** |
| 10 | Anti double-soumission (actions financières) | `V: useSubmitGuard.test.tsx` (3, jsdom) | **couvert** (TransactionDetail ; autres écrans à étendre) |
| 9 | Erreur de sync VISIBLE (uploadError/downloadError → pill) | `V: powersync-indicator.test.ts` (3, jsdom) | **couvert** |
| 5 | Purge des données locales au changement de compte (PM18) | `V: local-data-ownership.test.ts` (4, jsdom) | **couvert** |
| 2 | Deep link inter-organisation → bascule confirmée (PM2) | `V: deeplink-org-switch.test.ts` (6, jsdom) | **couvert** |
| 7 | Brouillon de saisie longue (PM7) | `V: useFormDraft.test.tsx` (6, jsdom) | **couvert** |
| 4 | Invariant ≥1 administrateur par organisation (PM5) | `V: last-org-admin.test.ts` (4) + `SQL: 20261026000007` | **couvert** |
| 7 | Suppression de membre sans perte financière (PM8) | `V: member-deletion-guard.test.ts` (4) + `SQL: 20261026000008` | **couvert** |
| 9 | Catégories canoniques (R89.a, FK `transactions.category_id`) | `V: canonical-categories-drift` (4) + seed idempotent | **couvert** (FK vérifiée en base) |
| 11 | « Pas encore lu » ≠ « vide » (R52.b→R52.k) : squelettes + garde `isPowerSyncReadyNow()` / drapeaux `*Loaded` | `V: list-loading-vs-empty.test.tsx` (15), `V: r52k-forms-loading.test.tsx` (3), `V: Giving-loading`, `V: async-loading-vs-empty` | **couvert** (non-vacuité vérifiée) |
| 11 | Garde statique anti-récurrence R52 (verdict vide ⇒ signal de disponibilité) | `V: r52-readiness-guard.test.ts` (2, dont non-vacuité par sonde) | **couvert** |
| 11 | `/dashboard` : état vide ≠ pas encore lu (R52.l, branche `isLoading` morte) | `V: r52l-dashboard-loading.test.tsx` (2, non-vacuité vérifiée) | **couvert** |
| 11 | Listes principales `/members`, `/events`, `/groups`, `/cotisations`, `/notifications` (R52.m) | `V: list-loading-vs-empty.test.tsx` (5, non-vacuité vérifiée) | **couvert** |
| 11 | Détail `/group/:id` : « introuvable » avant lecture (R52.n) | `V: list-loading-vs-empty.test.tsx` (1, non-vacuité vérifiée) | **couvert** |
| 11 | `/reports` : « Aucun rapport personnalisé » avant lecture (R52.o) | `V: r52o-reports-loading.test.tsx` (1, non-vacuité vérifiée) | **couvert** |
| 11 | `DocumentPicker` : « Aucun document uploadé » avant lecture (R52.p) | `V: r52p-document-picker-loading.test.tsx` (2, non-vacuité vérifiée) | **couvert** |
| 11 | Garde statique : verdict vide gardé par un `isLoading` MORT (liste dérivée de dataLayer) | `V: r52-readiness-guard.test.ts` (3, sonde de non-vacuité) | **couvert** |
| 11 | `/balance`, `/history`, `/versement` : chiffres faux avant lecture (R52.q) | `V: r52q-finance-loading.test.tsx` (6, non-vacuité vérifiée) | **couvert** |
| 11 | Format d'affichage des montants (préférence locale, 4 styles) + solde de caisse exact (approuvé seulement, unité non doublée) | `V: money-format.test.ts` (11) + `V: money-unit-guard.test.ts` (2, garde statique « FCFA F ») + `V: versement-prefill.test.tsx` (6 : solde n'admet que l'APPROUVÉ, non-vacuité vérifiée) | **couvert** (non-vacuité vérifiée) |
| 11 | Garde statique : squelette gardé par un `isLoading` MORT sans disponibilité prouvée | `V: r52-readiness-guard.test.ts` (4, mutation de Balance.tsx) | **couvert** |
| 11 | `/settings/notifications` : « Tout est lu » avant lecture (R52.r) | `V: r52r-settings-notifications-loading.test.tsx` (2, non-vacuité vérifiée) | **couvert** |
| 11 | `/event/:id/edit` : « Chargement... » infini + nom non pré-rempli (R52.s) | `V: r52s-eventedit-loading.test.tsx` (3, non-vacuité vérifiée) | **couvert** |
| 11 | `/transaction/:id/edit` : formulaire vide en `ready` avant lecture (R52.t) | `V: r52t-transactionedit-loading.test.tsx` (3, non-vacuité vérifiée) | **couvert** |
| 11 | Export/sauvegarde des données (UI) — PR2 | `V: backup.test.ts` (12) + `V: SettingsGestion-backup.test.tsx` (5) + `V: useBackupData.test.tsx` (4, hook R52 + périmètre org, non-vacuité vérifiée) | **couvert** (non-vacuité vérifiée) |
| 11 | PR2 — import/restauration (JSON) : parsing fail-closed (`parseBackupBundle`), plan pur borné à l'org active (`planRestore`, anti-fuite inter-org) + écriture R160-safe + **audit `RESTORE` écrit par le writer** (NeverBreak #6, non contournable) | `V: backup-import.test.ts` (22, non-vacuité vérifiée : org/version) + `V: backup-restore.test.ts` (6 : SELECT-puis-INSERT/UPDATE sans UPSERT + audit RESTORE au niveau writer) + `V: SettingsGestion-import.test.tsx` (6 : plan, source transmise, refus autre org, RBAC, R52) + `C: backup-import-restore.cy.ts` (1 : fichier invalide refusé → plan sans écriture → écriture réelle en réplique + audit RESTORE, non-vacuité vérifiée) | **couvert** (non-vacuité vérifiée) |
| 11 | Journal d'audit consultable — détail d'entrée (PR1) | `V: Trace-detail.test.tsx` (5, dont verdict honnête « inchangé » — non-vacuité vérifiée) + `V: Trace-labels.test.tsx` (3) | **couvert** |
| 11 | Couverture d'audit étendue (NeverBreak #6) — members / cotisations / versements / groupes / événements / transferts écrivent chacun une entrée `/trace` | `V: audit-coverage-guard.test.ts` (6, garde statique + non-vacuité en mémoire) + `V: audit-coverage-behavior.test.ts` (7, comportemental : INSERT réel dans `audit_entries`, non-vacuité vérifiée) | **couvert** |
| 11 | Socle réglages par organisation `org_settings` (PR8 maker-checker + PR13 gel de période) | `V: org-settings.test.ts` (7) + `SQL: 20261031000007` + stream `org_settings` | **couvert** (fail-safe vérifié) |
| 11 | Statistiques d'usage anonymisées (PR15) — compteurs locaux sans PII + section « État du système » | `V: usage-stats.test.ts` (20) + `V: health-usage-stats.test.tsx` (3) | **couvert** (non-vacuité vérifiée) |
| 13 | Centre d'aide étendu (PR16) — recherche accents/casse + FAQ | `V: tutorial-search.test.ts` (16) + `V: Help-search.test.tsx` (8) | **couvert** (non-vacuité vérifiée) |
| 11 | PR18 — décision RBAC d écriture centralisée : aucune politique d écriture gardée par la seule appartenance | `V: pr18-write-permission-guard.test.ts` (5, sonde de non-vacuité) | **couvert** |
| 11 | Corbeille / restauration (soft-delete) — PR3 | `V: Archives-restore.test.tsx` (5 : dont R52 documents) + `V: lifecycle.test.ts` | **couvert** (non-vacuité vérifiée) |
| 11 | Corbeille — purge définitive (PR3) : `purgeEntity` (garde fail-closed « non archivé », bornage org, lignes filles) + `purgeAllArchived` (lot borné org, `olderThanDays`) + audit `DELETE` | `V: trash-purge.test.ts` (7, non-vacuité vérifiée : retirer la garde « non archivé » ⇒ échec) + `V: Archives-purge.test.tsx` (5 : RBAC, confirmation exigée, annuler n'appelle pas, non-vacuité vérifiée) + `C: archives-purge.cy.ts` (2 : annuler conserve / confirmer supprime réellement la ligne + audit DELETE ; vidage en lot, non-vacuité vérifiée) | **couvert** (non-vacuité vérifiée) |
| 11 | Import CSV sécurisé (PR12) — parseur anti-injection de formules + import transactions en brouillon | `V: csv-import.test.ts` (24) + `V: CsvImportPanel.test.tsx` (6) | **couvert** (non-vacuité vérifiée : sanitisation / en-tête / écriture sélective) |
| 11 | Transfert de propriété guidé — PR14 (anti-orphelin) | `V: ownership-transfer.test.ts` (16, non-vacuité vérifiée) + `V: TransferOwnership.test.tsx` (8, non-vacuité vérifiée) + `V: route-registry-drift.test.ts` + `SQL: 20261031000007` (org_settings, clé `owner_profile_id`) + `SQL: 20261022000010` (RLS org_memberships) | **couvert** |
| 11 | Recherche globale (PR11) : membres, groupes, événements, mouvements, documents, formulaires — cœur pur `globalSearch.ts` + `/search` + loupe `TopHeader` | `V: global-search.test.ts` (13) + `V: Search.test.tsx` (5) + `V: core-components.test.tsx` (loupe) + `V: route-registry-drift.test.ts` | **couvert** (non-vacuité vérifiée) |
| 11 | Rappels de rapport à envoyer (PR10) : décision pure `computeReportReminder` + livraison idempotente + bannière | `V: report-reminders.test.ts` (20, non-vacuité vérifiée ×4) + `V: ReportReminderBanner.test.tsx` (8, non-vacuité vérifiée) | **couvert** |
| 11 | Pièces justificatives (reçus) sur transactions — PR9 | `V: receipts.test.ts` (12 : validation taille/MIME, cloisonnement, suppression ligne+blob, purge, non-vacuité vérifiée) + `V: justificatifs-loading.test.tsx` (3 : squelette avant lecture, non-vacuité vérifiée) + `SQL: 20261031000008` (table `transaction_attachments` + RLS `transaction:update`) + `SQL: 20261031000009` (grants de réplication) + stream `transaction_attachments` | **couvert** (non-vacuité vérifiée) |
| 11 | Gel de période comptable (clôture) — PR13 : écriture refusée on/before la date close | `V: period-lock.test.ts` (règle pure) + `V: period-lock-enforcement.test.ts` (9, point d'étranglement dataLayer) + `V: period-lock-service-guards.test.ts` (4, services cotisation/versement) + `V: PeriodLockCard.test.tsx` (5, UI + RBAC) + `V: feature-flags.test.ts` (kill switch `period-lock`) | **couvert** (non-vacuité vérifiée par mutation) |
| 9 | Audience JWT du service PowerSync : `client_auth.additional_audiences` doit contenir `"authenticated"` (R132) — sinon 401 `PSYNC_S2105` sur chaque jeton → sync morte (écran muet) | `V: powersync-audience-guard.test.ts` (8, dont non-vacuité par YAML muté en mémoire) | **couvert** (non-vacuité vérifiée : `[]` ⇒ échec) |

## E2E Cypress — features robustesse & produit (2026-10-31)

> Couche E2E réelle (offline-first, réplique locale seedée) ajoutée par-dessus la
> couverture vitest. Runner : `CYPRESS_BASE_URL=http://127.0.0.1:8080 xvfb-run -a
> npx cypress run --browser chromium --spec <spec>`.

| # | Feature / scénario | Test(s) | Statut |
|---|---|---|---|
| 11 | PR13 — gel de période : clôture PERSISTE (round-trip `org_settings`) puis rouvre | `C: robustness-features.cy.ts` (PR13) | **couvert** (non-vacuité vérifiée : revert du correctif ⇒ échec) |
| 11 | PR8 — maker-checker : la bascule PERSISTE dans `org_settings` | `C: robustness-features.cy.ts` (PR8) | **couvert** (non-vacuité vérifiée) |
| 11 | PR15 — page Santé : bloc « usage » (liste OU état vide honnête) | `C: robustness-features.cy.ts` (PR15) | **couvert** |
| 11 | PR2 — export/sauvegarde : bouton JSON actif + téléchargement `lumina-sauvegarde-*.json` | `C: robustness-features.cy.ts` (PR2) | **couvert** |
| 11 | PR1 — journal d'audit `/trace` : état vide honnête (pas de faux chargement) | `C: robustness-features.cy.ts` (PR1) | **couvert** |
| 11 | PR3 — corbeille/restauration : cycle soft-delete → /archives → restauration réelle | `C: archives-restore.cy.ts` | **couvert** (non-vacuité vérifiée) |
| 11 | PR12 — import CSV : aperçu lignes valides, confirmation activée, annulation + modèle téléchargeable | `C: product-features.cy.ts` (PR12 ×2) | **couvert** |
| 11 | PR9 — pièces justificatives : section « Justificatifs » montée sur le détail transaction | `C: product-features.cy.ts` (PR9) | **couvert** |
| 11 | PR11 — recherche globale : zone de saisie + état vide honnête | `C: product-features.cy.ts` (PR11) | **couvert** |
| 13 | PR16 — aide : recherche renvoie des sections puis « aucun résultat » | `C: product-features.cy.ts` (PR16) | **couvert** |
| 11 | PR14 — `/admin/transfer-ownership` : jamais d'écran noir (étape ou accès refusé) | `C: product-features.cy.ts` (PR14) | **couvert** |
| 11 | Écran d'accueil mobile `/welcome` (onboarding avant `/auth`) : message inspirant + 2 boutons vers `/auth`, jamais d'écran noir | `C: welcome.cy.ts` (4) + `C: zero-black-screen.cy.ts` (`/welcome`) + `V: route-registry-drift.test.ts` | **couvert** |
| 11 | Invitations — capacités (grants) à l'émission ET au claim par code : mapping snake_case → camelCase des lignes PowerSync | `V: invitation-row-mapping.test.ts` (5) + `V: invitation-get-by-code.test.ts` (1) + `V: invitation-file-transport.test.ts` | **couvert** (non-vacuité vérifiée : retirer le mapper ⇒ échec) |
| 13 | Tutoriel — section « Inviter des membres » (capacités + rôle) | `V: tutorial-search.test.ts` (section `invitations`) | **couvert** |
| 11 | PR6 — écran "mise à jour requise" : version cliente incompatible ⇒ écran dédié, compatible ⇒ dashboard | `C: update-required.cy.ts` + `V: schema-version.test.ts` (12) + `V: route-resolver.test.ts` (branche `update-required`) | couvert (non-vacuité vérifiée) |
| 11 | PR7 — kill switch : fonctionnalité masquée quand le drapeau est OFF, visible quand ON | `C: feature-flags.cy.ts` + `V: feature-flags.test.ts` (fail-open) + `V: onesignal-killswitch.test.ts` | couvert (non-vacuité vérifiée) |
| 11 | PR19 — câblage `RouteState` dans `App.tsx` (hasPermission/isOrgMember/schema) : aucun champ inerte | `V: route-state-wiring.test.ts` (11) + `V: route-resolver.test.ts` | couvert (non-vacuité vérifiée) |
| 13 | Tutoriel — section « Erreurs fréquentes » : écran « Mise à jour requise » (PR6) | `V: tutorial-search.test.ts` + `V: Tutorial.test.tsx` | couvert |
| 11 | Formulaires — champs obligatoires signalés (`*`) et champs triviaux (description, commentaire, e-mail, téléphone) facultatifs : TransactionNew/Group, EventNew, Groups, Members, Giving, Budgets | `V: transaction-new-description-optional.test.tsx` (2) | **couvert** (non-vacuité vérifiée : ré-introduire `!trimmedDesc` ⇒ échec) |
| 11 | `transactions.description` (NOT NULL) — repli lisible (libellé de la catégorie) quand la description est vide, jamais NULL/'' | `V: transaction-new-description-optional.test.tsx` (payload non vide) | **couvert** |
| 11 | Mapping navigation — « Créer un culte » ouvre `/event/new` en mode Culte via query param (`?type=CULTE`), plus par `location.state` (non préservé par le routeur Ionic) | `V: event-new-type-mapping.test.tsx` (2) | **couvert** (non-vacuité vérifiée) |
| 11 | Caisses / comptes — ordre déterministe (caisse principale d'abord, puis groupes par nom) appliqué dans `useCaisses`/`useAccounts` | `V: caisse-order.test.ts` (4) + `V: caisses-order-hook.test.ts` (2, SQL réel) | **couvert** (non-vacuité vérifiée) |


### Correctif d'intégrité associé (R160, 2026-10-31)

`setOrgSetting` (`src/lib/orgSettings.ts`) faisait un `INSERT ... ON CONFLICT
(org_id, key) DO UPDATE` : côté client PowerSync expose chaque table comme une
**VUE**, donc l'écriture échouait avec « cannot UPSERT a view ». Conséquence :
les réglages PR8 (maker-checker) et PR13 (gel de période) n'étaient **jamais**
persistés — boutons en apparence inertes. Correctif : `SELECT id` puis `UPDATE`
ou `INSERT` explicite (seule forme acceptée par une vue). Garde unitaire : le
mock PowerSync des tests `org-settings` / `period-lock` / `period-lock-enforcement`
lève désormais « cannot UPSERT a view » (il simulait l'upsert en JS et masquait
le bug). Garde E2E : `robustness-features.cy.ts` (PR8/PR13) vérifie la
persistance réelle.

## Correctif d'intégrité associé (R161 — cul-de-sac « Organisation non rejointe », 2026-10-31)

Un compte tout juste créé (`MEMBRE` / `org_id = '__no_org__'`) qui suivait
l'onboarding « Je crée mon organisation » **ne pouvait pas créer d'organisation** :
`create_org` exigeait un grant `org_admins` ACTIVE que ce compte ne pouvait pas
avoir, et `OrgSetup.handleCreate` n'écrivait que du `localStorage` (aucun appel
serveur). La garde de route `needs-membership` (R107) bloquait alors le
dashboard — application **inutilisable** pour tout nouvel utilisateur.

Correctif : `create_org` distingue désormais la branche **SELF-SERVE** (compte
sans organisation → crée sa première organisation, devient `ADMIN`, rattache
`profiles.org_id`, écrit `org_memberships`) de la branche **ADMIN** (création
d'annexe). Côté client, `OrgSetup` appelle `bootstrapOrganization`, écrit un
**miroir local optimiste** (`mirrorNewOrganizationLocally`) **avant** de poser
le contexte d'organisation (ordre critique : sinon `useOrgMembership` conclut
« non-membre » sur la base locale encore vide), puis `refreshProfile`.

| # | Feature / correctif | Test(s) | Statut |
|---|---|---|---|
| 5 | Création d'organisation self-serve (compte neuf → org + grant + profil ADMIN) — R161 | `V: OrgSetup-selfserve.test.tsx` (4) + `V: mirror-new-org.test.ts` (3) + `C: self-serve-org.cy.ts` (1, cloud réel) | **couvert** (non-vacuité : retirer `bootstrapOrganization`/le miroir ⇒ échec) |
| 2 | Échappatoire de l'écran « Organisation non rejointe » (créer/rejoindre) — R120 | `V: needs-membership-escape.test.tsx` (5) | **couvert** |

## Observabilité → GitHub Issues (2026-11-01)

Chaîne complète **erreur client → Issue GitHub `openhands`** (correction
autonome OpenHands). Capture : `onerror`/`unhandledrejection`
(`clientErrors.ts`), ErrorBoundary racine (`App.tsx`) et par route
(`lazy-route.tsx`), erreurs de synchronisation PowerSync
(`SupabaseConnector.ts`) et tâches longues (`perfMonitor.ts`). Classification
(crash / functional / database / sync / performance), déduplication par
signature (client + serveur), file locale survivant au hors-ligne, puis envoi à
l'edge function `report-error` qui détient le jeton GitHub (jamais côté client)
et crée l'Issue. Le dépôt étant PUBLIC, le rapport est expurgé côté client
(aucune PII).

| # | Feature / correctif | Test(s) | Statut |
|---|---|---|---|
| 11 | Capture globale (crash / erreurs métier / DB / sync / perf) + rapport contextuel (stack, route, session, 5 derniers breadcrumbs) | `V: error-reporter.test.ts` (dont classification DB/sync/perf, dédup, file) + `V: breadcrumbs.test.ts` + `V: perf-monitor.test.ts` | **couvert** |
| 11 | Formatage de l'Issue (titre, corps contextuel, marqueur de signature, dédup serveur) | `V: report-error-issue.test.ts` | **couvert** (logique pure `issue.ts`, sans import Deno) |
| 11 | **Voie pré-login (anonyme) rate-limitée** : bucket = hash d'IP (IP jamais en clair), plafond serré vs authentifié, EXECUTE réservé au `service_role`, refus sans `service_role`, JWT forgé → voie anonyme | `V: report-error-throttle.test.ts` (12, logique pure `throttle.ts`) | **couvert** |
| 11 | Intégration : jeton GitHub hors client, label `openhands`, allowlist de dépôts, vérification d'appelant (`auth.getUser`), voie anonyme câblée, points de capture câblés | `V: error-to-issue-integration-guard.test.ts` (26, gardes statiques) | **couvert** |

## Addendum 2 — design de référence (jetons maquette dashboard-MF, 2026-11-01)

| # | Feature / correctif | Test(s) | Statut |
|---|---|---|---|
| 10 | Jetons de la maquette (B1) : `--bg/--text/--text-muted/--brand-fill` (alias), `--in/--out/--warn`, `--divider`, `--surface-nav`, `--brand-text` — présence + contrastes dans les deux modes | `V: design-tokens-addendum.test.ts` (10, non-vacuité : retouche de palette ⇒ échec) + `V: design-tokens-drift.test.ts` + `V: design-tokens-contrast.test.ts` | **couvert** |
| 10 | Mode d'affichage « système » par défaut (B2) + Inter embarquée (offline) | `V: theme-mode.test.ts` (système/clair/sombre, `resolveThemeMode`) + `V: boot-storage-resilience.test.ts` | **couvert** |
| 10 | Dashboard de référence : argent en `--in/--out`, section « À traiter » | `V: r52l-dashboard-loading.test.tsx` + `V: a11y-screens.test.tsx` | **couvert** |
| 10 | **Migration app-wide** des jetons d'argent `--data-{income,expense,expense-hover,pending}` → `--in/--out/--out-hover/--warn` (écrans, composants, tailwind, theme.ts, export PNG, SVG, Cypress) | `V: money-token-migration.test.ts` (4, non-vacuité : réintroduire `var(--data-income)` ⇒ échec) + `V: design-tokens-drift.test.ts` | **couvert** |
| 13 | Tutoriel / PDF : **aucune donnée de test** (E2E, demo, default-org, jean@example.com, E2E Org, MFE-JC) ; référence `docs/tutoriel/donnees-reelles.yaml` (église « MF ») | `V: tutorial-real-data.test.ts` (6, non-vacuité : réintroduire « Église MFE-JC » ou réimprimer `r["path"]` ⇒ échec) | **couvert** |

### Formatage des montants & intégrité des jetons (2026-11-01)

Parsing de montant unifié sur `parseAmountToCents` / `parseCurrencyAmount`
(`@/lib/amountInput`) : `parseFloat(x) * 100` tronquait la virgule FR
(« 1500,50 » → 1500) et `Number(x.replace(/[^\d]/g,"")) * 100` transformait
« 1500,50 » en 150050 FCFA. Les champs montant passent de `type="number"` à
`type="text"` + `inputMode="decimal"` (clavier décimal, virgule acceptée).

| # | Feature / correctif | Test(s) | Statut |
|---|---|---|---|
| 11 | Parsing de montant partagé (virgule FR, séparateurs de milliers, bornage 2 décimales, `null` jamais `NaN`) | `V: amount-input.test.ts` (8) | **couvert** |
| 11 | Conversion montant→centimes sans détruire la décimale (écrans finance, import CSV, formulaires, dons/promesses) | `V: money-conversion-guard.test.ts` (2, non-vacuité : réintroduire `Number(x.replace(/[^\d]/g,"")) * 100` ⇒ échec) + `V: csv-import.test.ts` + `V: formSystem-currency.test.ts` | **couvert** (non-vacuité vérifiée) |
| 10 | Intégrité des jetons : aucun `var(--X)` applicatif ne référence un jeton non défini (hors `--radix-*`/`--sidebar-*` runtime) | `V: design-token-undefined-guard.test.ts` (3, non-vacuité : réintroduire `var(--danger)` ⇒ échec) | **couvert** (non-vacuité vérifiée) |

### Synchronisation PowerSync — couverture schéma ↔ streams (2026-11-01)

DÉFAUT MESURÉ (audit 360°, vérifié contre la config PowerSync **déployée** via
`powersync fetch status`) : 9 tables du schéma client étaient lues en SQL LOCAL
(`useQuery`/`db.execute`) mais **aucun stream** ne les synchronisait → réplique
toujours VIDE, appareil neuf sans données, sans erreur visible. Corrigé par
l'ajout des streams (filtre direct `org_id IN (SELECT org_id FROM profiles WHERE
id = auth.user_id())`, éprouvé R89.b). Vérifié en base : toutes portent `org_id`
et figurent dans la publication `powersync`.

| # | Feature / correctif | Test(s) | Statut |
|---|---|---|---|
| 11 | Toute table du schéma client lue en LOCAL a un stream PowerSync (défaut : `audit_entries` PR1 `/trace` 5 250 lignes, `documents`, `org_budgets`, `org_budget_lines`, `giving_donors`, `giving_campaigns`, `pledges`, `tax_receipts`, `transaction_giving`) | `V: sync-stream-coverage.test.ts` (3, non-vacuité : retirer un stream ⇒ échec) | **couvert** (non-vacuité vérifiée) |
