import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d7685d6b5c3346488a767907e61fa87e',
  appName: 'Kloze Stickers',
  webDir: 'dist',
  server: {
    url: 'https://d7685d6b-5c33-4648-8a76-7907e61fa87e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0D0D0D',
      showSpinner: false
    },
    WhatsAppStickers: {
      // WhatsApp Stickers Plugin Configuration
    }
  }
};

export default config;
