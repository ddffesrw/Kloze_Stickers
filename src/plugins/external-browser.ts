/**
 * ExternalBrowser Plugin
 *
 * Opens URLs in the system's default browser (NOT Chrome Custom Tabs).
 * This is critical for OAuth redirects because Chrome Custom Tabs
 * silently blocks 302 redirects to custom URL schemes.
 *
 * On web, falls back to window.open().
 */
import { registerPlugin } from '@capacitor/core';

interface ExternalBrowserPlugin {
  open(options: { url: string }): Promise<void>;
}

const ExternalBrowser = registerPlugin<ExternalBrowserPlugin>('ExternalBrowser', {
  web: () => ({
    open: async (options: { url: string }) => {
      window.open(options.url, '_blank');
    },
  }),
});

export default ExternalBrowser;
