## Lumina v1.0.9 — Fix écran noir après le splash (commentaire HTML cassé) + splash accéléré

### Correctifs
- **Commentaire HTML cassé dans `index.html`** : le `<!--` d'ouverture
  manquait sur un bloc de commentaire, ce qui faisait afficher le texte
  du commentaire en clair au-dessus de l'écran (écran « noir » avec
  texte grisé au sommet) juste après le splash.
- **Temps du splash raccourci** : de 2.7s à 1.6s minimum (logo 0.8s +
  illustration 0.8s, `STUCK_SAFETY_NET_MS` réduit à 3s) — l'app passe
  plus vite à l'inscription/connexion.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina.
- Assets : app-release.apk + app-release.apk.sha256.

### Changelog technique (depuis v1.0.8)
- `index.html` : commentaire HTML réparé.
- `src/pages/Splash.tsx` : `PHASE_LOGO_MS` 1200→800, `PHASE_ILLUSTRATION_MS`
  1500→800, `STUCK_SAFETY_NET_MS` 6300→3000.
- `index.html` : timer de secours du splash HTML 15s→6s.
- versionCode 9→10 / versionName 1.0.8→1.0.9.
