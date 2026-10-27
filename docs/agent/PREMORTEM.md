# PREMORTEM — registre des risques d'échec en production

> Hypothèse : dans 4 mois, Lumina a échoué en production. Pour chaque scénario :
> *scénario · cause racine hypothétique · signal précurseur · probabilité (P 1-5)
> · impact (I 1-5) · détectabilité (D 1-5) · priorité (P×I×D) · mitigation · test
> qui la couvre · statut*.
>
> **Tout risque critique (priorité élevée) reçoit une mitigation implémentée et un
> test.** Ce registre instancie les graines du contrat §5.3 et les risques déjà
> connus (R89, R98, R99).

## Risques critiques

| # | Scénario | Cause racine hypothétique | P | I | D | Prio | Mitigation | Test | Statut |
|---|---|---|---|---|---|---|---|---|---|
| PM1 | Déploiement → chunk obsolète → écran noir | cache/SW périmé après déploiement | 4 | 4 | 2 | 32 | `installChunkErrorRecovery` (`vite:preloadError` → rechargement contrôlé, 1×/session) | `V: chunk-error-recovery.test.ts` (3) | **mitigé** |
| PM2 | Deep link vers org B alors que A active → écriture dans B | contexte d'org non changé avant écriture | 3 | 5 | 3 | 45 | `useAppUrlOpen` mémorise l'org visée (`deepLinkIntent`) → `RouteGuard` alimente `linkOrgId` → `org-switch-required` → `OrgSwitchScreen` (confirmation) + `enterOrganization` (garde d'accès) | `V: deeplink-org-switch.test.ts` (6) + `route-resolver.test.ts` | **mitigé** |
| PM3 | Droit révoqué hors ligne → mutations non autorisées poussées | file d'envoi sans revalidation | 3 | 4 | 4 | 48 | la RLS serveur rejette (42501 → FATAL-SKIP : l'op est jetée, jamais appliquée) ; l'utilisateur est averti via l'indicateur d'erreur de sync (PM19) | `V: powersync-indicator.test.ts` (erreur visible) | **partiel** (sécurité OK ; explication par élément à faire) |
| PM4 | Nouvelle table sans RLS → fuite inter-org | oubli d'activer RLS | 2 | 5 | 2 | 20 | garde d'inventaire RLS (RLS + ≥1 politique par table, exécutable en CI) | `V: rls-inventory.test.ts` (4) | **mitigé** |
| PM5 | Dernier admin quitte → organisation orpheline | pas de garde « ≥1 propriétaire » | 2 | 4 | 3 | 24 | `assertNotLastOrgAdmin` (central.ts#revokeOrgAdmin) + trigger `trg_org_admins_not_last` (`org_assert_not_last_admin`, migration 20261026000007) | `V: last-org-admin.test.ts` (4) + `organization-central.test.ts` ; `SQL: transaction annulée T1/T2/T3/T4` ; trigger vérifié en base | **mitigé** |
| PM6 | Offre gratuite : projet DB en pause → 1er accès échoue | mise en veille automatique | 3 | 3 | 2 | 18 | `keep-alive.yml` (ping REST toutes les 48 h) + écran de récupération au boot | workflow `keep-alive.yml` (déclenché, HTTP 200) | **mitigé** |
| PM7 | Session expirée pendant une saisie longue → perte de données | pas de sauvegarde de brouillon | 3 | 4 | 3 | 36 | `useFormDraft` (localStorage `lumina-draft:*`) : saisie persistée en continu, restaurée à la réouverture, effacée à la soumission ; avis « Brouillon restauré » + « Recommencer » | `V: useFormDraft.test.tsx` (6, jsdom) | **mitigé** (FormFill ; généralisable aux autres formulaires) |
| PM8 | Suppression d'un membre → écritures orphelines | suppression dure au lieu d'anonymisation | 2 | 5 | 2 | 20 | anonymisation, 0 orphelin (Phase 7) | C + SQL | à faire |
| PM9 | Cycle dans l'arbre d'organisations → récursion infinie | pas de contrainte anti-cycle | 2 | 5 | 2 | 20 | `org_assert_no_cycle` (trigger DB) + garde anti-cycle côté client | `V: org-tree.test.ts` (anti-cycle, 5) + SQL | **mitigé** |
| PM10 | Arbre très profond → requêtes lentes/expirées | absence d'index/table de fermeture | 3 | 3 | 3 | 27 | `idx_organizations_parent` (index) + vue de fermeture `org_descendants` (CTE récursive) | `V: org-tree.test.ts` (profondeur) | **mitigé** |
| PM11 | Fonction `SECURITY DEFINER` sans `search_path` figé → escalade | 7 fonctions exécutables par `authenticated` | 2 | 4 | 3 | 24 | `search_path` figé sur **15/15** fonctions SECURITY DEFINER (mesuré en base) ; `EXECUTE` restreint à `authenticated` | SQL mesuré (pg_proc.proconfig) | **mitigé** |
| PM12 | Rapport PDF énorme → mémoire/timeout mobile | génération sans pagination | 2 | 3 | 2 | 12 | `jspdf-autotable` pagine automatiquement (`addPage` géré par la lib) | `V` export + revue de code | **mitigé** |
| PM13 | Arrondis/devise → totaux app ≠ PDF | flottants | 2 | 4 | 2 | 16 | montants en entiers (centimes) + parseur currency FR/US centralisé | `V: formSystem-currency.test.ts` (10) | **mitigé** |
| PM14 | Ancien APK incompatible avec le nouveau schéma de sync | pas de versionnage de schéma | 2 | 3 | 3 | 18 | écran « mise à jour requise » (Phase 1/2) | V | à faire |
| PM15 | Base locale pleine/corrompue → app inutilisable | pas de réinitialisation sûre | 2 | 3 | 2 | 12 | réinitialisation locale sûre (Phase 9) | C chaos | à faire |
| PM16 | Import/export CSV → injection de formules | cellule commençant par `=`/`+`/`@` | 2 | 3 | 2 | 12 | échappement des préfixes de formule (`= + - @`, TAB/CR/LF) + guillemets | `V: csv-escape.test.ts` (7) | **mitigé** |
| PM17 | Bouton cliqué deux fois → double écriture financière | pas d'anti double-soumission | 3 | 4 | 2 | 24 | `useSubmitGuard` (garde synchrone ref + `disabled`) sur les 4 actions financières de `TransactionDetail` | `V: useSubmitGuard.test.tsx` (3, jsdom : 2 clics = 1 appel) | **mitigé** (guard + test ; reste à étendre aux autres écrans financiers) |
| PM18 | Données locales de A visibles par B sur le même appareil | purge locale absente au logout | 2 | 5 | 3 | 30 | `ensureLocalDataOwnedBy(userId)` : purge des clés `lumina-*` + org mémoire au 1er login d'un AUTRE compte | `V: local-data-ownership.test.ts` (4, jsdom : même/autre compte, 1er, null) | **mitigé** |
| PM19 | Mutation en file jamais envoyée, sans indicateur | échec silencieux | 3 | 4 | 4 | 48 | `usePowerSyncIndicator.syncError` (uploadError/downloadError) + pill « échec d'envoi » sur le tableau de bord | `V: powersync-indicator.test.ts` (3, jsdom : upload/download) | **mitigé** (erreur désormais VISIBLE ; reste : indicateur par élément) |
| PM20 | Données de test en production | seeds non marqués `is_test` | 2 | 2 | 3 | 12 | marquage `is_test` + orgs de test dédiées | SQL audit | à faire |

> Ce registre est complété au fil des phases (chaque phase ajoute/actualise ses
> risques). Le pre-mortem final (Phase 11/17) doit être **sans risque critique non
> mitigé**.

## Réconciliation 2026-10-26 (session « hardening »)

Les statuts « à faire » de la première version du registre étaient **antérieurs
à la livraison des mitigations** : plusieurs lignes décrivaient un risque déjà
couvert par du code + un test en place. Vérification faite contre le code réel
et la base (chaque mitigation cite sa preuve mesurée) :

| Reclassés en **mitigé** | Preuve |
|---|---|
| PM1 chunk obsolète | `installChunkErrorRecovery` + `V: chunk-error-recovery.test.ts` (3) |
| PM4 nouvelle table sans RLS | `V: rls-inventory.test.ts` (4) |
| PM6 projet DB en pause | `keep-alive.yml` déclenché (HTTP 200) |
| PM9 cycle d'arbres | `org_assert_no_cycle` + `V: org-tree.test.ts` |
| PM10 arbre profond | `idx_organizations_parent` + vue `org_descendants` |
| PM11 SECURITY DEFINER sans `search_path` | **15/15** fonctions avec `search_path` figé (mesuré `pg_proc.proconfig`) |
| PM12 PDF énorme | `jspdf-autotable` pagine |
| PM13 arrondis/devise | `V: formSystem-currency.test.ts` (10) |
| PM16 injection de formules CSV | `V: csv-escape.test.ts` (7) |
| PM17 double soumission | `V: useSubmitGuard.test.tsx` (3) — PR #43 |
| PM18 fuite locale inter-comptes | `V: local-data-ownership.test.ts` (4) — PR #45 |
| PM19 échec d'envoi silencieux | `V: powersync-indicator.test.ts` (3) — PR #44 |

Reclassés en **partiel** (sécurité assurée, confort restant) : PM3 (la RLS
serveur rejette l'op hors droits ; l'explication par élément à l'utilisateur
reste à faire).

**Restent ouverts** (nécessitent une décision/chantier) : PM8 (anonymisation au
lieu de suppression dure), PM14 (versionnage de schéma), PM15 (réinitialisation
locale exposée dans l'UI), PM20 (marquage `is_test`).

**Il reste UN risque impact 5 non mitigé : PM8** (suppression dure d'un membre →
écritures orphelines). PM2 (impact 5), PM9 (impact 5) et PM18 (impact 5) sont
**mitigés** ; PM5 (impact 4) et PM7 (impact 4) sont désormais **mitigés**
(garde anti-orphelin d'organisation, brouillon de saisie longue).
