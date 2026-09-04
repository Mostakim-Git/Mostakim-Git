import { Preferences } from '@capacitor/preferences';
import { db } from './db';
import { todayKey, fmtTime } from './utils';

/**
 * Bridge to the native Android home-screen widgets.
 * The web layer writes a compact JSON snapshot into SharedPreferences (via Capacitor Preferences,
 * group "CapacitorStorage"). The Java AppWidgetProviders read it and render RemoteViews, and
 * we broadcast an update intent so widgets refresh immediately.
 */
export interface WidgetSnapshot {
  updatedAt: number;
  date: string;
  studentName: string;
  events: { title: string; start: string; end: string; startLabel: string; location: string; type: string; courseCode?: string }[];
  note: string;
  nextAlarm: string | null;
  deadlines: { title: string; date: string; type: string }[];
}

export async function buildSnapshot(): Promise<WidgetSnapshot> {
  const today = todayKey();
  const [profile, events, note, alarms, allUpcoming] = await Promise.all([
    db.profile.get(1),
    db.events.where('date').equals(today).sortBy('start'),
    db.notes.where('date').equals(today).first(),
    db.alarms.filter(a => a.enabled).toArray(),
    db.events.where('date').above(today).limit(200).toArray(),
  ]);
  const deadlines = allUpcoming.filter(e => e.type === 'exam' || e.type === 'assignment').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const nextAlarm = alarms.sort((a, b) => a.time.localeCompare(b.time))[0];
  return {
    updatedAt: Date.now(), date: today, studentName: profile?.name ?? '',
    events: events.filter(e => !e.allDay).map(e => ({ title: e.title, start: e.start, end: e.end, startLabel: fmtTime(e.start), location: e.location, type: e.type, courseCode: e.courseCode })),
    note: note?.content ?? '', nextAlarm: nextAlarm ? `${fmtTime(nextAlarm.time)} · ${nextAlarm.label}` : null,
    deadlines: deadlines.map(d => ({ title: d.title, date: d.date, type: d.type })),
  };
}

let timer: number | null = null;
export function scheduleWidgetSync() {
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(syncWidgets, 400);
}

export async function syncWidgets() {
  try {
    const snap = await buildSnapshot();
    await Preferences.set({ key: 'widget_snapshot', value: JSON.stringify(snap) });
    // Ask native side to refresh widgets (no-op on web)
    const w = window as unknown as { JUWidgets?: { refresh: () => void } };
    w.JUWidgets?.refresh?.();
  } catch (e) { console.warn('widget sync failed', e); }
}

/** Subscribe to DB changes and keep widgets fresh. */
export function startWidgetSync() {
  const tables = [db.events, db.notes, db.alarms, db.profile];
  const c = () => { scheduleWidgetSync(); };
  const u = () => { scheduleWidgetSync(); };
  const d = () => { scheduleWidgetSync(); };
  for (const t of tables) { t.hook('creating', c); t.hook('updating', u); t.hook('deleting', d); }
  syncWidgets();
  const iv = window.setInterval(syncWidgets, 15 * 60 * 1000);
  return () => {
    for (const t of tables) { t.hook('creating').unsubscribe(c); t.hook('updating').unsubscribe(u); t.hook('deleting').unsubscribe(d); }
    window.clearInterval(iv);
  };
}
