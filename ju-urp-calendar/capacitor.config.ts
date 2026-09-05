import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.caca',
  appName: 'CaCa',
  webDir: 'dist',
  android: { allowMixedContent: false, backgroundColor: '#062a3f' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_notify', iconColor: '#3b63f6', sound: 'alarm.wav' },
  },
};

export default config;
