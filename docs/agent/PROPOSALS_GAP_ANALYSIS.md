# ANALYSE D'ÉCART — features manquantes (expert)

> Compagnon de `docs/agent/PROPOSALS.md`. Cette analyse **vérifie dans le code**
> (pas seulement dans les docs) l'état réel des features de robustesse /
> intégrité et identifie les **écarts partiels** — les features « présentes »
> mais incomplètes, qui sont les vrais risques résiduels.
>
> Règle du contrat : pendant l'absence du propriétaire, seules les features de
> **robustesse / intégrité** sont implémentées ; les autres restent en
> proposition. Seuls un risque de **perte de données** ou de **fuite
> inter-organisations** arrêtent un chantier.

## 1. Méthode

Audit statique + lecture des modules : routes (`src/ionic/routes/*`), services
de mutation (`src/lib/*service*.ts`), modules d'intégrité (`audit.ts`,
`backup.ts`, `group-lifecycle.ts`, `health.ts`, `featureFlags.ts`,
`makerChecker.ts`, `periodLock.ts`, `ownershipTransfer.ts`, `csv-import`),
hooks (`useBackupData`, `useGlobalSearch`), et les gardes de test
(`src/lib/__tests__/*guard*.test.ts`). Objectif : distinguer « la feature
existe » de « la feature est **complète et gardée** ».

## 2. État réel du contrat (vérifié dans le code)

| # | Feature | Présence code | Verdict |
|---|---|---|---|
| PR1 | Journal d'audit `/trace` | `src/pages/Trace.tsx`, `src/lib/audit.ts` | ✅ présent, **couverture partielle** (voir §3) |
| PR2 | Export/sauvegarde | `src/lib/backup.ts`, `useBackupData`, `SettingsGestion.tsx` | ⚠️ **export seulement**, pas d'import (voir §3) |
| PR3 | Corbeille / restauration `/archives` | `Archives.tsx`, `group-lifecycle.ts` | ⚠️ restauration OK, **pas de purge** (voir §3) |
| PR4 | Page de santé `/settings/health` | `Health.tsx`, `health.ts` | ✅ présent, erreurs récentes incluses |
| PR5 | Signaler un problème | `Health.tsx` (`sendProblemReportToIssues`) | ✅ présent |
| PR6 | Mise à jour requise | `schemaVersion.ts`, écran dédié | ✅ présent |
| PR7 | Drapeaux de fonctionnalités | `featureFlags.ts`, `feature-categories.ts` | ✅ présent |
| PR8 | Maker-checker | `src/lib/makerChecker.ts`, `TransactionDetail.tsx` | ✅ présent |
| PR9 | Pièces justificatives | `JustificatifsSection.tsx`, table `transaction_attachments` | ✅ présent |
| PR10 | Rappels de rapport | `src/lib/reportReminders.ts` | ✅ présent |
| PR11 | Recherche globale | `src/hooks/useGlobalSearch.ts`, `src/pages/Search.tsx` | ✅ présent |
| PR12 | Import CSV sécurisé | `csv-import`, garde anti-injection | ✅ présent |
| PR13 | Gel de période | `src/lib/periodLock.ts` | ✅ présent |
| PR14 | Transfert de propriété | `src/lib/ownershipTransfer.ts` | ✅ présent |
| PR16 | Centre d'aide / tutoriel | `src/pages/Tutorial.tsx` | ✅ présent |
| PR17 | Table de fermeture matérialisée | — | ⏸️ **non justifié** (mesuré : 3 orgs) |
| PR18 | RLS → `has_permission()` | partiel | ⏸️ migration progressive |
| PR19 | Alimentation `RouteState` | `App.tsx`, `route-state-wiring.test.ts` | ✅ présent |
| PR20 | Sort de `CENTRAL_ADMIN` | `src/capabilities/organization/central.ts` | ⏳ **décision propriétaire requise** |

Conclusion : **la liste du contrat est implémentée**. Les risques résiduels ne
sont donc pas « des features absentes » mais **des features incomplètes**.

## 3. Écarts identifiés (implémentables — robustesse / intégrité)

### Écart A — Couverture d'audit partielle (PR1 / NeverBreak #6)

- **Constat mesuré** : `grep -c writeAudit` → `0` dans `member-service.ts`,
  `cotisation-service.ts`, `versement-service.ts`, `group-service.ts`,
  `group-lifecycle.ts`, `event-service.ts`, `ownershipTransfer.ts`. Seuls
  `transaction-service.ts`, `reporting.ts`, `formSystem.ts`,
  `customFields.ts` écrivent l'audit.
