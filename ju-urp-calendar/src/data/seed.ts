import { addDays, format, startOfWeek, subDays } from 'date-fns';
import { db } from '../lib/db';
import type { CalEvent, Course, Note, Profile, Settings, Alarm } from '../lib/types';
import { generateLecturePdf } from '../lib/pdfgen';

const D = (d: Date) => format(d, 'yyyy-MM-dd');

export const DEFAULT_PROFILE: Profile = {
  id: 1,
  name: 'Mostakim Hossain',
  studentId: '20231045',
  batch: '52nd Batch',
  year: '3rd Year',
  semester: '2nd Semester',
  session: '2023-24',
  hall: 'Mir Mosharraf Hossain Hall',
  email: 'mostakim.urp@juniv.edu',
  phone: '+880 17XX-XXXXXX',
  bio: 'Urban & Regional Planning student at Jahangirnagar University. Interested in GIS, transport planning and sustainable cities.',
  avatarColor: '#3b63f6',
  bloodGroup: 'B+',
};

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  theme: 'light',
  weekStartsOn: 0,
  classReminderMinutes: 15,
  seeded: true,
};

export const COURSES: Course[] = [
  { code: 'URP 301', title: 'Urban Land Use Planning', credit: 3, teacher: 'Dr. Adil Mohammed Khan', color: '#3b63f6', room: 'Room 201' },
  { code: 'URP 303', title: 'Transportation Planning', credit: 3, teacher: 'Prof. Dr. Akter Mahmud', color: '#8b5cf6', room: 'Room 203' },
  { code: 'URP 305', title: 'GIS & Remote Sensing', credit: 3, teacher: 'Dr. Md. Shakil Akther', color: '#06b6d4', room: 'GIS Lab' },
  { code: 'URP 307', title: 'Housing & Community Development', credit: 3, teacher: 'Dr. Halima Begum', color: '#f59e0b', room: 'Room 201' },
  { code: 'URP 309', title: 'Environmental Planning & Management', credit: 3, teacher: 'Dr. Farzana Rahman', color: '#10b981', room: 'Room 204' },
  { code: 'URP 310', title: 'Planning Studio III (Neighbourhood Design)', credit: 4, teacher: 'Dr. Adil Mohammed Khan', color: '#ec4899', room: 'Studio Hall' },
  { code: 'URP 312', title: 'Research Methodology & Statistics', credit: 2, teacher: 'Mr. Tanvir Hossain', color: '#64748b', room: 'Room 203' },
];

// Weekly routine: JU week runs Sun-Thu. [dayOfWeek, start, end, courseCode, type, location]
const ROUTINE: [number, string, string, string, 'class' | 'lab', string][] = [
  [0, '09:00', '10:30', 'URP 301', 'class', 'Room 201'],
  [0, '10:45', '12:15', 'URP 303', 'class', 'Room 203'],
  [0, '14:00', '17:00', 'URP 310', 'lab', 'Studio Hall'],
  [1, '09:00', '10:30', 'URP 307', 'class', 'Room 201'],
  [1, '10:45', '12:15', 'URP 309', 'class', 'Room 204'],
  [1, '14:00', '16:00', 'URP 305', 'lab', 'GIS Lab'],
  [2, '09:00', '10:30', 'URP 303', 'class', 'Room 203'],
  [2, '10:45', '12:15', 'URP 312', 'class', 'Room 203'],
  [2, '14:00', '17:00', 'URP 310', 'lab', 'Studio Hall'],
  [3, '09:00', '10:30', 'URP 305', 'class', 'Room 204'],
  [3, '10:45', '12:15', 'URP 301', 'class', 'Room 201'],
  [3, '14:00', '15:30', 'URP 307', 'class', 'Room 201'],
  [4, '09:00', '10:30', 'URP 309', 'class', 'Room 204'],
  [4, '10:45', '12:15', 'URP 312', 'class', 'Room 203'],
];

