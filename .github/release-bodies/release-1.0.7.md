## Lumina v1.0.7 — Fix écran noir après le splash

### Problème résolu
Après le splash, l'app montrait un **écran noir** au lieu de passer sur
l'inscription/connexion (onboarding). Cause : si le bundle JS / Ionic /
WebView ne chargeait pas ou plantait, le contenu React restait vide et le
WebView montrait son fond natif noir.

### Correctifs
- **Fond forcé sur `html`/`body` dès le 1er paint** (`index.html`,
  `background: #121212 !important`) : même si le bundle JS échoue,
  l'arrière-plan reste sombre (identique au canvas de l'app en mode dark)
  au lieu de retomber sur le noir natif du WebView.
- **Fond `var(--canvas)` sur `ion-app`** (`src/App.tsx`) : l'écran de
  l'app a un fond cohérent avec le theme, sans trou noir.
- **ErrorBoundary renforcé** : en cas de crash React, l'écran d'erreur
  affiche désormais le logo Lumina + un message lisible sur le fond de
  l'app, au lieu d'un écran vide/noir.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina.
- Assets : app-release.apk + app-release.apk.sha256 (lu par le self-updater).

### Changelog technique (depuis v1.0.6)
- `index.html` : `background: #121212 !important` sur `html, body`.
- `src/App.tsx` : `IonApp style={backgroundColor: "var(--canvas)"}` +
  ErrorBoundary avec fond + logo + message.
- versionCode 7→8 / versionName 1.0.6→1.0.7.
