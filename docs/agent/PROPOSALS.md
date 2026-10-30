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

## Robustesse / intégrité — implémentables pendant l'absence

| # | Proposition | Valeur | Risque | Coût | Dépendances | Prio |
|---|---|---|---|---|---|---|
| PR1 | Journal d'audit consultable (UI) | traçabilité des actions sensibles | faible | moyen | audit_entries (existe) | P1 |
| PR2 | Export/sauvegarde des données (UI) | réversibilité, passation | faible | moyen | dataLayer | P1 |
| PR3 | Corbeille / restauration (soft-delete) | anti-perte | moyen | moyen | archivage (existe) | P2 |
| PR4 ✅ | Page de santé (version, base, sync, dernières erreurs) | exploitation autonome | faible | faible | `client_errors`, PowerSync status | P1 |
| PR5 | Bouton « Signaler un problème » (contexte sans PII) | support | faible | faible | Sentry + `client_errors` | P2 |
| PR6 | Écran « mise à jour requise » — écran OK mais **source de version absente** (R106) | compat APK | faible | faible | schéma de sync | P1 |
| PR7 ✅ | Drapeaux de fonctionnalités (kill switches) | désactivation sûre | faible | faible | config | P1 |
| PR19 | Alimenter `RouteState` (hasPermission/isOrgMember/schema) dans `App.tsx` — débloque R105/R107, dépend PR18 (R16) | défense en profondeur | moyen | moyen | RBAC canon + config | P1 |
| PR17 | Table de fermeture matérialisée (ancestor/descendant/depth) pour la fédération | perf des requêtes de famille à grande échelle | faible | moyen | `org_family` (existe) | P2 |
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

> Règle : toute feature effectivement implémentée doit avoir **ses tests, son
> tutoriel (Phase 13) et sa ligne dans COVERAGE_MATRIX.md**.
