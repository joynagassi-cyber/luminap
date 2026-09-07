import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.mfejc',
  appName: 'Lumina',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
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
