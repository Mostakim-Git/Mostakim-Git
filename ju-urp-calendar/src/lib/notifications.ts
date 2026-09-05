import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { addDays, format } from 'date-fns';
import type { Alarm, Settings } from './types';
import { db } from './db';
import { fmtTime, minutesOf } from './utils';

export const isNative = Capacitor.isNativePlatform();

interface CacaAlarmsPlugin {
  configureChannels(o: { toneUri?: string | null; version: number }): Promise<{ alarmChannelId: string; reminderChannelId: string }>;
  pickTone(o: { currentUri?: string | null }): Promise<{ uri?: string; title?: string; cancelled?: boolean }>;
  importTone(o: { name: string; mime: string; data: string }): Promise<{ uri: string; title: string }>;
  openChannelSettings(): Promise<void>;
}
export const CacaAlarms = registerPlugin<CacaAlarmsPlugin>('CacaAlarms');

let ALARM_CHANNEL = 'caca_alarm_v1';
export const currentAlarmChannel = () => ALARM_CHANNEL;
const REMINDER_CHANNEL = 'caca_class_reminders';

// ---- id spaces (must not collide) ----
// user alarms:        alarmId*10 + weekday (0-6) | 9 one-time
// first-class alarms: 500000 + dayIndex (0..13)
// class reminders:    600000 + eventId
// event reminders:    900000 + eventId (manual "remind me" in event editor)

export async function initNotifications() {
  if (!isNative) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
    await applyToneChannel();
  } catch (e) { console.warn('notification init failed', e); }
}

/** (Re)creates channels so the alarm channel uses USAGE_ALARM + the selected tone. */
export async function applyToneChannel() {
  if (!isNative) return;
  const s = await db.settings.get(1);
  const toneUri = s?.alarmTone && s.alarmTone !== 'default' ? s.alarmTone : null;
  // channel version derived from tone so Android picks up the new sound
  const version = toneUri ? Math.abs(hash(toneUri)) % 100000 + 2 : 1;
  const r = await CacaAlarms.configureChannels({ toneUri, version });
  ALARM_CHANNEL = r.alarmChannelId;
}
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

export async function requestExactAlarmIfNeeded() {
  if (!isNative) return true;
  try {
    const r = await LocalNotifications.checkExactNotificationSetting();
    if (r.exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting();
    return true;
  } catch { return true; }
}

function idsFor(alarm: Alarm) {
  const base = (alarm.id ?? 0) * 10;
  return alarm.days.length ? alarm.days.map(d => base + d) : [base + 9];
}

export function nextOccurrence(time: string, days: number[]): Date {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const mk = (offset: number) => { const d = new Date(now); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d; };
  for (let i = 0; i < 8; i++) { const d = mk(i); if (d > now && (!days.length || days.includes(d.getDay()))) return d; }
  return mk(1);
}

export async function scheduleAlarm(alarm: Alarm) {
  await cancelAlarm(alarm);
  if (!alarm.enabled) return;
  const ids = idsFor(alarm);
  if (!isNative) { await db.alarms.update(alarm.id!, { notificationIds: ids }); return; }
  const [hour, minute] = alarm.time.split(':').map(Number);
  const common = { title: alarm.label || 'Alarm', body: `${fmtTime(alarm.time)} · CaCa alarm`, channelId: ALARM_CHANNEL, extra: { alarmId: alarm.id }, ongoing: false, autoCancel: true } as const;
  const notifications: LocalNotificationSchema[] = alarm.days.length
    ? alarm.days.map(wd => ({ ...common, id: (alarm.id ?? 0) * 10 + wd, schedule: { on: { weekday: wd + 1, hour, minute }, allowWhileIdle: true } }))
    : [{ ...common, id: (alarm.id ?? 0) * 10 + 9, schedule: { at: nextOccurrence(alarm.time, []), allowWhileIdle: true } }];
  try { await LocalNotifications.schedule({ notifications }); await db.alarms.update(alarm.id!, { notificationIds: ids }); }
  catch (e) { console.warn('schedule failed', e); }
}

export async function cancelAlarm(alarm: Alarm) {
  if (!isNative) return;
  const ids = new Set([...(alarm.notificationIds ?? []), ...idsFor(alarm)]);
  try { await LocalNotifications.cancel({ notifications: [...ids].map(id => ({ id })) }); } catch { /* ignore */ }
}

export async function scheduleEventReminder(eventId: number, title: string, date: string, time: string, minutesBefore: number, body: string) {
  if (!isNative) return;
  const at = atMinus(date, time, minutesBefore);
  if (at <= new Date()) return;
  try { await LocalNotifications.schedule({ notifications: [{ id: 900000 + eventId, title, body, channelId: REMINDER_CHANNEL, schedule: { at, allowWhileIdle: true }, extra: { eventId } }] }); } catch (e) { console.warn(e); }
}
export async function cancelEventReminder(eventId: number) {
  if (!isNative) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: 900000 + eventId }] }); } catch { /* ignore */ }
}

