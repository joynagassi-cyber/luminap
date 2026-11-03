import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Variante « diagnostic » (C-05) : un build de dépannage SUR APPAREIL (logcat,
 * inspection distante) sans changer le build de production.
 *
 *   CAPACITOR_DIAGNOSTIC=1 pnpm run build:cap && npx cap sync android
 *
 * `cap sync` lit ce fichier sous Node : les variables d'environnement y sont
 * disponibles, contrairement au bundle web. Sans la variable, le comportement
 * de release reste STRICTEMENT inchangé (logs coupés, debug WebView désactivé).
 */
const diagnostic = process.env.CAPACITOR_DIAGNOSTIC === '1';

const config: CapacitorConfig = {
  appId: 'com.lumina.mfejc',
  appName: 'Lumina',
  webDir: 'dist',
  // Production hardening: suppress all JS logs in release builds.
  // Variante diagnostic : logs conservés pour lire `adb logcat` sur appareil.
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
    // Activé UNIQUEMENT dans la variante diagnostic (chrome://inspect).
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
  plugins: {
    // ── Plugins INSTALLÉS uniquement ──────────────────────────────────────
    // C-01 : les sections `SplashScreen` et `OneSignal` décrivaient des
    // plugins NON installés : la configuration était ignorée (au mieux), et
    // laissait croire que le splash et le push étaient pilotés depuis ici.
    //  - écran de démarrage : natif Android 12+ via
    //    androidx.core:core-splashscreen (`AppTheme.NoActionBarLaunch`,
    //    `res/values/styles.xml`), aucun plugin requis ;
    //  - push : pile `@capacitor/push-notifications` ; l'initialisation
    //    OneSignal « manuelle » a été retirée (pont inexistant, P-01).
    // Aucune entrée ici tant que le plugin correspondant n'est pas dans
    // package.json (contrôle : scripts/check-native-plugins.mjs).
    Keyboard: {
      // C-10 : une seule stratégie d'évitement du clavier. L'application
      // utilise `useKeyboardAvoidance` + Ionic `keyboardFillMode: "overlap"` ;
      // on empêche donc le redimensionnement natif de la WebView de
      // s'ajouter par-dessus (double compensation → bouton « Enregistrer »
      // hors écran ou grand vide).
      resize: 'none',
      resizeOnFullScreen: false,
    },
  },
};

export default config;
