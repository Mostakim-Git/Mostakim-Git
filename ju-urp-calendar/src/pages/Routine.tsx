import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addWeeks, format } from 'date-fns';
import { Repeat, Plus, Pencil, Trash2, CalendarPlus, Info } from 'lucide-react';
import { db } from '../lib/db';
import type { Routine, EventType } from '../lib/types';
import { cn, eventTypeMeta, fmtTime, todayKey, DAY_NAMES, minutesOf } from '../lib/utils';
import { PageHeader, EmptyState, Modal, Field, ListSkeleton } from '../components/ui';
import { useToast } from '../components/Toast';
import { createRoutine, updateRoutine, deleteRoutine, restoreRoutine, extendRoutine } from '../lib/routines';
import { buzz } from '../lib/notifications';

export function RoutinePage() {
  const routines = useLiveQuery(() => db.routines.toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const counts = useLiveQuery(async () => { const m: Record<number, number> = {}; const t = todayKey(); for (const e of await db.events.where('seriesId').above(0).toArray()) if (e.date >= t) m[e.seriesId!] = (m[e.seriesId!] ?? 0) + 1; return m; }, []) ?? {};
  const [editing, setEditing] = useState<Routine | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Routine | null>(null);
  const { toast } = useToast();

  const byDay = DAY_NAMES.map((d, i) => ({ d, i, items: (routines ?? []).filter(r => r.days.includes(i)).sort((a, b) => a.start.localeCompare(b.start)) }));

  async function doDelete(scope: 'future' | 'all' | 'keep') {
    const r = deleting!; setDeleting(null);
    const snap = await deleteRoutine(r.id!, scope);
    buzz();
    toast(scope === 'keep' ? 'Routine removed, classes kept' : `Routine removed · ${snap.events.length} class${snap.events.length === 1 ? '' : 'es'} deleted`, 'info', { label: 'Undo', onClick: async () => { await restoreRoutine(snap); } });
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Weekly Routine" subtitle="Set it once — CaCa fills your calendar for the whole semester" actions={<button onClick={() => setEditing(null)} className="btn-primary"><Plus className="h-4 w-4" /> Routine</button>} />
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-100 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/30 p-4 text-sm text-brand-900 dark:text-brand-100">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>Each routine creates real events on the calendar every chosen weekday between its start and end date. Edit a routine to update all its <b>upcoming</b> classes; delete it to remove them (with <b>Undo</b>). Individual classes can still be tweaked or deleted from the calendar without affecting the rest.</div>
      </div>

      {routines === undefined ? <div className="card p-4"><ListSkeleton /></div> : routines.length === 0 ? (
        <div className="card"><EmptyState icon={Repeat} title="No weekly routine yet" description="Add your class routine once — e.g. “Statistics, every Sunday & Tuesday, 9:00–10:30, Room 201” — and it appears on every matching day." action={<button onClick={() => setEditing(null)} className="btn-primary"><CalendarPlus className="h-4 w-4" /> Add routine</button>} /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {byDay.filter(x => x.items.length).map(({ d, i, items }) => (
            <div key={d} className="card p-4">
              <div className="mb-2 flex items-center justify-between"><h3 className={cn('font-bold', (i === 5 || i === 6) ? 'text-rose-500' : 'text-slate-900 dark:text-white')}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}</h3><span className="text-xs text-slate-500">{items.length} class{items.length === 1 ? '' : 'es'}</span></div>
              <div className="space-y-2">
                {items.map(r => {
                  const m = eventTypeMeta[r.type]; const c = courses.find(x => x.code === r.courseCode);
                  return (
                    <div key={r.id} className={cn('group flex items-center gap-3 rounded-xl border p-2.5', m.bg)}>
                      <span className="h-9 w-1 rounded-full" style={{ background: c?.color ?? undefined }}><span className={cn('block h-full w-full rounded-full', !c && m.dot)} /></span>
                      <button onClick={() => setEditing(r)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.title}</div>
                        <div className="text-xs text-slate-500">{fmtTime(r.start)}–{fmtTime(r.end)}{r.location ? ` · ${r.location}` : ''}</div>
                      </button>
                      <button onClick={() => setEditing(r)} className="btn-ghost p-1.5 opacity-60 group-hover:opacity-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(r)} className="btn-ghost p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="card p-4 md:col-span-2 xl:col-span-3">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">All routines</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {routines.map(r => (
                <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
                  <span className="text-slate-500">{r.days.map(d => DAY_NAMES[d]).join(', ')} · {fmtTime(r.start)}</span>
                  <span className="text-xs text-slate-400">{format(new Date(r.from + 'T00:00:00'), 'd MMM')} → {format(new Date(r.until + 'T00:00:00'), 'd MMM yyyy')} · {counts[r.id!] ?? 0} upcoming</span>
                  <button onClick={async () => { const n = await extendRoutine(r.id!, 4); toast(`Extended by 4 weeks · ${n} classes added`); }} className="ml-auto text-xs font-medium text-brand-600 hover:underline">+4 weeks</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <RoutineEditor open={editing !== undefined} onClose={() => setEditing(undefined)} initial={editing ?? null} />

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Remove routine?" footer={<>
        <button onClick={() => setDeleting(null)} className="btn-outline">Cancel</button>
        <button onClick={() => doDelete('keep')} className="btn-outline">Keep classes</button>
        <button onClick={() => doDelete('future')} className="btn-outline text-rose-600 border-rose-200">Delete upcoming</button>
        <button onClick={() => doDelete('all')} className="btn-danger">Delete all</button>
      </>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">“{deleting?.title}” on {deleting?.days.map(d => DAY_NAMES[d]).join(', ')}. Choose what happens to the classes it created. You can <b>Undo</b> right after.</p>
        <ul className="mt-3 text-xs text-slate-500 space-y-1 list-disc pl-4"><li><b>Keep classes</b> – only the routine is removed; existing events stay.</li><li><b>Delete upcoming</b> – removes today's and future classes, keeps history.</li><li><b>Delete all</b> – removes every class generated by this routine.</li></ul>
      </Modal>
    </div>
  );
}

const TYPES: EventType[] = ['class', 'lab', 'seminar', 'personal'];

export function RoutineEditor({ open, onClose, initial, defaultDay }: { open: boolean; onClose: () => void; initial: Routine | null; defaultDay?: number }) {
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const { toast } = useToast();
  const blank = (): Routine => ({ title: '', type: 'class', days: [defaultDay ?? new Date().getDay()], start: '09:00', end: '10:30', location: '', courseCode: '', from: todayKey(), until: format(addWeeks(new Date(), 16), 'yyyy-MM-dd'), createdAt: Date.now() });
  const [f, setF] = useState<Routine>(blank());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setF(initial ? { ...initial } : blank()); }, [open, initial]); // eslint-disable-line
  const set = <K extends keyof Routine>(k: K, v: Routine[K]) => setF(x => ({ ...x, [k]: v }));
  const toggleDay = (d: number) => set('days', f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort());
  const pickCourse = (code: string) => { const c = courses.find(x => x.code === code); setF(x => ({ ...x, courseCode: code, title: c && (!x.title || courses.some(y => y.title === x.title)) ? c.title : x.title, location: c?.room && !x.location ? c.room : x.location })); };

  async function save() {
    if (!f.title.trim()) return toast('Give the routine a title', 'error');
    if (!f.days.length) return toast('Pick at least one weekday', 'error');
    if (minutesOf(f.end) <= minutesOf(f.start)) return toast('End time must be after start', 'error');
    if (f.until < f.from) return toast('End date must be after start date', 'error');
    setSaving(true);
    try {
      const payload = { ...f, title: f.title.trim(), courseCode: f.courseCode || undefined };
      if (f.id) { const n = await updateRoutine(payload); toast(`Routine updated · ${n} upcoming classes refreshed`); }
      else { const r = await createRoutine(payload); toast(`Routine added · ${r.created} classes placed on the calendar`, 'success', { label: 'Undo', onClick: async () => { await deleteRoutine(r.id, 'all'); } }); }
      buzz(); onClose();
    } finally { setSaving(false); }
  }

  const weeks = Math.max(0, Math.round((new Date(f.until).getTime() - new Date(f.from).getTime()) / (7 * 86400000)));
  return (
    <Modal open={open} onClose={onClose} title={f.id ? 'Edit routine' : 'New weekly routine'} footer={<><button onClick={onClose} className="btn-outline">Cancel</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : f.id ? 'Update upcoming classes' : 'Create routine'}</button></>}>
      <div className="space-y-4">
        {courses.length > 0 && <Field label="Course"><select className="input" value={f.courseCode ?? ''} onChange={e => pickCourse(e.target.value)}><option value="">— none —</option>{courses.map(c => <option key={c.code} value={c.code}>{c.code} · {c.title}</option>)}</select></Field>}
        <Field label="Title"><input autoFocus={!courses.length} className="input" placeholder="e.g. Statistics lecture" value={f.title} onChange={e => set('title', e.target.value)} /></Field>
        <div><span className="label">Type</span><div className="flex flex-wrap gap-2">{TYPES.map(t => <button key={t} type="button" onClick={() => set('type', t)} className={cn('chip', f.type === t ? `${eventTypeMeta[t].bg} ${eventTypeMeta[t].color} ring-2 ring-brand-400` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}><span className={cn('h-2 w-2 rounded-full', eventTypeMeta[t].dot)} />{eventTypeMeta[t].label}</button>)}</div></div>
        <div><span className="label">Repeats every</span><div className="grid grid-cols-7 gap-1.5">{DAY_NAMES.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} className={cn('rounded-xl py-2 text-sm font-semibold transition', f.days.includes(i) ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>{d}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><input type="time" className="input" value={f.start} onChange={e => set('start', e.target.value)} /></Field>
          <Field label="End"><input type="time" className="input" value={f.end} onChange={e => set('end', e.target.value)} /></Field>
        </div>
        <Field label="Location"><input className="input" placeholder="Room 201" value={f.location} onChange={e => set('location', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input type="date" className="input" value={f.from} onChange={e => set('from', e.target.value)} /></Field>
          <Field label="Until" hint={`${weeks} weeks · ${weeks * f.days.length} classes`}><input type="date" className="input" value={f.until} onChange={e => set('until', e.target.value)} /></Field>
        </div>
        <div className="flex gap-1.5 text-xs">{[8, 12, 16, 20].map(w => <button key={w} type="button" onClick={() => set('until', format(addWeeks(new Date(f.from + 'T00:00:00'), w), 'yyyy-MM-dd'))} className="chip border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{w} weeks</button>)}</div>
        <Field label="Notes (optional)"><textarea className="input min-h-[60px]" value={f.description ?? ''} onChange={e => set('description', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
