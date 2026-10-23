import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, BellRing } from 'lucide-react';
import { db } from '../lib/db';
import type { CalEvent, EventType } from '../lib/types';
import { eventTypeMeta, cn, todayKey } from '../lib/utils';
import { Modal, Field } from './ui';
import { useToast } from './Toast';
import { scheduleEventReminder, cancelEventReminder, buzz } from '../lib/notifications';

const TYPES = Object.keys(eventTypeMeta) as EventType[];

export function EventEditor({ open, onClose, initial, defaultDate }: { open: boolean; onClose: () => void; initial?: CalEvent | null; defaultDate?: string }) {
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.get(1));
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CalEvent>(blank(defaultDate));
  const [remind, setRemind] = useState(true);

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : blank(defaultDate));
  }, [open, initial, defaultDate]);

  function blank(d?: string): CalEvent {
    return { title: '', type: 'class', date: d ?? todayKey(), start: '09:00', end: '10:30', location: '', courseCode: '', description: '', createdAt: Date.now() };
  }
  const set = <K extends keyof CalEvent>(k: K, v: CalEvent[K]) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) { toast('Give the event a title', 'error'); return; }
    if (!form.allDay && form.end < form.start) { toast('End time must be after start time', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), courseCode: form.courseCode || undefined };
      let id: number;
      if (form.id) { await db.events.update(form.id, payload); id = form.id; toast('Event updated'); }
      else { id = await db.events.add(payload); toast('Event added'); }
      if (remind && !form.allDay) {
        await scheduleEventReminder(id, payload.title, payload.date, payload.start, settings?.classReminderMinutes ?? 15, `${eventTypeMeta[payload.type].label} · ${payload.location || 'No location'} · starts at ${payload.start}`);
      } else await cancelEventReminder(id);
      buzz();
      onClose();
    } catch (e) { toast('Could not save event', 'error'); console.error(e); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!form.id) return;
    const snapshot = { ...form };
    const id = form.id;
    onClose();
    await db.events.delete(id);
    await cancelEventReminder(id);
    toast('Event deleted', 'info', { label: 'Undo', onClick: async () => { await db.events.add(snapshot); } });
  }

  return (
    <Modal open={open} onClose={onClose} title={form.id ? 'Edit event' : 'New event'}
      footer={<>
        {form.id && <button onClick={remove} className="btn-ghost text-rose-600 mr-auto"><Trash2 className="h-4 w-4" /> Delete</button>}
        <button onClick={onClose} className="btn-outline">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add event'}</button>
      </>}>
      <div className="space-y-4">
        {form.seriesId && <div className="rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900 p-3 text-xs text-brand-800 dark:text-brand-200">Part of a <b>weekly routine</b>. Changes here affect only this one class. To change every week, edit the routine on the Weekly Routine page.</div>}
        <Field label="Title"><input autoFocus className="input" placeholder="e.g. Mid-term: Transportation Planning" value={form.title} onChange={e => set('title', e.target.value)} /></Field>
        <div>
          <span className="label">Type</span>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button key={t} type="button" onClick={() => set('type', t)} className={cn('chip transition', form.type === t ? `${eventTypeMeta[t].bg} ${eventTypeMeta[t].color} ring-2 ring-offset-1 ring-brand-400 dark:ring-offset-slate-900` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                <span className={cn('h-2 w-2 rounded-full', eventTypeMeta[t].dot)} /> {eventTypeMeta[t].label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
          <Field label="Course (optional)">
            <select className="input" value={form.courseCode ?? ''} onChange={e => set('courseCode', e.target.value)}>
              <option value="">— none —</option>
              {courses.map(c => <option key={c.code} value={c.code}>{c.code} · {c.title}</option>)}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" checked={!!form.allDay} onChange={e => set('allDay', e.target.checked)} /> All-day event
        </label>
        {!form.allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><input type="time" className="input" value={form.start} onChange={e => set('start', e.target.value)} /></Field>
            <Field label="End"><input type="time" className="input" value={form.end} onChange={e => set('end', e.target.value)} /></Field>
          </div>
        )}
        <Field label="Location"><input className="input" placeholder="Room 203 / GIS Lab / Studio Hall" value={form.location} onChange={e => set('location', e.target.value)} /></Field>
        <Field label="Notes"><textarea className="input min-h-[80px]" placeholder="Syllabus, what to bring, submission details…" value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></Field>
        {!form.allDay && (
          <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><BellRing className="h-4 w-4 text-brand-500" /> Remind me {settings?.classReminderMinutes ?? 15} min before</span>
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={remind} onChange={e => setRemind(e.target.checked)} />
          </label>
        )}
      </div>
    </Modal>
  );
}
