## Lumina v1.0.4 — Splash complet (slogan réécrit) + Releases documentées

### Nouveautés de cette release
- **Splash screen — slogan réécrit et complet** : le sous-titre ne se limite plus à
  « Gestion financière des églises » mais reflète l'ensemble réel des
  fonctionnalités livrées par le projet (voir `src/lib/features.ts`) :
  *« La gestion complète de votre église — finances, cultes, événements,
  dons, rapports et membres, en un seul endroit, même hors ligne. »*
  (finances/budgets/bilan, cotisations de cultes, événements, dons &
  campagnes, rapports inter-organisations, fédérations, membres,
  historique/archives, formulaires — + le mode hors ligne PowerSync).
- **Releases désormais systématiquement documentées** : le workflow
  `Release` lit un body de release commité (`.github/release-bodies/
  release-<version>.md`, générable via `scripts/generate-release-body.sh`)
  et le pousse avec `softprops/action-gh-release` — plus de releases
  vides/descriptives incomplètes.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina (fingerprints enregistrés dans
  Firebase / console Google Play).
- Assets : app-release.apk + app-release.apk.sha256 (hash compagnon POSIX
  lu par le self-updater, format sha256sum).

### Changelog technique (depuis v1.0.3)
- Slogan splash réécrit (phase « logo » et phase « illustration »).
- Workflow `release.yml` : nouveau step « Load release body » + input
  `body` sur `softprops/action-gh-release`.
- Nouveau `scripts/generate-release-body.sh` (template de body générique).
