export type EventType = 'class' | 'lab' | 'exam' | 'assignment' | 'holiday' | 'seminar' | 'fieldwork' | 'personal';

export interface Profile {
  id: number;
  name: string;
  university: string;
  department: string;
  studentId: string;
  batch: string;
  year: string;
  semester: string;
  session: string;
  hall: string;
  email: string;
  phone: string;
  bio: string;
  avatarColor: string;
  bloodGroup: string;
}

export interface Course {
  id?: number;
  code: string;
  title: string;
  credit: number;
  teacher: string;
  color: string;
  room: string;
}

export interface CalEvent {
  id?: number;
  title: string;
  type: EventType;
  date: string;
  start: string;
  end: string;
  location: string;
  courseCode?: string;
  description?: string;
  allDay?: boolean;
  seriesId?: number;   // set when generated from a weekly Routine
  createdAt: number;
}

/** A weekly repeating routine, e.g. "URP 301 every Sunday 09:00-10:30 in Room 201 until 20 Dec". */
export interface Routine {
  id?: number;
  title: string;
  type: EventType;
  days: number[];      // 0-6 (Sun-Sat)
  start: string;
  end: string;
  location: string;
  courseCode?: string;
  description?: string;
  from: string;        // yyyy-MM-dd inclusive
  until: string;       // yyyy-MM-dd inclusive
  createdAt: number;
}

export interface Note {
  id?: number;
  date: string;
  content: string;
  mood?: 'great' | 'good' | 'ok' | 'bad';
  updatedAt: number;
}

export interface Lecture {
  id?: number;
  title: string;
  courseCode: string;
  fileName: string;
  size: number;
  blob?: Blob;
  filePath?: string;   // path inside device storage (Documents/CaCa/...)
  fileUri?: string;
  pages?: number;
  addedAt: number;
  tags: string[];
}

export interface Alarm {
  id?: number;
  label: string;
  time: string;
  days: number[];
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  eventId?: number;
  notificationIds: number[];
  createdAt: number;
}

export interface Settings {
  id: number;
  theme: 'light' | 'dark';
  weekStartsOn: 0 | 6;
  classReminderMinutes: number;   // notification before every class (default 11)
  seeded: boolean;
  onboarded: boolean;
  firstClassAlarm: boolean;       // ring an alarm before the first class of the day
  firstClassAlarmMinutes: number; // default 30
  classNotifications: boolean;    // silent notification before each class
  alarmTone: string;              // 'default' | file name inside Documents/CaCa/Tones
  alarmToneName: string;
}
