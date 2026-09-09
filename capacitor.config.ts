import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.mfejc',
  appName: 'Lumina',
  webDir: 'dist',
  // Production hardening: suppress all JS logs in release builds
  loggingBehavior: 'none',
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
    // Disable remote debugging in release builds (default false, explicit)
    webContentsDebuggingEnabled: false,
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
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#121212',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    OneSignal: {
      appId: '5482a4eb-a402-4612-ab5e-a72df7961b12',
      promptForNotifications: true,
      notifyWhenConfirmation: true,
    }
  }
};

export default config;
