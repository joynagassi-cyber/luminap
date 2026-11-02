# PROPOSALS — features manquantes (contrat §6 / Phase 15)

> Analyser le produit comme un expert et **proposer** les features manquantes
> (valeur, risque, coût, dépendances, priorité). **N'implémenter pendant
> l'absence du propriétaire que celles qui relèvent de la robustesse ou de
> l'intégrité** (journal d'audit consultable, export/sauvegarde, corbeille,
> page de santé). Le reste reste en proposition.
>
> Ce fichier est le pendant « contrat » de `docs/agent/PROPOSITIONS.md`
> (document de session, P1→P41). Les propositions de session restent la
> référence détaillée ; ici on tient la liste contractuelle et sa catégorie.
>
> **Analyse d'écart experte** : `docs/agent/PROPOSALS_GAP_ANALYSIS.md` — vérifie
> dans le code l'état réel et identifie les features **partielles** (audit
> incomplet, sauvegarde sans import, corbeille sans purge), traitées par les
> PR dédiées (agents G/H/I).

## Robustesse / intégrité — implémentables pendant l'absence

| # | Proposition | Valeur | Risque | Coût | Dépendances | Prio |
|---|---|---|---|---|---|---|
| PR1 ✅ | Journal d'audit consultable (UI) — `/trace` + détail d'entrée. **Étendu (NeverBreak #6)** à members / cotisations / versements / groupes / événements / transferts : chaque mutation de ces services écrit désormais une entrée (`audit-coverage-guard.test.ts` + `audit-coverage-behavior.test.ts`) | traçabilité des actions sensibles | faible | moyen | audit_entries (existe) | P1 |
| PR2 ✅ | Export/sauvegarde des données (UI) — JSON + CSV, `useBackupData` ; **export + import/restauration (JSON)** (`backupImport.ts` : `parseBackupBundle` fail-closed + `planRestore` borné à l'org active) | réversibilité, passation | faible | moyen | dataLayer | P1 |
| PR3 ✅ | Corbeille / restauration (soft-delete) — `/archives` **+ purge / vidage corbeille** (`purgeEntity`, `purgeAllArchived`, garde fail-closed, audit `DELETE`) | anti-perte | moyen | moyen | archivage (existe) | P2 |
| PR4 ✅ | Page de santé (version, base, sync, dernières erreurs) | exploitation autonome | faible | faible | `client_errors`, PowerSync status | P1 |
| PR5 ✅ | Bouton « Signaler un problème » (contexte sans PII) | support | faible | faible | Sentry + `client_errors` | P2 |
| PR6 ✅ | Écran « mise à jour requise » — source de version **fournie** (`schemaVersion.ts`, R106 corrigé) | compat APK | faible | faible | schéma de sync | P1 |
| PR7 ✅ | Drapeaux de fonctionnalités (kill switches) | désactivation sûre | faible | faible | config | P1 |
| PR19 ✅ | Alimenter `RouteState` (hasPermission/isOrgMember/schema) dans `App.tsx` — R105/R107/R106/R142 câblés (`route-state-wiring.test.ts`) | défense en profondeur | moyen | moyen | RBAC canon + config | P1 |
| PR17 | Table de fermeture matérialisée (ancestor/descendant/depth) pour la fédération | perf des requêtes de famille à grande échelle | faible | moyen | `org_family` (existe) | P2 — **MESURÉ 2026-10-31 : NON JUSTIFIÉ** (3 orgs, 0 org enfant, clôture triviale = 3 lignes / 0 paire non-triviale ; `org_family` = CTE récursive sur 3 lignes). À rouvrir si la fédération dépasse ~des centaines d'organisations. |
| PR18 | Migration progressive des politiques RLS vers `has_permission()` (décision unique) | une seule source de vérité RBAC en base | moyen | élevé | `has_permission` (livrée) | P2 |
| PR20 | **Trancher le sort de `CENTRAL_ADMIN`** (rôle hors canon) : l'ajouter au canon (`Role`/`PERMISSION_MATRIX`/`role_permissions`) ou le retirer/remplacer. **Débloque** : R141.e (`org_reports_emitter` non durci) et lève l'ambiguïté de la garde R142 (actuellement fail-closed). | modèle d'autorisation cohérent | moyen | faible | R109 (ADMIN canonique), R142 | P1 |

## Produit — propositions (non implémentées pendant l'absence)

| # | Proposition | Valeur | Risque | Coût | Dépendances | Prio |
|---|---|---|---|---|---|---|
| PR8 | Approbation en deux étapes des dépenses (maker-checker) | contrôle financier | moyen | élevé | RBAC (Phase 4) | P2 |
| PR9 | Pièces justificatives (reçus) sur transactions | conformité | faible | moyen | storage | P2 |
| PR10 | Notifications (rappels de rapport à envoyer) | réactivité | faible | moyen | OneSignal | P3 |
| PR11 | Recherche globale | productivité | faible | moyen | index | P3 |
| PR12 | Import CSV sécurisé (anti-injection de formules) | intégration | moyen | moyen | validation | P2 |
| PR13 | Gel de période (clôture comptable) | intégrité | moyen | élevé | Phase 7 | P2 |
| PR14 | Transfert de propriété guidé | anti-orphelin | moyen | moyen | Phase 4 | P2 |
| PR15 | Statistiques d'usage anonymisées | pilotage | faible | faible | télémétrie | P3 |
| PR16 | Centre d'aide / tutoriel étendu | adoption | faible | moyen | Phase 13 | P3 |
| PR2.1 | Élargir le périmètre du backup (form_submissions, custom_field_values, cotisations, versements, budgets, *giving*) + remonter `counts.skipped` à l'UI | passation sans perte | faible | moyen | registre `RESTORE_ENTITIES` | P2 |
| PR4.1 | Persistance inter-sessions des erreurs client (`client_errors`) — IndexedDB local ou table serveur (PII à arbitrer) | diagnostic après rechargement | faible | moyen | `clientErrors.ts` | P3 |
| PR7.1 | Pilotage **distant** des kill switches (table config ou RPC) | désactivation sans rebuild | faible | moyen | `featureFlags.ts` | P3 |

> Règle : toute feature effectivement implémentée doit avoir **ses tests, son
> tutoriel (Phase 13) et sa ligne dans COVERAGE_MATRIX.md**.

## Écarts de couverture mesurés (2026-11-02, vérification PR1–PR7 par 7 agents)

Les 7 features robustesse/intégrité sont **implémentées** (vérifiées en lecture
seule, file:line). Écarts **de couverture** relevés — aucun n'est une fuite de
données ni un bloquant ; décisions ci-dessous.

| Écart | Constat | Décision |
|---|---|---|
| `client_errors` (PR4/PR5) | Le sink `client_errors` n'est **pas une table** : c'est un anneau **en mémoire** (`recentErrors`, `clientErrors.ts`), exposé par `getRecentErrors()` et lu par la page Santé (PR4) + le rapport de problème (PR5). Il est donc **session-scoped** (perdu au rechargement). | **Accepté en l'état** : le contrat §1.3 exige « zéro erreur non gérée », pas la persistance. La persistance inter-sessions (table serveur ou IndexedDB) reste une **proposition** (PII à arbitrer). Corriger la dépendance du tableau (elle dit « table » à tort). |
| `VITE_MIN_SCHEMA_VERSION` (PR6) | `schemaVersion.ts` + écran `update-required` sont câblés et testés (`schema-version.test.ts`, `route-resolver.test.ts`, `cypress/e2e/update-required.cy.ts`). Mais la variable n'est **déclarée dans aucun build** → la garde est **fail-open** (jamais déclenchée). | **Accepté** : fail-open est **volontaire** (documenté dans `schemaVersion.ts`). Rendre le blocage actif = **décision produit** (forcer la mise à jour des APK < v3). À trancher par le propriétaire ; le câblage (`.env`, `ci.yml`, `release.yml`) est trivial une fois la décision prise. |
| Kill switches **distants** (PR7) | `featureFlags.ts` fusionne `localStorage["lumina-flags"]` (prioritaire) et `VITE_FLAGS` (build). Aucune source **distante** (pas de table/RPC) → un kill switch se pilote par appareil ou au build, pas à distance. | **Accepté** : le contrat §6 demandait des « drapeaux de fonctionnalités (kill switches) », pas leur pilotage distant. Le pilotage distant reste une **proposition**. |
| Périmètre du backup (PR2) | L'export/restauration couvre 10 entités (`RESTORE_ENTITIES`) ; `form_submissions`, `custom_field_values`, `cotisations`, `versements`, budgets, tables *giving* ne sont ni exportés ni restaurés. | **Accepté** : pas d'asymétrie export/import (le cycle est cohérent), mais perte possible à la **passation**. Élargir le registre = **proposition** (PR2.1). |
| Détail d'audit hors `/trace` (PR1) | `auditLogRepo.list()` (`audit.ts`) ne sélectionne pas `before_state`/`after_state` (mis à `null`). `/trace` utilise `useAuditEntries` (complet), donc pas d'impact UI. | **Accepté** : aucun appelant n'exploite ce helper pour l'affichage détaillé. À corriger si un futur écran le consomme. |
