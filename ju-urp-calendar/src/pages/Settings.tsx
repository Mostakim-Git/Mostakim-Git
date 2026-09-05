import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun, Bell, Database, RotateCcw, Download, Upload, Info, Loader2, Music, AlarmClock, Volume2, Sliders } from 'lucide-react';
import { useRef } from 'react';
import { db } from '../lib/db';
import { PageHeader, Toggle, Modal } from '../components/ui';
import { useToast } from '../components/Toast';
import { resetAllData } from '../data/seed';
import { rescheduleAll, isNative, initNotifications, requestExactAlarmIfNeeded, CacaAlarms, applyToneChannel, scheduleClassReminders, currentAlarmChannel } from '../lib/notifications';

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get(1));
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const toneRef = useRef<HTMLInputElement>(null);
  if (!settings) return null;
  const upd = (patch: Partial<typeof settings>) => db.settings.update(1, patch);

  async function pickSystemTone() {
    if (!isNative) { toast('Available in the Android app', 'info'); return; }
    const r = await CacaAlarms.pickTone({ currentUri: settings!.alarmTone !== 'default' ? settings!.alarmTone : null });
    if (r.cancelled || !r.uri) return;
    await upd({ alarmTone: r.uri, alarmToneName: r.title || 'Custom tone' });
    await applyToneChannel(); await rescheduleAll();
    toast(`Alarm tone: ${r.title}`);
  }
  async function importToneFile(f: File) {
    if (!isNative) { toast('Available in the Android app', 'info'); return; }
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
      const r = await CacaAlarms.importTone({ name: f.name, mime: f.type || 'audio/mpeg', data: b64 });
      await upd({ alarmTone: r.uri, alarmToneName: f.name.replace(/\.[^.]+$/, '') });
      await applyToneChannel(); await rescheduleAll();
      toast(`Alarm tone set to “${f.name}”`);
    } catch (e) { console.error(e); toast('Could not import that audio file', 'error'); }
    finally { setBusy(false); }
  }

  async function exportData() {
    const data = { profile: await db.profile.toArray(), courses: await db.courses.toArray(), events: await db.events.toArray(), notes: await db.notes.toArray(), alarms: await db.alarms.toArray(), routines: await db.routines.toArray(), settings: await db.settings.toArray(), exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ju-urp-calendar-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    toast('Backup exported (PDF files are not included)');
  }
  async function importData(file: File) {
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      await db.transaction('rw', [db.profile, db.courses, db.events, db.notes, db.alarms, db.settings], async () => {
        for (const t of ['profile', 'courses', 'events', 'notes', 'alarms', 'routines', 'settings'] as const) { if (Array.isArray(data[t])) { await db[t].clear(); await (db[t] as any).bulkAdd(data[t]); } }
      });
      await rescheduleAll();
      toast('Backup restored');
    } catch { toast('Invalid backup file', 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="animate-fade-up max-w-2xl">
      <PageHeader title="Settings" subtitle="Everything is stored on this device — no account, no internet needed" />
      <Section title="Appearance" icon={settings.theme === 'dark' ? Moon : Sun}>
        <Row label="Dark mode" desc="Easier on the eyes at night"><Toggle checked={settings.theme === 'dark'} onChange={v => upd({ theme: v ? 'dark' : 'light' })} /></Row>
        <Row label="Week starts on" desc="JU academic week starts on Sunday">
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">{([[0, 'Sun'], [6, 'Sat']] as const).map(([v, l]) => <button key={v} onClick={() => upd({ weekStartsOn: v })} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${settings.weekStartsOn === v ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{l}</button>)}</div>
        </Row>
      </Section>
      <Section title="Class reminders" icon={Bell}>
        <Row label="Notification before every class" desc="Quiet notification only — no alarm sound"><Toggle checked={settings.classNotifications} onChange={v => upd({ classNotifications: v })} /></Row>
        {settings.classNotifications && <Row label="How early" desc="Minutes before the class starts">
          <select className="input w-auto" value={settings.classReminderMinutes} onChange={e => upd({ classReminderMinutes: Number(e.target.value) })}>{[5, 10, 11, 15, 20, 30].map(m => <option key={m} value={m}>{m} min before</option>)}</select>
        </Row>}
        <Row label="Alarm before the first class of the day" desc="Rings like an alarm clock — e.g. 8:30 for a 9:00 class"><Toggle checked={settings.firstClassAlarm} onChange={v => upd({ firstClassAlarm: v })} /></Row>
        {settings.firstClassAlarm && <Row label="How early" desc="Minutes before the first class">
          <select className="input w-auto" value={settings.firstClassAlarmMinutes} onChange={e => upd({ firstClassAlarmMinutes: Number(e.target.value) })}>{[15, 20, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m} min before</option>)}</select>
        </Row>}
        <p className="pt-2 text-xs text-slate-400">Reminders are scheduled automatically for the next 14 days and refresh whenever your schedule changes.</p>
      </Section>
      <Section title="Alarm sound" icon={AlarmClock}>
        <Row label="Alarm tone" desc={settings.alarmToneName || 'Default alarm'}>
          <div className="flex gap-2">
            <button onClick={pickSystemTone} className="btn-outline"><Music className="h-4 w-4" /> Choose</button>
            <label className="btn-outline cursor-pointer">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} File<input ref={toneRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importToneFile(f); e.target.value = ''; }} /></label>
          </div>
        </Row>
        {settings.alarmTone !== 'default' && <Row label="Reset to default tone"><button onClick={async () => { await upd({ alarmTone: 'default', alarmToneName: 'Default alarm' }); await applyToneChannel(); await rescheduleAll(); toast('Default alarm tone restored'); }} className="btn-ghost text-sm">Reset</button></Row>}
        <Row label="Volume" desc="Alarms play on the Alarm stream — use your phone's Alarm volume slider, not Media"><Volume2 className="h-5 w-5 text-slate-400" /></Row>
        {isNative && <Row label="System alarm channel" desc="Open Android's notification settings for CaCa alarms"><button onClick={() => CacaAlarms.openChannelSettings()} className="btn-outline"><Sliders className="h-4 w-4" /> Open</button></Row>}
        <Row label="Test" desc="Fire a test alarm in 5 seconds"><button onClick={async () => { if (!isNative) { toast('Available in the Android app', 'info'); return; } const { LocalNotifications } = await import('@capacitor/local-notifications'); await LocalNotifications.schedule({ notifications: [{ id: 499999, title: 'CaCa test alarm', body: 'This is how your alarm will sound', channelId: currentAlarmChannel(), schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }] }); toast('Test alarm in 5 seconds…', 'info'); }} className="btn-outline">Test alarm</button></Row>
      </Section>
      <Section title="Permissions" icon={Bell}>
        {isNative ? <Row label="Notification & exact-alarm permission" desc="Required for alarms while the app is closed"><button onClick={async () => { await initNotifications(); await requestExactAlarmIfNeeded(); await rescheduleAll(); await scheduleClassReminders(); toast('Alarms & reminders re-scheduled'); }} className="btn-outline">Check & re-schedule</button></Row> : <p className="py-2 text-sm text-slate-500">Alarm permissions are managed in the Android app.</p>}
      </Section>
      <Section title="Data" icon={Database}>
        <Row label="Export backup" desc="Download events, notes, alarms & profile as JSON"><button onClick={exportData} className="btn-outline"><Download className="h-4 w-4" /> Export</button></Row>
        <Row label="Import backup" desc="Restore from a JSON backup file"><label className="btn-outline cursor-pointer">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import<input type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importData(e.target.files[0])} /></label></Row>
        <Row label="Erase all data" desc="Start fresh — removes everything on this device"><button onClick={() => setConfirm(true)} className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50"><RotateCcw className="h-4 w-4" /> Erase</button></Row>
      </Section>
      <Section title="About" icon={Info}>
        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <p><b>CaCa</b> v1.2.0 — an offline class calendar for any student, any university. Courses, year, department and everything else are fully customisable.</p>
          <p className="text-slate-500">Built with React, Capacitor and IndexedDB. Works fully offline on Android 10+.</p>
        </div>
      </Section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Erase all data?" footer={<><button onClick={() => setConfirm(false)} className="btn-outline">Cancel</button><button onClick={async () => { setBusy(true); await resetAllData(); await rescheduleAll(); setBusy(false); setConfirm(false); location.hash = ''; location.reload(); }} className="btn-danger">{busy ? 'Erasing…' : 'Yes, erase everything'}</button></>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">This deletes all events, notes, courses, alarms, class-note records and profile data from the app. PDF files already saved in your file manager are kept. This cannot be undone.</p>
      </Modal>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Sun; children: React.ReactNode }) {
  return <div className="card p-5 mb-4"><h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white mb-3"><Icon className="h-4 w-4 text-brand-500" /> {title}</h3><div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div></div>;
}
function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-3"><div><div className="text-sm font-medium text-slate-900 dark:text-white">{label}</div>{desc && <div className="text-xs text-slate-500">{desc}</div>}</div>{children}</div>;
}
