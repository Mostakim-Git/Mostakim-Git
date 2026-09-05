import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import type { Course } from '../lib/types';
import { COURSE_COLORS } from '../data/seed';
import { cn } from '../lib/utils';
import { PageHeader, EmptyState, Modal, Field, ListSkeleton } from '../components/ui';
import { useToast } from '../components/Toast';

export function CoursesPage() {
  const courses = useLiveQuery(() => db.courses.toArray(), []);
  const counts = useLiveQuery(async () => { const m: Record<string, number> = {}; for (const e of await db.events.toArray()) if (e.courseCode) m[e.courseCode] = (m[e.courseCode] ?? 0) + 1; return m; }, []) ?? {};
  const [editing, setEditing] = useState<Course | null | undefined>(undefined);
  const { toast } = useToast();

  async function remove(c: Course) {
    await db.courses.delete(c.id!);
    toast(`${c.code} removed`, 'info', { label: 'Undo', onClick: async () => { const { id: _i, ...rest } = c; await db.courses.add(rest as Course); } });
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Courses" subtitle="Your current semester's courses — used for classes, lectures and colours" actions={<button onClick={() => setEditing(null)} className="btn-primary"><Plus className="h-4 w-4" /> Course</button>} />
      {courses === undefined ? <div className="card p-4"><ListSkeleton /></div> : courses.length === 0 ? (
        <div className="card"><EmptyState icon={BookOpen} title="No courses yet" description="Add the courses you are taking this semester. Events and lecture PDFs can then be linked to them." action={<button onClick={() => setEditing(null)} className="btn-primary"><Plus className="h-4 w-4" /> Add course</button>} /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(c => (
            <div key={c.id} className="card p-4 flex gap-3 group">
              <div className="h-full w-1.5 rounded-full shrink-0 self-stretch" style={{ background: c.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-500">{c.code} · {c.credit} cr</div>
                <div className="font-semibold text-slate-900 dark:text-white truncate">{c.title}</div>
                <div className="text-xs text-slate-500 truncate">{c.teacher || 'No teacher set'}{c.room ? ` · ${c.room}` : ''}</div>
                <div className="text-[11px] text-slate-400 mt-1">{counts[c.code] ?? 0} scheduled events</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(c)} className="btn-ghost p-1.5"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(c)} className="btn-ghost p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <CourseEditor open={editing !== undefined} onClose={() => setEditing(undefined)} initial={editing ?? null} nextColor={COURSE_COLORS[(courses?.length ?? 0) % COURSE_COLORS.length]} />
    </div>
  );
}

export function CourseEditor({ open, onClose, initial, nextColor }: { open: boolean; onClose: () => void; initial: Course | null; nextColor: string }) {
  const blank = (): Course => ({ code: '', title: '', credit: 3, teacher: '', color: nextColor, room: '' });
  const [f, setF] = useState<Course>(blank());
  const { toast } = useToast();
  useEffect(() => { if (open) setF(initial ? { ...initial } : blank()); }, [open, initial]); // eslint-disable-line
  async function save() {
    if (!f.code.trim() && !f.title.trim()) { toast('Enter a course code or title', 'error'); return; }
    const payload = { ...f, code: f.code.trim() || f.title.trim().slice(0, 12), title: f.title.trim() || f.code.trim() };
    if (f.id) await db.courses.put(payload); else await db.courses.add(payload);
    toast(f.id ? 'Course updated' : 'Course added'); onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={f.id ? 'Edit course' : 'New course'} footer={<><button onClick={onClose} className="btn-outline">Cancel</button><button onClick={save} className="btn-primary">Save</button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code"><input autoFocus className="input" placeholder="CSE 101" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Title"><input className="input" placeholder="Introduction to Programming" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field></div>
        </div>
        <Field label="Teacher"><input className="input" value={f.teacher} onChange={e => setF({ ...f, teacher: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Credit"><input type="number" min="0" step="0.5" className="input" value={f.credit} onChange={e => setF({ ...f, credit: Number(e.target.value) })} /></Field>
          <Field label="Default room"><input className="input" value={f.room} onChange={e => setF({ ...f, room: e.target.value })} /></Field>
        </div>
        <div><span className="label">Colour</span><div className="flex flex-wrap gap-2">{COURSE_COLORS.map(c => <button key={c} type="button" onClick={() => setF({ ...f, color: c })} className={cn('h-8 w-8 rounded-full transition', f.color === c && 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110')} style={{ background: c }} />)}</div></div>
      </div>
    </Modal>
  );
}
