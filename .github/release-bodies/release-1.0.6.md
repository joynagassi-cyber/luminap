## Lumina v1.0.6 — Design splash appliqué + hard fix « bloqué sur le splash »

### Problème résolu
- **Fix bug « bloqué 10 min+ sur l'écran de splash »** : le splash statique
  (`index.html`, z-index 9999, opaque) n'était masqué que par
  `#root.is-hydrated` (posé par le bundle JS). Si le bundle/Ionic/WebView ne
  finissait jamais de s'exécuter (chargement, crash, PWA figée), le div restait
  à l'écran indéfiniment. Un **timer inline de sécurité dans `index.html`**
  (indépendant du bundle, tourne au DOMContentLoaded) masque le splash de force
  après 15 s au pire cas. L'app ne peut plus rester figée sur le splash statique.

### Design (vraiment appliqué aux 2 couches de splash)
- **Slogan final** « Une gestion complète, une foi partagée. » maintenant
  **partout** : splash HTML statique (`index.html`) + splash React
  (`src/pages/Splash.tsx`, 2 phases) — avant, seul le splash React l'avait.
- **Logo 160px** (au lieu de 96px) sur le splash statique, aligné avec le
  React ; texte blanc monochrome (`--text-primary` / `--text-secondary`),
  plus de accent orange `#ff6b00` ni glow/ombre.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina (fingerprints enregistrés dans
  Firebase / console Google Play).
- Assets : app-release.apk + app-release.apk.sha256 (hash compagnon POSIX
  lu par le self-updater, format sha256sum).

### Changelog technique (depuis v1.0.5)
- `index.html` : timer inline 15 s qui masque `.splash-splash-html` de force.
- `index.html` + `src/globals.css` : logo 160px, slogan court, texte blanc.
- versionCode 6→7 / versionName 1.0.5→1.0.6.
