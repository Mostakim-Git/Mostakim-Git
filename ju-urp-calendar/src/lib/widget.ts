import { registerPlugin, Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { addDays } from 'date-fns';
import { db } from './db';
import { todayKey, toKey, fmtTime } from './utils';

interface WidgetsPlugin { refresh(): Promise<void>; requestPin(opts: { kind: 'today' | 'note' | 'alarm' }): Promise<{ supported: boolean }> }
const Widgets = registerPlugin<WidgetsPlugin>('Widgets');

/**
 * Snapshot consumed by the native Android widgets. It covers the next 14 days so the
 * native side can resolve "today" itself (survives midnight without the app running).
 */
export interface WidgetSnapshot {
  updatedAt: number;
  studentName: string;
  days: Record<string, { title: string; start: string; end: string; startLabel: string; location: string; type: string; courseCode?: string }[]>;
  notes: Record<string, string>;
  alarms: { time: string; timeLabel: string; label: string; days: number[] }[];
  deadlines: { title: string; date: string; type: string }[];
}

export async function buildSnapshot(): Promise<WidgetSnapshot> {
  const today = todayKey();
  const end = toKey(addDays(new Date(), 14));
  const [profile, events, notes, alarms, upcoming] = await Promise.all([
    db.profile.get(1),
    db.events.where('date').between(today, end, true, true).toArray(),
    db.notes.where('date').between(today, end, true, true).toArray(),
    db.alarms.filter(a => a.enabled).toArray(),
    db.events.where('date').aboveOrEqual(today).limit(400).toArray(),
  ]);
  const days: WidgetSnapshot['days'] = {};
  for (const e of events.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))) {
    if (e.allDay) continue;
    (days[e.date] ??= []).push({ title: e.title, start: e.start, end: e.end, startLabel: fmtTime(e.start), location: e.location, type: e.type, courseCode: e.courseCode });
  }
  const noteMap: Record<string, string> = {};
  for (const n of notes) if (n.content.trim()) noteMap[n.date] = n.content;
  const deadlines = upcoming.filter(e => e.type === 'exam' || e.type === 'assignment').sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 6);
  return {
    updatedAt: Date.now(), studentName: profile?.name ?? '', days, notes: noteMap,
    alarms: alarms.map(a => ({ time: a.time, timeLabel: fmtTime(a.time), label: a.label, days: a.days })),
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
    if (Capacitor.isNativePlatform()) await Widgets.refresh();
  } catch (e) { console.warn('widget sync failed', e); }
}

export async function requestPinWidget(kind: 'today' | 'note' | 'alarm') {
  if (!Capacitor.isNativePlatform()) return false;
  try { await syncWidgets(); const r = await Widgets.requestPin({ kind }); return r.supported; } catch { return false; }
}

/** Subscribe to DB changes and keep widgets fresh. */
export function startWidgetSync() {
  const tables = [db.events, db.notes, db.alarms, db.profile];
  const c = () => { scheduleWidgetSync(); };
  const u = () => { scheduleWidgetSync(); };
  const d = () => { scheduleWidgetSync(); };
  for (const t of tables) { t.hook('creating', c); t.hook('updating', u); t.hook('deleting', d); }
  syncWidgets();
  const onVis = () => { if (document.visibilityState === 'hidden') syncWidgets(); };
  document.addEventListener('visibilitychange', onVis);
  const iv = window.setInterval(syncWidgets, 15 * 60 * 1000);
  return () => {
    for (const t of tables) { t.hook('creating').unsubscribe(c); t.hook('updating').unsubscribe(u); t.hook('deleting').unsubscribe(d); }
    document.removeEventListener('visibilitychange', onVis);
    window.clearInterval(iv);
  };
}
