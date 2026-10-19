## Lumina v1.0.8 — Fix transition noire après le splash (écran d'inscription/connexion invisible)

### Problème
Après le splash, la transition vers l'écran d'inscription/connexion
(`/onboarding` ou `/auth`) tombait sur un **écran noir** au lieu
d'afficher la page cible. Cause : pendant la transition Ionic
(l'ancienne vue Splash se masque, la vue entrante est encore en
Suspense/lazy-load) l'écran derrière restait sur le fond natif du
WebView (noir), sans le fond sombre de l'app.

### Correctifs
- **Fond `var(--canvas)` forcé sur chaque `ion-page`**
  (`src/globals.css`) : les vues Ionic gardent le fond sombre de
  l'app pendant toute la transition, plus de flash noir.
- **Fond forcé sur `html`/`body` dès le 1er paint**
  (`index.html`, `background: #121212 !important`) : même si le
  bundle JS échoue, l'arrière-plan reste sombre.
- **Fond `var(--canvas)` sur `ion-app`** (`src/App.tsx`) :
  cohérence du fond sur tout l'arbre de l'app.
- **ErrorBoundary renforcé** : crash React → écran avec logo +
  message, pas d'écran vide/noir.
- **Navigation forcée après callback OAuth**
  (`src/hooks/useAppUrlOpen.ts`) : si le retour Google OAuth arrive
  pendant que l'app est sur une route publique (`/splash`, `/auth`),
  navigation forcée vers `/onboarding` ou `/dashboard` — plus
  d'attente figée sur une page publique.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina.
- Assets : app-release.apk + app-release.apk.sha256 (lu par le self-updater).

### Changelog technique (depuis v1.0.7)
- `globals.css` : `ion-page { background: var(--canvas) }`.
- `App.tsx` : `IonApp style={backgroundColor: "var(--canvas)"}`.
- `useAppUrlOpen.ts` : navigation forcée post-callback OAuth sur
  routes publiques.
- `useAppUrlOpen.ts` : import `useNavigate`/`useLocation` +
  `needsOnboarding` dynamique.
- `App.tsx` : `AppUrlOpenBridge` re-render sur `LUMINA_DEEPLINK_EVENT`.
- versionCode 8→9 / versionName 1.0.7→1.0.8.
