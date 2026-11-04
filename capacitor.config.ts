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
  // Aucun bloc `plugins` (A1 / C-01) : ne JAMAIS configurer ici un
  // plugin absent de package.json — la config est silencieusement
  // ignorée et simule un branchement inexistant.
  // - Splash : le mécanisme retenu est le thème natif Android 12+
  //   (`AppTheme.NoActionBarLaunch` + `@drawable/splash`, fond
  //   #121212) suivi de l'unique page React `/splash` ;
  //   `@capacitor/splash-screen` n'est volontairement PAS installé
  //   (l'ancien bloc `launchShowDuration: 0` n'a jamais eu d'effet).
  // - Notifications push (OneSignal) : branchement réel en phase A2 ;
  //   l'appId vit dans le `resValue` Gradle et l'initialisation
  //   logicielle — le plugin ne lit pas ce fichier.
};

export default config;
