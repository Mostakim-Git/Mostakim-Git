export type EventType = 'class' | 'lab' | 'exam' | 'assignment' | 'holiday' | 'seminar' | 'fieldwork' | 'personal';

export interface Profile {
  id: number;
  name: string;
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
  blob: Blob;
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
  classReminderMinutes: number;
  seeded: boolean;
}
