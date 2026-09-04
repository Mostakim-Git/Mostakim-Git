import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Save, X, Mail, Phone, Home, Droplets, GraduationCap, IdCard, BookOpen } from 'lucide-react';
import { db } from '../lib/db';
import type { Profile } from '../lib/types';
import { cn } from '../lib/utils';
import { PageHeader, Avatar, Field, Skeleton } from '../components/ui';
import { useToast } from '../components/Toast';

const COLORS = ['#3b63f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#0f172a'];

export function ProfilePage() {
  const profile = useLiveQuery(() => db.profile.get(1));
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const stats = useLiveQuery(async () => ({ events: await db.events.count(), notes: await db.notes.count(), lectures: await db.lectures.count() }), []);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => { if (profile && !edit) setForm(profile); }, [profile, edit]);

  async function save() {
    if (!form) return;
    if (!form.name.trim()) { toast('Name cannot be empty', 'error'); return; }
    setSaving(true);
    const prev = profile;
    setEdit(false);
    try { await db.profile.put({ ...form, id: 1 }); toast('Profile updated'); }
    catch { if (prev) await db.profile.put(prev); toast('Could not save profile', 'error'); }
    finally { setSaving(false); }
  }
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm(f => f ? { ...f, [k]: v } : f);

  if (!profile || !form) return <div className="space-y-4"><Skeleton className="h-40 w-full rounded-3xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  return (
    <div className="animate-fade-up">
      <PageHeader title="Profile" subtitle="Your student identity — editable anytime" actions={edit ? (
        <><button onClick={() => { setEdit(false); setForm(profile); }} className="btn-outline"><X className="h-4 w-4" /> Cancel</button><button onClick={save} disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}</button></>
      ) : <button onClick={() => setEdit(true)} className="btn-primary"><Pencil className="h-4 w-4" /> Edit profile</button>} />

      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <div className="rounded-full ring-4 ring-white dark:ring-slate-900"><Avatar name={form.name} color={form.avatarColor} size="xl" /></div>
            <div className="pb-1 flex-1 min-w-[200px]">
              {edit ? <input className="input text-lg font-bold" value={form.name} onChange={e => set('name', e.target.value)} /> : <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>}
              <p className="text-sm text-slate-500 mt-0.5">Dept. of Urban & Regional Planning · Jahangirnagar University</p>
            </div>
          </div>
          {edit && <div className="mt-4 flex items-center gap-2"><span className="text-xs text-slate-500 mr-1">Avatar colour</span>{COLORS.map(c => <button key={c} onClick={() => set('avatarColor', c)} className={cn('h-7 w-7 rounded-full transition', form.avatarColor === c && 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110')} style={{ background: c }} />)}</div>}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Item icon={IdCard} label="Student ID" edit={edit} value={form.studentId} onChange={v => set('studentId', v)} />
            <Item icon={GraduationCap} label="Batch" edit={edit} value={form.batch} onChange={v => set('batch', v)} />
            <Item icon={BookOpen} label="Year" edit={edit} value={form.year} onChange={v => set('year', v)} />
            <Item icon={BookOpen} label="Semester" edit={edit} value={form.semester} onChange={v => set('semester', v)} />
            <Item icon={GraduationCap} label="Session" edit={edit} value={form.session} onChange={v => set('session', v)} />
            <Item icon={Home} label="Hall" edit={edit} value={form.hall} onChange={v => set('hall', v)} />
            <Item icon={Mail} label="Email" edit={edit} value={form.email} onChange={v => set('email', v)} type="email" />
            <Item icon={Phone} label="Phone" edit={edit} value={form.phone} onChange={v => set('phone', v)} type="tel" />
            <Item icon={Droplets} label="Blood group" edit={edit} value={form.bloodGroup} onChange={v => set('bloodGroup', v)} />
          </div>
          <div className="mt-4">
            <span className="label">About</span>
            {edit ? <textarea className="input min-h-[90px]" value={form.bio} onChange={e => set('bio', e.target.value)} /> : <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{profile.bio || <span className="text-slate-400">No bio yet.</span>}</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[['Events', stats?.events], ['Notes', stats?.notes], ['Lecture PDFs', stats?.lectures]].map(([l, v]) => (
          <div key={l as string} className="card p-4 text-center"><div className="text-3xl font-bold text-slate-900 dark:text-white">{v ?? '…'}</div><div className="text-xs uppercase tracking-wide text-slate-500">{l}</div></div>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Enrolled courses · {courses.reduce((s, c) => s + c.credit, 0)} credits</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {courses.map(c => (
            <div key={c.code} className="flex items-center gap-3 py-2.5">
              <span className="h-8 w-1.5 rounded-full" style={{ background: c.color }} />
              <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.code} — {c.title}</div><div className="text-xs text-slate-500">{c.teacher} · {c.room}</div></div>
              <span className="chip border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{c.credit} cr</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Item({ icon: Icon, label, value, edit, onChange, type = 'text' }: { icon: typeof Mail; label: string; value: string; edit: boolean; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        {edit ? <Field label={label}><input type={type} className="input" value={value} onChange={e => onChange(e.target.value)} /></Field> : (
          <><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="text-sm font-medium text-slate-900 dark:text-white truncate">{value || <span className="text-slate-400">—</span>}</div></>
        )}
      </div>
    </div>
  );
}