function atMinus(date: string, time: string, minutesBefore: number) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date + 'T00:00:00'); d.setHours(h, m - minutesBefore, 0, 0); return d;
}

/**
 * Automatic class reminders for the next 14 days:
 *  - a *notification* N minutes (default 11) before every class/lab, on the quiet reminder channel;
 *  - an *alarm* M minutes (default 30) before the FIRST class of each day, on the alarm channel.
 * Re-run on every data change; idempotent (cancels the previous batch first).
 */
export async function scheduleClassReminders() {
  if (!isNative) return;
  const s = (await db.settings.get(1)) as Settings | undefined;
  if (!s) return;
  const today = format(new Date(), 'yyyy-MM-dd');
  const end = format(addDays(new Date(), 14), 'yyyy-MM-dd');
  const events = (await db.events.where('date').between(today, end, true, true).toArray()).filter(e => !e.allDay && (e.type === 'class' || e.type === 'lab'));

  // cancel previous batch
  try {
    const pending = await LocalNotifications.getPending();
    const mine = pending.notifications.filter(n => (n.id >= 500000 && n.id < 500100) || (n.id >= 600000 && n.id < 900000)).map(n => ({ id: n.id }));
    if (mine.length) await LocalNotifications.cancel({ notifications: mine });
  } catch { /* ignore */ }

  const now = new Date();
  const list: LocalNotificationSchema[] = [];
  const byDay = new Map<string, typeof events>();
  for (const e of events) (byDay.get(e.date) ?? byDay.set(e.date, []).get(e.date)!).push(e);

  for (const [date, evs] of byDay) {
    evs.sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
    if (s.classNotifications) {
      for (const e of evs) {
        const at = atMinus(date, e.start, s.classReminderMinutes ?? 11);
        if (at <= now) continue;
        list.push({ id: 600000 + (e.id ?? 0), title: `${e.title} in ${s.classReminderMinutes ?? 11} min`, body: `${fmtTime(e.start)} – ${fmtTime(e.end)}${e.location ? ` · ${e.location}` : ''}${e.courseCode ? ` · ${e.courseCode}` : ''}`, channelId: REMINDER_CHANNEL, schedule: { at, allowWhileIdle: true }, extra: { eventId: e.id }, smallIcon: 'ic_stat_notify' });
      }
    }
    if (s.firstClassAlarm && evs.length) {
      const first = evs[0];
      const at = atMinus(date, first.start, s.firstClassAlarmMinutes ?? 30);
      if (at > now) {
        const dayIdx = Math.round((new Date(date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
        list.push({ id: 500000 + dayIdx, title: `First class at ${fmtTime(first.start)}`, body: `${first.title}${first.location ? ` · ${first.location}` : ''} — starts in ${s.firstClassAlarmMinutes ?? 30} minutes`, channelId: ALARM_CHANNEL, schedule: { at, allowWhileIdle: true }, extra: { firstClass: true, eventId: first.id }, smallIcon: 'ic_stat_notify' });
      }
    }
  }
  if (list.length) { try { await LocalNotifications.schedule({ notifications: list }); } catch (e) { console.warn('class reminders failed', e); } }
}

let crTimer: number | null = null;
export function scheduleClassRemindersDebounced() {
  if (crTimer) window.clearTimeout(crTimer);
  crTimer = window.setTimeout(() => { scheduleClassReminders(); }, 1200);
}

export async function rescheduleAll() {
  await applyToneChannel();
  const alarms = await db.alarms.toArray();
  for (const a of alarms) await scheduleAlarm(a);
  await scheduleClassReminders();
}

export async function buzz(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNative) { try { navigator.vibrate?.(style === 'heavy' ? 60 : 15); } catch { /* ignore */ } return; }
  try { await Haptics.impact({ style: style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }); } catch { /* ignore */ }
}
