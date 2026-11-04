import type { CapacitorConfig } from '@capacitor/cli';

// Variante « diagnostic » (A1 / C-05) : ce fichier est évalué par la
// CLI Capacitor (Node) au moment du `cap sync`. Avec
// `LUMINA_DIAGNOSTIC=true npx cap sync android`, le build devient
// inspectable (logs + debug distant de la WebView) pour le diagnostic
// sur appareil. SANS la variable, le défaut reste le durcissement
// production — ne jamais inverser ce défaut (garde :
// android-permissions-matrix.test.ts).
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env ?? {};
const diagnostic = env.LUMINA_DIAGNOSTIC === 'true';

const config: CapacitorConfig = {
  appId: 'com.lumina.mfejc',
  appName: 'Lumina',
  webDir: 'dist',
  // Production hardening: suppress all JS logs in release builds
  loggingBehavior: diagnostic ? 'debug' : 'none',
  // Root background color must match splash to avoid flash of white
  backgroundColor: '#121212',
  // Disable WebView zooming for production security
  zoomEnabled: false,
  server: {
    androidScheme: 'https',
  },
  android: {
    // Explicitly disable mixed content (default false, but document intent)
    allowMixedContent: false,
    // Disable remote debugging in release builds (default false, explicit).
    // La variante diagnostic (voir en-tête) l'active pour l'inspection
    // sur appareil ; sans LUMINA_DIAGNOSTIC elle reste à false.
    webContentsDebuggingEnabled: diagnostic,
    // Keep focus on webview for keyboard handling
    initialFocus: true,
  },
  ios: {
    // Mirror Android settings for when iOS project is scaffolded
    allowMixedContent: false,
    initialFocus: true,
    scrollEnabled: true,
    contentInset: 'never',
  },
  // Blocs `plugins` (A1→A3 / C-01) : ne configurer QUE des plugins
  // installés — sinon la config est ignorée en silence et simule un
  // branchement inexistant. L'ensemble EXACT des clés est verrouillé
  // par la garde android-permissions-matrix.test.ts :
  // - Keyboard (C-10) : stratégie explicite — redimensionnement natif
  //   de la WebView, y compris en plein écran edge-to-edge (Android
  //   15), faute de quoi le CTA collé des formulaires reste sous le
  //   clavier. `useKeyboardAvoidance` ne compense alors que le
  //   reliquat non redimensionné (anti double-compensation).
  // - SplashScreen (C-01, plugin installé en A3) : durée 0 — le thème
  //   natif Android 12+ (`AppTheme.NoActionBarLaunch` + fond #121212)
  //   couvre le chargement, puis l'unique page React `/splash` prend
  //   la main et appelle `SplashScreen.hide()`. L'ancien
  //   `launchShowDuration: 0`, mort faute de plugin, devient réel.
  plugins: {
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
