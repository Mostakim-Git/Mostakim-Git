import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, School, BookOpen, User } from 'lucide-react';
import { db } from '../lib/db';
import { COURSE_COLORS } from '../data/seed';
import { cn } from '../lib/utils';
import { Field } from '../components/ui';
import { AppLogo } from '../components/AppLogo';

interface DraftCourse { code: string; title: string; teacher: string; credit: string }

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ name: '', university: '', department: '', year: '', semester: '', batch: '', studentId: '' });
  const [courses, setCourses] = useState<DraftCourse[]>([{ code: '', title: '', teacher: '', credit: '3' }]);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof p, v: string) => setP(x => ({ ...x, [k]: v }));
  const validCourses = courses.filter(c => c.code.trim() || c.title.trim());

  async function finish() {
    setSaving(true);
    const prof = await db.profile.get(1);
    await db.profile.put({ ...(prof!), ...p, name: p.name.trim() || 'Student' });
    if (validCourses.length) await db.courses.bulkAdd(validCourses.map((c, i) => ({ code: c.code.trim() || `Course ${i + 1}`, title: c.title.trim() || c.code.trim(), teacher: c.teacher.trim(), credit: Number(c.credit) || 0, color: COURSE_COLORS[i % COURSE_COLORS.length], room: '' })));
    await db.settings.update(1, { onboarded: true });
    onDone();
  }

  const steps = [
    { icon: User, title: 'Welcome to CaCa', sub: 'Your personal class calendar. Everything stays on this device — no account needed.' },
    { icon: School, title: 'Where do you study?', sub: 'Works for any university, department and year. You can edit this anytime in Profile.' },
    { icon: BookOpen, title: 'Add your courses', sub: 'Optional — add a few now, or manage them later from the Courses page.' },
  ];
  const S = steps[step];

  return (
    <div className="min-h-full bg-gradient-to-b from-[#062a3f] via-[#0b3d55] to-[#24455a] text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 pt-[calc(1.5rem+var(--sat))]">
        <div className="w-full max-w-md animate-fade-up" key={step}>
          <div className="flex items-center justify-center mb-6">{step === 0 ? <AppLogo size={96} /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><S.icon className="h-7 w-7" /></div>}</div>
          <h1 className="text-center text-2xl font-bold">{S.title}</h1>
          <p className="text-center text-sm text-white/70 mt-1 mb-6">{S.sub}</p>

          <div className="rounded-3xl bg-white text-slate-900 p-5 shadow-2xl space-y-4">
            {step === 0 && (
              <>
                <Field label="Your name"><input autoFocus className="input" placeholder="e.g. Mostakim Hossain" value={p.name} onChange={e => set('name', e.target.value)} /></Field>
                <Field label="Student ID (optional)"><input className="input" value={p.studentId} onChange={e => set('studentId', e.target.value)} /></Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="University"><input autoFocus className="input" placeholder="e.g. Jahangirnagar University" value={p.university} onChange={e => set('university', e.target.value)} /></Field>
                <Field label="Department"><input className="input" placeholder="e.g. Urban & Regional Planning" value={p.department} onChange={e => set('department', e.target.value)} /></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Year"><input className="input" placeholder="3rd" value={p.year} onChange={e => set('year', e.target.value)} /></Field>
                  <Field label="Semester"><input className="input" placeholder="2nd" value={p.semester} onChange={e => set('semester', e.target.value)} /></Field>
                  <Field label="Batch"><input className="input" placeholder="52" value={p.batch} onChange={e => set('batch', e.target.value)} /></Field>
                </div>
              </>
            )}
            {step === 2 && (
              <div className="space-y-3 max-h-[45vh] overflow-y-auto scrollbar-thin pr-1">
                {courses.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input className="input col-span-1" placeholder="Code" value={c.code} onChange={e => setCourses(cs => cs.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} />
                      <input className="input col-span-2" placeholder="Course title" value={c.title} onChange={e => setCourses(cs => cs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input className="input col-span-2" placeholder="Teacher (optional)" value={c.teacher} onChange={e => setCourses(cs => cs.map((x, j) => j === i ? { ...x, teacher: e.target.value } : x))} />
                      <input className="input" type="number" min="0" step="0.5" placeholder="Credit" value={c.credit} onChange={e => setCourses(cs => cs.map((x, j) => j === i ? { ...x, credit: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setCourses(cs => [...cs, { code: '', title: '', teacher: '', credit: '3' }])} className="btn-outline w-full">+ Add another course</button>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(s => s - 1)} className={cn('btn text-white/80 hover:bg-white/10', step === 0 && 'invisible')}><ArrowLeft className="h-4 w-4" /> Back</button>
            <div className="flex gap-1.5">{steps.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40')} />)}</div>
            {step < 2 ? <button onClick={() => setStep(s => s + 1)} className="btn bg-white text-[#0b3d55] font-semibold">Next <ArrowRight className="h-4 w-4" /></button>
              : <button onClick={finish} disabled={saving} className="btn bg-white text-[#0b3d55] font-semibold"><Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Start'}</button>}
          </div>
          {step === 2 && <button onClick={finish} className="mt-3 w-full text-center text-xs text-white/60 hover:text-white">Skip for now</button>}
        </div>
      </div>
    </div>
  );
}