function buildRoutine(now: Date): CalEvent[] {
  const weekStart = startOfWeek(subDays(now, 21), { weekStartsOn: 0 });
  const out: CalEvent[] = [];
  const titleOf = (code: string) => COURSES.find(c => c.code === code)?.title ?? code;
  for (let w = 0; w < 14; w++) {
    for (const [dow, start, end, code, type, loc] of ROUTINE) {
      const date = addDays(weekStart, w * 7 + dow);
      out.push({ title: titleOf(code), type, date: D(date), start, end, location: loc, courseCode: code, createdAt: Date.now() });
    }
  }
  return out;
}

function buildSpecials(now: Date): CalEvent[] {
  const t = (n: number) => D(addDays(now, n));
  return [
    { title: 'Assignment: Land Use Survey Report', type: 'assignment', date: t(2), start: '23:59', end: '23:59', location: 'Submit via Google Classroom', courseCode: 'URP 301', description: 'Land use map + 1500-word report on Savar Bazar area. Group of 4.', createdAt: Date.now() },
    { title: 'Mid-term: Transportation Planning', type: 'exam', date: t(6), start: '10:00', end: '12:00', location: 'Room 203', courseCode: 'URP 303', description: 'Chapters 1-6. Four-step model, trip generation, modal split.', createdAt: Date.now() },
    { title: 'Mid-term: GIS & Remote Sensing', type: 'exam', date: t(8), start: '10:00', end: '12:00', location: 'GIS Lab', courseCode: 'URP 305', description: 'Practical + theory. Bring your own layers on a pen drive.', createdAt: Date.now() },
    { title: 'Field Visit: Purbachal New Town', type: 'fieldwork', date: t(10), start: '07:30', end: '18:00', location: 'Depart from JU Main Gate', courseCode: 'URP 310', description: 'Bus leaves 7:30 sharp. Bring measuring tape, camera, notebook, water.', createdAt: Date.now() },
    { title: 'Studio Jury: Neighbourhood Design Concept', type: 'exam', date: t(14), start: '10:00', end: '16:00', location: 'Studio Hall', courseCode: 'URP 310', description: 'Present A1 sheets + physical model. External jury from BIP.', createdAt: Date.now() },
    { title: 'Seminar: Dhaka Detailed Area Plan (DAP) 2022-35', type: 'seminar', date: t(4), start: '15:00', end: '17:00', location: 'Seminar Room, Social Science Faculty', description: 'Guest speaker from RAJUK. Attendance counts for URP 301.', createdAt: Date.now() },
    { title: 'Assignment: Housing Affordability Analysis', type: 'assignment', date: t(12), start: '17:00', end: '17:00', location: 'Hard copy to department office', courseCode: 'URP 307', createdAt: Date.now() },
    { title: 'Problem set 3: Regression', type: 'assignment', date: t(-1), start: '23:59', end: '23:59', location: 'Google Classroom', courseCode: 'URP 312', createdAt: Date.now() },
    { title: 'Weekly Holiday', type: 'holiday', date: D(addDays(startOfWeek(now, { weekStartsOn: 0 }), 5)), start: '00:00', end: '23:59', location: '', allDay: true, createdAt: Date.now() },
    { title: 'Weekly Holiday', type: 'holiday', date: D(addDays(startOfWeek(now, { weekStartsOn: 0 }), 6)), start: '00:00', end: '23:59', location: '', allDay: true, createdAt: Date.now() },
    { title: 'Semester Break begins', type: 'holiday', date: t(45), start: '00:00', end: '23:59', location: '', allDay: true, description: 'Semester final exams end. Break for 3 weeks.', createdAt: Date.now() },
    { title: 'Final Exams start', type: 'exam', date: t(30), start: '10:00', end: '13:00', location: 'Dept. of URP', description: 'Final examination schedule will be published by the exam committee.', createdAt: Date.now() },
    { title: 'Football with batch-mates', type: 'personal', date: t(1), start: '17:00', end: '18:30', location: 'Central Field', createdAt: Date.now() },
    { title: 'Tutorial: AutoCAD basics for freshers', type: 'seminar', date: t(3), start: '18:00', end: '19:30', location: 'Studio Hall', description: 'Volunteering as tutor for 54th batch.', createdAt: Date.now() },
    { title: 'Buy A1 sheets & tracing paper', type: 'personal', date: t(0), start: '13:00', end: '13:30', location: 'Bottola, JU', createdAt: Date.now() },
  ];
}

