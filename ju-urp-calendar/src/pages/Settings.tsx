import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun, Bell, Database, RotateCcw, Download, Upload, Info, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { PageHeader, Toggle, Modal } from '../components/ui';
import { useToast } from '../components/Toast';
import { resetAllData } from '../data/seed';
import { rescheduleAll, isNative, initNotifications, requestExactAlarmIfNeeded } from '../lib/notifications';

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get(1));
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!settings) return null;
  const upd = (patch: Partial<typeof settings>) => db.settings.update(1, patch);

  async function exportData() {
    const data = { profile: await db.profile.toArray(), courses: await db.courses.toArray(), events: await db.events.toArray(), notes: await db.notes.toArray(), alarms: await db.alarms.toArray(), settings: await db.settings.toArray(), exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ju-urp-calendar-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    toast('Backup exported (PDF files are not included)');
  }
  async function importData(file: File) {
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      await db.transaction('rw', [db.profile, db.courses, db.events, db.notes, db.alarms, db.settings], async () => {
        for (const t of ['profile', 'courses', 'events', 'notes', 'alarms', 'settings'] as const) { if (Array.isArray(data[t])) { await db[t].clear(); await (db[t] as any).bulkAdd(data[t]); } }
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
      <Section title="Reminders" icon={Bell}>
        <Row label="Class reminder" desc="Notify before an event starts">
          <select className="input w-auto" value={settings.classReminderMinutes} onChange={e => upd({ classReminderMinutes: Number(e.target.value) })}>{[5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m} min before</option>)}</select>
        </Row>
        {isNative && <Row label="Notification permission" desc="Required for alarms while app is closed"><button onClick={async () => { await initNotifications(); await requestExactAlarmIfNeeded(); await rescheduleAll(); toast('Alarms re-scheduled'); }} className="btn-outline">Check & re-schedule</button></Row>}
      </Section>
      <Section title="Data" icon={Database}>
        <Row label="Export backup" desc="Download events, notes, alarms & profile as JSON"><button onClick={exportData} className="btn-outline"><Download className="h-4 w-4" /> Export</button></Row>
        <Row label="Import backup" desc="Restore from a JSON backup file"><label className="btn-outline cursor-pointer">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import<input type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importData(e.target.files[0])} /></label></Row>
        <Row label="Reset to demo data" desc="Erase everything and reload the sample semester"><button onClick={() => setConfirm(true)} className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50"><RotateCcw className="h-4 w-4" /> Reset</button></Row>
      </Section>
      <Section title="About" icon={Info}>
        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <p><b>JU URP Calendar</b> v1.0.0 — an offline academic planner for students of the Department of Urban & Regional Planning, Jahangirnagar University, Savar, Dhaka.</p>
          <p className="text-slate-500">Built with React, Capacitor and IndexedDB. Works fully offline on Android 10+.</p>
        </div>
      </Section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset all data?" footer={<><button onClick={() => setConfirm(false)} className="btn-outline">Cancel</button><button onClick={async () => { setBusy(true); await resetAllData(); await rescheduleAll(); setBusy(false); setConfirm(false); toast('Demo data restored'); }} className="btn-danger">{busy ? 'Resetting…' : 'Yes, reset everything'}</button></>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">This deletes all events, notes, alarms, lecture PDFs and profile edits on this device, then reloads the demo semester. This cannot be undone.</p>
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
