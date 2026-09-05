import Dexie, { type Table } from 'dexie';
import type { Profile, Course, CalEvent, Note, Lecture, Alarm, Settings, Routine } from './types';

export class AppDB extends Dexie {
  profile!: Table<Profile, number>;
  courses!: Table<Course, number>;
  events!: Table<CalEvent, number>;
  notes!: Table<Note, number>;
  lectures!: Table<Lecture, number>;
  alarms!: Table<Alarm, number>;
  settings!: Table<Settings, number>;
  routines!: Table<Routine, number>;

  constructor() {
    super('ju-urp-calendar');
    this.version(1).stores({
      profile: 'id',
      courses: '++id, code',
      events: '++id, date, type, courseCode',
      notes: '++id, &date, updatedAt',
      lectures: '++id, courseCode, addedAt',
      alarms: '++id, enabled, time',
      settings: 'id',
    });
    // v2: weekly routines + seriesId index on events + new alarm settings (existing data is preserved)
    this.version(2).stores({
      events: '++id, date, type, courseCode, seriesId',
      routines: '++id, courseCode',
    }).upgrade(async tx => {
      await tx.table('settings').toCollection().modify((s: Settings) => {
        s.classReminderMinutes = s.classReminderMinutes ?? 11;
        s.firstClassAlarm ??= true; s.firstClassAlarmMinutes ??= 30;
        s.classNotifications ??= true; s.alarmTone ??= 'default'; s.alarmToneName ??= 'Default alarm';
      });
    });
  }
}

export const db = new AppDB();