function buildNotes(now: Date): Note[] {
  const t = (n: number) => D(addDays(now, n));
  return [
    { date: t(0), mood: 'good', updatedAt: Date.now(), content: '- Finish land use color coding for Savar Bazar map (residential = yellow, commercial = red)\n- Ask sir about the DAP seminar attendance sheet\n- Print 3 copies of studio concept sheet\n\nIdea: use OpenStreetMap footprints as base layer for the studio site.' },
    { date: t(-1), mood: 'ok', updatedAt: Date.now() - 86400000, content: 'Submitted regression problem set at 11:40 PM. Barely made it.\n\nTransport class: four-step model recap. Trip generation -> distribution -> modal split -> assignment. Gravity model formula on slide 14.' },
    { date: t(-2), mood: 'great', updatedAt: Date.now() - 2 * 86400000, content: 'GIS lab went great. Learned georeferencing with 4 GCPs, RMS error 0.8. Saved project as savar_lu.qgz on drive.\n\nStudio: group decided on 15-min neighbourhood concept.' },
    { date: t(-4), mood: 'bad', updatedAt: Date.now() - 4 * 86400000, content: 'Bus strike, missed first class. Get notes from Rafi for URP 307 (housing typologies lecture).' },
    { date: t(2), updatedAt: Date.now(), content: 'DEADLINE DAY. Land Use Survey Report due 11:59 PM. Final check on references (APA 7th).' },
  ];
}

const ALARMS: Alarm[] = [
  { label: 'Wake up for 9 AM class', time: '07:15', days: [0, 1, 2, 3, 4], enabled: true, sound: true, vibrate: true, notificationIds: [], createdAt: Date.now() },
  { label: 'Leave hall for GIS Lab', time: '13:30', days: [1], enabled: true, sound: true, vibrate: true, notificationIds: [], createdAt: Date.now() },
  { label: 'Field trip - bus at 7:30!', time: '06:00', days: [], enabled: false, sound: true, vibrate: true, notificationIds: [], createdAt: Date.now() },
];

export async function seedIfNeeded() {
  const s = await db.settings.get(1);
  if (s?.seeded) return false;
  const now = new Date();
  await db.transaction('rw', [db.profile, db.settings, db.courses, db.events, db.notes, db.alarms], async () => {
    await db.profile.put(DEFAULT_PROFILE);
    await db.settings.put(DEFAULT_SETTINGS);
    await db.courses.bulkAdd(COURSES);
    await db.events.bulkAdd([...buildRoutine(now), ...buildSpecials(now)]);
    await db.notes.bulkAdd(buildNotes(now));
    await db.alarms.bulkAdd(ALARMS);
  });
  const lectures = [
    { title: 'Lecture 01 - Introduction to Land Use Planning', code: 'URP 301', tags: ['intro', 'zoning'] },
    { title: 'Lecture 04 - Four-Step Transport Model', code: 'URP 303', tags: ['4-step', 'midterm'] },
    { title: 'Lab Manual - Georeferencing in QGIS', code: 'URP 305', tags: ['qgis', 'lab'] },
    { title: 'Lecture 02 - Housing Typologies in Bangladesh', code: 'URP 307', tags: ['housing'] },
    { title: 'Studio Brief - Neighbourhood Design', code: 'URP 310', tags: ['studio', 'brief'] },
  ];
  for (const l of lectures) {
    const blob = generateLecturePdf(l.title, l.code, COURSES.find(c => c.code === l.code)?.teacher ?? '');
    await db.lectures.add({ title: l.title, courseCode: l.code, fileName: l.title.replace(/[^a-z0-9]+/gi, '_') + '.pdf', size: blob.size, blob, pages: 3, addedAt: Date.now() - Math.random() * 10 * 86400000, tags: l.tags });
  }
  return true;
}

export async function resetAllData() {
  await db.delete();
  await db.open();
  await seedIfNeeded();
}
