import { db } from '../lib/db';
import type { Profile, Settings } from '../lib/types';

export const DEFAULT_PROFILE: Profile = {
  id: 1, name: '', university: '', department: '', studentId: '', batch: '', year: '', semester: '', session: '',
  hall: '', email: '', phone: '', bio: '', avatarColor: '#0e7490', bloodGroup: '',
};

export const DEFAULT_SETTINGS: Settings = { id: 1, theme: 'light', weekStartsOn: 0, classReminderMinutes: 11, seeded: true, onboarded: false, firstClassAlarm: true, firstClassAlarmMinutes: 30, classNotifications: true, alarmTone: 'default', alarmToneName: 'Default alarm' };

export const COURSE_COLORS = ['#0e7490', '#3b63f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#64748b', '#06b6d4', '#84cc16'];

/** Creates empty profile/settings rows on first launch. No demo content is inserted. */
export async function initIfNeeded() {
  const s = await db.settings.get(1);
  if (s) return false;
  await db.transaction('rw', [db.profile, db.settings], async () => {
    await db.profile.put(DEFAULT_PROFILE);
    await db.settings.put(DEFAULT_SETTINGS);
  });
  return true;
}

export async function resetAllData() {
  await db.delete();
  await db.open();
  await initIfNeeded();
}
