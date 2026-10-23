import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatDistanceStrict } from 'date-fns';
import { AlarmClock, Plus, Trash2, Volume2, VolumeX, Vibrate, Bell } from 'lucide-react';
import { db } from '../lib/db';
import type { Alarm } from '../lib/types';
import { fmtTime, cn, DAY_NAMES } from '../lib/utils';
import { PageHeader, EmptyState, Modal, Field, Toggle, ListSkeleton } from '../components/ui';
import { useToast } from '../components/Toast';
import { scheduleAlarm, cancelAlarm, nextOccurrence, buzz, isNative, requestExactAlarmIfNeeded } from '../lib/notifications';
import { useNow } from '../lib/hooks';

const PRESETS = ['Wake up for class', 'Leave hall', 'Submission deadline', 'Study session', 'Lab time'];

export function AlarmsPage() {
  const alarms = useLiveQuery(() => db.alarms.orderBy('time').toArray(), []);
  const [editing, setEditing] = useState<Alarm | null | undefined>(undefined);
  const now = useNow(30000);
  const { toast } = useToast();

  const nextUp = (alarms ?? []).filter(a => a.enabled).map(a => ({ a, at: nextOccurrence(a.time, a.days) })).sort((x, y) => x.at.getTime() - y.at.getTime())[0];

  async function toggle(a: Alarm, enabled: boolean) {
    await db.alarms.update(a.id!, { enabled }); // optimistic through liveQuery
    const fresh = { ...a, enabled };
    if (enabled) await requestExactAlarmIfNeeded();
    await scheduleAlarm(fresh);
    buzz();
    if (enabled) toast(`Alarm set · rings ${formatDistanceStrict(nextOccurrence(a.time, a.days), new Date(), { addSuffix: true })}`, 'info');
  }
  async function remove(a: Alarm) {
    await cancelAlarm(a);
    await db.alarms.delete(a.id!);
    toast('Alarm deleted', 'info', { label: 'Undo', onClick: async () => { const { id: _i, ...rest } = a; const id = await db.alarms.add({ ...rest, notificationIds: [] } as Alarm); await scheduleAlarm({ ...rest, id } as Alarm); } });
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Alarms" subtitle={isNative ? 'Rings even when the app is closed' : 'In the browser, alarms ring while this tab is open'} actions={<button onClick={() => setEditing(null)} className="btn-primary"><Plus className="h-4 w-4" /> Alarm</button>} />

      {nextUp && (
        <div className="mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-brand-950 dark:to-slate-900 p-5 text-white shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Bell className="h-6 w-6 animate-ring" /></div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-300">Next alarm</div>
            <div className="text-2xl font-bold">{fmtTime(nextUp.a.time)} <span className="text-base font-medium text-slate-300">· {nextUp.a.label}</span></div>
            <div className="text-sm text-slate-300">Rings {formatDistanceStrict(nextUp.at, now, { addSuffix: true })}</div>
          </div>
        </div>
      )}

      {alarms === undefined ? <div className="card p-4"><ListSkeleton /></div> : alarms.length === 0 ? (
        <div className="card"><EmptyState icon={AlarmClock} title="No alarms" description="Never miss a 9 AM class again. Create repeating alarms for class days or one-off alarms for submissions." action={<button onClick={() => setEditing(null)} className="btn-primary"><Plus className="h-4 w-4" /> Create alarm</button>} /></div>
      ) : (
        <div className="space-y-3">
          {alarms.map(a => (
            <div key={a.id} className={cn('card flex items-center gap-4 p-4 transition', !a.enabled && 'opacity-60')}>
              <button onClick={() => setEditing(a)} className="flex-1 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{fmtTime(a.time).split(' ')[0]}</span>
                  <span className="text-sm font-semibold text-slate-500">{fmtTime(a.time).split(' ')[1]}</span>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-200">{a.label || 'Alarm'}</div>
                <div className="mt-1.5 flex items-center gap-1">
                  {a.days.length === 0 ? <span className="text-xs text-slate-500">Once · {formatDistanceStrict(nextOccurrence(a.time, []), now, { addSuffix: true })}</span> :
                    DAY_NAMES.map((d, i) => <span key={d} className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold', a.days.includes(i) ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')}>{d[0]}</span>)}
                  <span className="ml-2 flex items-center gap-1 text-slate-400">{a.sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}{a.vibrate && <Vibrate className="h-3.5 w-3.5" />}</span>
                </div>
              </button>
              <Toggle checked={a.enabled} onChange={v => toggle(a, v)} label="Enable alarm" />
              <button onClick={() => remove(a)} className="btn-ghost p-2 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      <AlarmEditor open={editing !== undefined} onClose={() => setEditing(undefined)} initial={editing ?? null} />
    </div>
  );
}

function AlarmEditor({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: Alarm | null }) {
  const blank = (): Alarm => ({ label: '', time: '07:00', days: [0, 1, 2, 3, 4], enabled: true, sound: true, vibrate: true, notificationIds: [], createdAt: Date.now() });
  const [form, setForm] = useState<Alarm>(blank());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => { if (open) setForm(initial ? { ...initial } : blank()); }, [open, initial]);

  const toggleDay = (d: number) => setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort() }));
  async function save() {
    setSaving(true);
    try {
      await requestExactAlarmIfNeeded();
      let saved: Alarm;
      if (form.id) { await db.alarms.put(form); saved = form; }
      else { const id = await db.alarms.add(form); saved = { ...form, id }; }
      await scheduleAlarm(saved);
      buzz('medium');
      toast(form.id ? 'Alarm updated' : `Alarm set for ${fmtTime(form.time)}`);
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={form.id ? 'Edit alarm' : 'New alarm'} footer={<><button onClick={onClose} className="btn-outline">Cancel</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save alarm'}</button></>}>
      <div className="space-y-5">
        <div className="flex justify-center"><input type="time" className="input w-auto text-4xl font-bold text-center tracking-tight px-6 py-3" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
        <Field label="Label">
          <input className="input" placeholder="Wake up for class" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          <div className="mt-2 flex flex-wrap gap-1.5">{PRESETS.map(p => <button key={p} type="button" onClick={() => setForm({ ...form, label: p })} className="chip border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50">{p}</button>)}</div>
        </Field>
        <div>
          <div className="flex items-center justify-between mb-1.5"><span className="label mb-0">Repeat</span>
            <div className="flex gap-1 text-xs"><button type="button" onClick={() => setForm({ ...form, days: [0, 1, 2, 3, 4] })} className="text-brand-600 font-medium">Class days</button><span className="text-slate-300">·</span><button type="button" onClick={() => setForm({ ...form, days: [] })} className="text-brand-600 font-medium">Once</button></div></div>
          <div className="grid grid-cols-7 gap-1.5">{DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} className={cn('rounded-xl py-2 text-sm font-semibold transition', form.days.includes(i) ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>{d}</button>)}</div>
          <p className="mt-1.5 text-xs text-slate-400">{form.days.length === 0 ? 'Rings once at the next occurrence.' : form.days.length === 7 ? 'Every day.' : `Repeats on ${form.days.map(d => DAY_NAMES[d]).join(', ')}.`}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5"><span className="flex items-center gap-2 text-sm"><Volume2 className="h-4 w-4 text-slate-500" /> Sound</span><Toggle checked={form.sound} onChange={v => setForm({ ...form, sound: v })} /></label>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5"><span className="flex items-center gap-2 text-sm"><Vibrate className="h-4 w-4 text-slate-500" /> Vibrate</span><Toggle checked={form.vibrate} onChange={v => setForm({ ...form, vibrate: v })} /></label>
        </div>
      </div>
    </Modal>
  );
}
