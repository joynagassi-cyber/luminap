#!/usr/bin/env bash
# Génère un body de release complet (template générique — à personnaliser par
# release, cf. docs/release-body-template.md) et le stocke dans
# .github/release-bodies/release-<version>.md. Le workflow release.yml lit ce
# fichier (si présent) et le pousse comme body de la GitHub Release via
# softprops/action-gh-release (input `body`).
#
# Usage :
#   bash scripts/generate-release-body.sh 1.0.4
#   (le fichier de sortie sera .github/release-bodies/release-1.0.4.md)
#
# Ce script lit `package.json`, le lockfile des versions Capacitor et la liste
# des commits depuis le dernier tag, et génère un body cohérent pour chaque
# release — il ne faut plus "oublier" d'écrire le body à la main.

set -euo pipefail
VERSION="${1:?usage: generate-release-body.sh <version> (ex. 1.0.4)}"
OUT=".github/release-bodies/release-${VERSION}.md"
mkdir -p "$(dirname "$OUT")"

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
COMMITS="git log --oneline ${LAST_TAG}..HEAD"

{
  echo "## Lumina v${VERSION}"
  echo
  echo "### Nouveautés de cette release"
  echo "- *(à compléter par le mainteneur : résumé 1 à 3 puces des fonctionnalités livrées)*"
  echo
  echo "### Détails de la signature"
  echo "- APK signé v1+v2+v3 avec le keystore lumina (fingerprints enregistrés dans Firebase / console Google Play)."
  echo "- Assets : app-release.apk + app-release.apk.sha256 (hash compagnon POSIX lu par le self-updater, format sha256sum)."
  echo
  echo "### Changelog technique (depuis ${LAST_TAG:-premier tag})"
  eval "$COMMITS"
} > "$OUT"

echo "Body généré : $OUT"
cat "$OUT"
