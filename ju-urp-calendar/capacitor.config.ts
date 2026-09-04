import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bd.ac.juniv.urp.calendar',
  appName: 'JU URP Calendar',
  webDir: 'dist',
  android: { allowMixedContent: false, backgroundColor: '#f5f7fb' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_notify', iconColor: '#3b63f6', sound: 'alarm.wav' },
  },
};

export default config;
