import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.klozestickers.app',
  appName: 'Kloze Stickers',
  webDir: 'dist',
  // Live reload için - test bitince kaldır!
  // server: {
  //   url: 'http://192.168.1.129:5173',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0D0D0D',
      showSpinner: false
    },
    WhatsAppStickers: {
      // WhatsApp Stickers Plugin Configuration
    }
  },
  android: {
    allowMixedContent: true,
    // WebView ayarları - localStorage persistence (MIUI/Redmi cihazlarda önemli)
    webContentsDebuggingEnabled: true
  },
  // Server URL scheme - deep link'lerin düzgün çalışması için
  server: {
    androidScheme: 'https'
  }
};

export default config;