- **Valeur** : l'invariant « AuditLog sur toute mutation » est **faux** pour
  les membres, cotisations, versements, groupes, événements et transferts.
- **Risque** : moyen (traçabilité incomplète ; pas de perte de données).
- **Coût** : moyen. **Dépendances** : `audit_entries` (existe).
- **Priorité** : P1. → **Agent G**.

### Écart B — Sauvegarde sans restauration (PR2)

- **Constat mesuré** : `grep -rniE "parseBackup|importBackup|restoreBackup"` →
  rien. On peut exporter (JSON/CSV) mais **pas réimporter**.
- **Valeur** : la promesse « réversibilité / passation » est à moitié tenue ;
  en cas de corruption, la sauvegarde n'est pas réapplicable dans le produit.
- **Risque** : faible (pas de fuite si le bornage org est strict).
- **Coût** : moyen. **Dépendances** : `dataLayer`, `backup.ts`.
- **Priorité** : P1. → **Agent H**.

### Écart C — Corbeille sans purge (PR3)

- **Constat mesuré** : `/archives` restaure (`lifecycle.restore`) mais aucune
  action de suppression définitive (ni UI, ni service, ni test).
- **Valeur** : une corbeille qui ne peut que grossir n'est pas exploitable.
- **Risque** : moyen (une purge mal gardée pourrait supprimer un élément
  **non archivé** → perte). La garde fail-closed est donc obligatoire.
- **Coût** : moyen. **Dépendances** : `group-lifecycle.ts`.
- **Priorité** : P2. → **Agent I**.

## 4. Propositions produit (NON implémentées pendant l'absence)

Ces items restent en proposition (cf. `PROPOSALS.md` PR8–PR16). Priorisation
experte affinée :

| # | Proposition | Valeur | Risque | Coût | Dépendances | Prio |
|---|---|---|---|---|---|---|
| PR20 | Trancher `CENTRAL_ADMIN` (rôle hors canon) | modèle d'autorisation cohérent ; débloque R141.e/R142 | moyen | faible | R109, R142 | **P1 (décision)** |
| PR18 | Migrer les politiques RLS vers `has_permission()` | une seule source de vérité RBAC | moyen | élevé | `has_permission` | P2 |
| PR17 | Table de fermeture matérialisée | perf fédération à grande échelle | faible | moyen | `org_family` | P2 (non justifié aujourd'hui) |
| PR8 | Maker-checker (déjà présent — **étendre** aux versements) | contrôle financier | moyen | élevé | RBAC | P2 |
| PR13 | Gel de période (déjà présent — **étendre** aux écritures en lot) | intégrité comptable | moyen | élevé | Phase 7 | P2 |
| PR9 | Reçus (déjà présent — **storage** distant si souhaité) | conformité | faible | moyen | storage | P2 |
| PR12 | Import CSV (déjà présent — **élargir** aux membres) | intégration | moyen | moyen | validation | P2 |
| PR14 | Transfert de propriété (déjà présent — **notifier** le destinataire) | anti-orphelin | moyen | moyen | Phase 4 | P2 |
| PR10 | Notifications rapport (déjà présent — **multi-canal**) | réactivité | faible | moyen | OneSignal | P3 |
| PR11 | Recherche globale (déjà présent — **index plein-texte**) | productivité | faible | moyen | index | P3 |
| PR15 | Statistiques d'usage anonymisées | pilotage | faible | faible | télémétrie | P3 |
| PR16 | Centre d'aide étendu | adoption | faible | moyen | Phase 13 | P3 |

## 5. Risques transverses (hors features)

- **Environnement E2E partagé + CI parallèle** : les specs d'isolation
  comparent des snapshots d'une base écrite en continu → flakies. Piste :
  espace d'org dédié au compte E2E. (Voir PR #247.)
- **R80 (sync des profils)** : le stream `profiles` ne synchronise que le
  profil connecté (`WHERE id = auth.user_id()`) — élargir exige un
  **redéploiement PowerSync Cloud** (hors périmètre sans le propriétaire).

## 6. Suivi

Chaque écart A/B/C fait l'objet d'une PR dédiée (agents G/H/I) avec : tests,
non-vacuité, ligne `COVERAGE_MATRIX.md`, et mise à jour de `PROPOSALS.md`.
