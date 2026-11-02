## Lumina v1.2.2 — Restauration de la logique de production + CI/CD entièrement verte

Release de **restauration** : la PR #400 (« refonte design ») avait écrasé la
logique métier auditée de `main` (et non seulement le style). Cette version
restaure le comportement de production et remet **toute** la chaîne CI/CD au vert.

### Ce qui était cassé (mesuré sur `main`)
- **CI Pipeline 100 % rouge** — Lint, TypeScript, Unit Tests et Build échouaient tous.
- **10 streams PowerSync supprimés** (`audit_entries`, `documents`, `org_budgets`,
  `org_budget_lines`, `giving_donors`, `giving_campaigns`, `pledges`,
  `tax_receipts`, `transaction_giving`, `report_definitions`) → **perte de
  données silencieuse** sur appareil neuf.
- ~40 pages de production réduites/mockées ; gardes R52 (disponibilité PowerSync)
  retirées ; purge PR3 débranchée de `/archives`.
- `cypress/support/e2e.ts` amputé de 215 lignes ; 11 fichiers de test affaiblis.

### Restauré
- Logique métier de production de `main` (112 fichiers) + suppression des
  artefacts morts de la refonte.
- Gardes de disponibilité PowerSync (invariant « pas encore lu » ≠ « vide »).
- Suite Cypress complète (`cleanupTestArtifacts`, `orgActiveId`, helpers cloud).

### Parcours vérifié de bout en bout (cloud réel)
- **Création d'organisation self-serve** → dashboard (aucun cul-de-sac).
- **Entrées / sorties** : création de transaction, édition, bascule Entrée/Sortie.
- **Bilan financier** : périodes (année/mois), cartes Entrées/Sorties.
- **Export du rapport en PDF** : ouverture du menu, choix du format, téléchargement.
- **Historique** : filtres « Ce mois / Cette année / Tout ».
- **Dashboard** : coquille réelle (caisse + navigation basse), jamais un squelette.
- **Synchronisation PowerSync** : session cloud, flux de synchronisation OK.

### Vérifications locales
- `tsc -b --force` : 0 erreur · `eslint` : 0 erreur · `vitest` : 245 fichiers /
  2496 tests · `vite build` : OK.
- **Cypress : 41 specs / 237 tests** (« All specs passed! »).

### Robustesse (PR1–PR7, déjà livrées, vérifiées)
Journal d'audit consultable, export/sauvegarde + restauration, corbeille/purge,
page de santé, « Signaler un problème » (sans PII), écran « mise à jour requise »,
drapeaux de fonctionnalités.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina (fingerprints enregistrés dans la
  console Firebase / Google Play).
- Assets : `app-release.apk` + `app-release.apk.sha256` (hash compagnon POSIX
  lu par le self-updater, format `sha256sum`).

### Mise à jour
- Depuis l'app Android : Paramètres → Mise à jour, ou notification automatique
  (vérification `releases/latest` toutes les 6 h).
- `versionCode` 14, `versionName` 1.2.2.

### Changelog technique (depuis v1.2.1)
- `fix(prod-green)` : restauration de la logique métier auditée clobberée par la PR #400.
- `test(e2e)` : adaptation de `members.cy.ts` au code restauré + ré-essais CI.
- `docs(contract)` : écarts de couverture PR1–PR7 tranchés + propositions dérivées.
