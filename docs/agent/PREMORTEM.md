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
| PM1 | Déploiement → chunk obsolète → écran noir | cache/SW périmé après déploiement | 4 | 4 | 2 | 32 | `ChunkLoadError` → rechargement contrôlé (Phase 2) | C chaos chunk | à faire |
| PM2 | Deep link vers org B alors que A active → écriture dans B | contexte d'org non changé avant écriture | 3 | 5 | 3 | 45 | `resolveRoute` gère l'org du lien (Phase 2) | matrice deep link | à faire |
| PM3 | Droit révoqué hors ligne → mutations non autorisées poussées | file d'envoi sans revalidation | 3 | 4 | 4 | 48 | revalidation + explication (Phase 9) | C chaos droit révoqué | à faire |
| PM4 | Nouvelle table sans RLS → fuite inter-org | oubli d'activer RLS | 2 | 5 | 2 | 20 | requête d'audit « toute table a RLS + ≥1 politique » (Phase 8) | SQL audit | à faire |
| PM5 | Dernier admin quitte → organisation orpheline | pas de garde « ≥1 propriétaire » | 2 | 4 | 3 | 24 | invariant anti-orphelin (Phase 4) | V | à faire |
| PM6 | Offre gratuite : projet DB en pause → 1er accès échoue | mise en veille automatique | 3 | 3 | 2 | 18 | `keep-alive` (déjà en place) + écran de récupération | workflow keep-alive | partiel |
| PM7 | Session expirée pendant une saisie longue → perte de données | pas de sauvegarde de brouillon | 3 | 4 | 3 | 36 | état UX + reprise (Phase 5) | C session expirée | à faire |
| PM8 | Suppression d'un membre → écritures orphelines | suppression dure au lieu d'anonymisation | 2 | 5 | 2 | 20 | anonymisation, 0 orphelin (Phase 7) | C + SQL | à faire |
| PM9 | Cycle dans l'arbre d'organisations → récursion infinie | pas de contrainte anti-cycle | 2 | 5 | 2 | 20 | contrainte anti-cycle (Phase 3) | V + SQL | à faire |
| PM10 | Arbre très profond → requêtes lentes/expirées | absence d'index/table de fermeture | 3 | 3 | 3 | 27 | table de fermeture + index (Phase 3) | test profondeur ≥20 | à faire |
| PM11 | Fonction `SECURITY DEFINER` sans `search_path` figé → escalade | 7 fonctions exécutables par `authenticated` | 2 | 4 | 3 | 24 | `REVOKE EXECUTE`/`search_path` figé (Phase 8) | SQL advisors | à faire |
| PM12 | Rapport PDF énorme → mémoire/timeout mobile | génération sans pagination | 2 | 3 | 2 | 12 | génération paginée, échec explicite (Phase 7) | C volumétrie | à faire |
| PM13 | Arrondis/devise → totaux app ≠ PDF | flottants | 2 | 4 | 2 | 16 | montants entiers, devise explicite (Phase 7) | V + SQL | à faire |
| PM14 | Ancien APK incompatible avec le nouveau schéma de sync | pas de versionnage de schéma | 2 | 3 | 3 | 18 | écran « mise à jour requise » (Phase 1/2) | V | à faire |
| PM15 | Base locale pleine/corrompue → app inutilisable | pas de réinitialisation sûre | 2 | 3 | 2 | 12 | réinitialisation locale sûre (Phase 9) | C chaos | à faire |
| PM16 | Import/export CSV → injection de formules | cellule commençant par `=`/`+`/`@` | 2 | 3 | 2 | 12 | échappement des formules (Phase 8) | V + C | à faire |
| PM17 | Bouton cliqué deux fois → double écriture financière | pas d'anti double-soumission | 3 | 4 | 2 | 24 | `useSubmitGuard` (garde synchrone ref + `disabled`) sur les 4 actions financières de `TransactionDetail` | `V: useSubmitGuard.test.tsx` (3, jsdom : 2 clics = 1 appel) | **mitigé** (guard + test ; reste à étendre aux autres écrans financiers) |
| PM18 | Données locales de A visibles par B sur le même appareil | purge locale absente au logout | 2 | 5 | 3 | 30 | purge complète au logout (Phase 5) | C changement d'utilisateur | à faire |
| PM19 | Mutation en file jamais envoyée, sans indicateur | échec silencieux | 3 | 4 | 4 | 48 | `usePowerSyncIndicator.syncError` (uploadError/downloadError) + pill « échec d'envoi » sur le tableau de bord | `V: powersync-indicator.test.ts` (3, jsdom : upload/download) | **mitigé** (erreur désormais VISIBLE ; reste : indicateur par élément) |
| PM20 | Données de test en production | seeds non marqués `is_test` | 2 | 2 | 3 | 12 | marquage `is_test` + orgs de test dédiées | SQL audit | à faire |

> Ce registre est complété au fil des phases (chaque phase ajoute/actualise ses
> risques). Le pre-mortem final (Phase 11/17) doit être **sans risque critique non
> mitigé**.
