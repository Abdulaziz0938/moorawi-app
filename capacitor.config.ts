import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moorawi.app',
  appName: 'Ezo Group',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0514',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  server: { androidScheme: 'https' },
};

export default config;
