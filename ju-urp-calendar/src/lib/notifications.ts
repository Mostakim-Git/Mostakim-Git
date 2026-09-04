import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { Alarm } from './types';
import { db } from './db';

export const isNative = Capacitor.isNativePlatform();
const CHANNEL_ID = 'alarms';

export async function initNotifications() {
  if (!isNative) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Alarms & class reminders',
      description: 'Alarms, class and deadline reminders',
      importance: 5,
      visibility: 1,
      sound: 'alarm.wav',
      vibration: true,
      lights: true,
      lightColor: '#3b63f6',
    });
  } catch (e) {
    console.warn('notification init failed', e);
  }
}

export async function requestExactAlarmIfNeeded() {
  if (!isNative) return true;
  try {
    const r = await LocalNotifications.checkExactNotificationSetting();
    if (r.exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting();
    return true;
  } catch { return true; }
}

// Deterministic id space: alarm id * 10 + weekday (or 9 for one-time)
function idsFor(alarm: Alarm) {
  const base = (alarm.id ?? 0) * 10;
  return alarm.days.length ? alarm.days.map(d => base + d) : [base + 9];
}

export function nextOccurrence(time: string, days: number[]): Date {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const candidates: Date[] = [];
  const mk = (offset: number) => { const d = new Date(now); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d; };
  for (let i = 0; i < 8; i++) {
    const d = mk(i);
    if (d <= now) continue;
    if (!days.length || days.includes(d.getDay())) candidates.push(d);
  }
  return candidates[0] ?? mk(1);
}

export async function scheduleAlarm(alarm: Alarm) {
  await cancelAlarm(alarm);
  if (!alarm.enabled) return;
  const ids = idsFor(alarm);
  if (!isNative) {
    await db.alarms.update(alarm.id!, { notificationIds: ids });
    return;
  }
  const [hour, minute] = alarm.time.split(':').map(Number);
  const notifications: LocalNotificationSchema[] = alarm.days.length
    ? alarm.days.map((wd) => ({
        id: (alarm.id ?? 0) * 10 + wd,
        title: alarm.label || 'Alarm',
        body: `${alarm.time} - JU URP Calendar`,
        channelId: CHANNEL_ID,
        schedule: { on: { weekday: wd + 1, hour, minute }, allowWhileIdle: true },
        sound: alarm.sound ? 'alarm.wav' : undefined,
        extra: { alarmId: alarm.id },
        actionTypeId: 'ALARM',
      }))
    : [{
        id: (alarm.id ?? 0) * 10 + 9,
        title: alarm.label || 'Alarm',
        body: `${alarm.time} - JU URP Calendar`,
        channelId: CHANNEL_ID,
        schedule: { at: nextOccurrence(alarm.time, []), allowWhileIdle: true },
        sound: alarm.sound ? 'alarm.wav' : undefined,
        extra: { alarmId: alarm.id },
        actionTypeId: 'ALARM',
      }];
  try {
    await LocalNotifications.schedule({ notifications });
    await db.alarms.update(alarm.id!, { notificationIds: ids });
  } catch (e) { console.warn('schedule failed', e); }
}

export async function cancelAlarm(alarm: Alarm) {
  if (!isNative) return;
  const ids = new Set([...(alarm.notificationIds ?? []), ...idsFor(alarm)]);
  try { await LocalNotifications.cancel({ notifications: [...ids].map(id => ({ id })) }); } catch { /* ignore */ }
}

export async function scheduleEventReminder(eventId: number, title: string, date: string, time: string, minutesBefore: number, body: string) {
  if (!isNative) return;
  const [h, m] = time.split(':').map(Number);
  const at = new Date(date + 'T00:00:00'); at.setHours(h, m - minutesBefore, 0, 0);
  if (at <= new Date()) return;
  try {
    await LocalNotifications.schedule({ notifications: [{
      id: 900000 + eventId, title, body, channelId: CHANNEL_ID,
      schedule: { at, allowWhileIdle: true }, extra: { eventId },
    }] });
  } catch (e) { console.warn(e); }
}

export async function cancelEventReminder(eventId: number) {
  if (!isNative) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: 900000 + eventId }] }); } catch { /* ignore */ }
}

export async function rescheduleAll() {
  const alarms = await db.alarms.toArray();
  for (const a of alarms) await scheduleAlarm(a);
}

export async function buzz(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNative) { try { navigator.vibrate?.(style === 'heavy' ? 60 : 15); } catch { /* ignore */ } return; }
  try { await Haptics.impact({ style: style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }); } catch { /* ignore */ }
}
