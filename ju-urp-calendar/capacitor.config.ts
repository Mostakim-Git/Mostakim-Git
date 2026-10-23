import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.caca',
  appName: 'CaCa',
  webDir: 'dist',
  android: { allowMixedContent: false, backgroundColor: '#062a3f' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_notify', iconColor: '#0E7490' },
  },
};

export default config;
