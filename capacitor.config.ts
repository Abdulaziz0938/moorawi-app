import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ezo.app',
  appName: 'Ezo Group',
  webDir: 'dist', // نحتفظ فيها كاحتياط
  server: {
    url: 'https://moorawi-app.vercel.app', // الرابط المباشر لتطبيقك
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
