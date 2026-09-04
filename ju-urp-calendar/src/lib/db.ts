import Dexie, { type Table } from 'dexie';
import type { Profile, Course, CalEvent, Note, Lecture, Alarm, Settings } from './types';

export class AppDB extends Dexie {
  profile!: Table<Profile, number>;
  courses!: Table<Course, number>;
  events!: Table<CalEvent, number>;
  notes!: Table<Note, number>;
  lectures!: Table<Lecture, number>;
  alarms!: Table<Alarm, number>;
  settings!: Table<Settings, number>;

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
  }
}

export const db = new AppDB();
