import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlarmClock, BellOff, Clock3 } from 'lucide-react';
import { db } from '../lib/db';
import type { Alarm } from '../lib/types';
import { fmtTime } from '../lib/utils';
import { scheduleAlarm, buzz } from '../lib/notifications';

/** In-app alarm: watches the clock every second and rings full-screen when an enabled alarm matches. Works offline, web + native (foreground). */
export function AlarmRinger() {
  const alarms = useLiveQuery(() => db.alarms.filter(a => a.enabled).toArray(), []);
  const [ringing, setRinging] = useState<Alarm | null>(null);
  const fired = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const id = setInterval(() => {
      if (!alarms?.length || ringing) return;
      const n = new Date();
      const hhmm = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
      const key = (a: Alarm) => `${a.id}-${n.toDateString()}-${hhmm}`;
      const hit = alarms.find(a => a.time === hhmm && (!a.days.length || a.days.includes(n.getDay())) && !fired.current.has(key(a)));
      if (hit) { fired.current.add(key(hit)); setRinging(hit); }
    }, 1000);
    return () => clearInterval(id);
  }, [alarms, ringing]);

  useEffect(() => {
    if (!ringing) return;
    let stopped = false;
    // Sound via WebAudio (no asset needed) + vibration pattern
    const play = () => {
      if (!ringing.sound) return;
      try {
        const ctx = audioCtx.current ?? new AudioContext(); audioCtx.current = ctx;
        const beep = (t: number, f: number) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.4); };
        const t0 = ctx.currentTime; [0, 0.45, 0.9].forEach((d, i) => beep(t0 + d, i === 2 ? 1320 : 880));
      } catch { /* ignore */ }
    };
    const vib = () => { if (ringing.vibrate) { try { navigator.vibrate?.([400, 200, 400]); } catch { /* ignore */ } buzz('heavy'); } };
    play(); vib();
    const loop = setInterval(() => { if (!stopped) { play(); vib(); } }, 1600);
    const auto = setTimeout(() => stopRef.current(), 90_000);
    stopRef.current = () => { stopped = true; clearInterval(loop); clearTimeout(auto); try { navigator.vibrate?.(0); } catch { /* ignore */ } };
    return () => stopRef.current();
  }, [ringing]);

  async function dismiss() {
    stopRef.current();
    const a = ringing!; setRinging(null);
    if (!a.days.length) { await db.alarms.update(a.id!, { enabled: false }); await scheduleAlarm({ ...a, enabled: false }); }
  }
  async function snooze() {
    stopRef.current();
    const a = ringing!; setRinging(null);
    const t = new Date(Date.now() + 5 * 60000);
    const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    const id = await db.alarms.add({ label: `${a.label || 'Alarm'} (snoozed)`, time, days: [], enabled: true, sound: a.sound, vibrate: a.vibrate, notificationIds: [], createdAt: Date.now() });
    await scheduleAlarm({ ...a, id, label: `${a.label || 'Alarm'} (snoozed)`, time, days: [], enabled: true, notificationIds: [] });
    if (!a.days.length) { await db.alarms.update(a.id!, { enabled: false }); await scheduleAlarm({ ...a, enabled: false }); }
  }

  if (!ringing) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-b from-brand-700 via-brand-800 to-slate-950 text-white p-8 animate-fade-up">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 ring-8 ring-white/10"><AlarmClock className="h-14 w-14 animate-ring" /></div>
      <div className="mt-8 text-6xl font-bold tracking-tight">{fmtTime(ringing.time)}</div>
      <div className="mt-2 text-lg text-brand-100">{ringing.label || 'Alarm'}</div>
      <div className="mt-12 flex w-full max-w-xs flex-col gap-3">
        <button onClick={dismiss} className="btn bg-white text-brand-800 py-4 text-base font-bold hover:bg-brand-50"><BellOff className="h-5 w-5" /> Dismiss</button>
        <button onClick={snooze} className="btn bg-white/10 text-white py-4 text-base border border-white/20 hover:bg-white/20"><Clock3 className="h-5 w-5" /> Snooze 5 min</button>
      </div>
    </div>
  );
}
