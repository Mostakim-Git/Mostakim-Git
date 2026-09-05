import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, format, differenceInCalendarDays } from 'date-fns';
import { Plus, CalendarCheck, AlarmClock, FileText, StickyNote, ArrowRight, Sun, Moon, Sunrise, BookOpen, Flame, Repeat } from 'lucide-react';
import { db } from '../lib/db';
import type { CalEvent } from '../lib/types';
import { todayKey, toKey, fmtTime, minutesOf, eventTypeMeta, cn, fromKey } from '../lib/utils';
import { EventCard } from '../components/EventCard';
import { EventEditor } from '../components/EventEditor';
import { EmptyState, ListSkeleton, Skeleton } from '../components/ui';
import type { Route } from '../components/Layout';
import { useNow } from '../lib/hooks';

export function Dashboard({ onNavigate, onOpenDay }: { onNavigate: (r: Route) => void; onOpenDay: (d: string) => void }) {
  const now = useNow(30000);
  const today = todayKey();
  const profile = useLiveQuery(() => db.profile.get(1));
  const todayEvents = useLiveQuery(() => db.events.where('date').equals(today).sortBy('start'), [today]);
  const upcoming = useLiveQuery(async () => {
    const from = toKey(addDays(new Date(), 1)), to = toKey(addDays(new Date(), 21));
    const all = await db.events.where('date').between(from, to, true, true).toArray();
    return all.filter(e => ['exam', 'assignment', 'fieldwork', 'seminar'].includes(e.type)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 6);
  }, []);
  const note = useLiveQuery(() => db.notes.where('date').equals(today).first(), [today]);
  const alarms = useLiveQuery(() => db.alarms.filter(a => a.enabled).toArray(), []);
  const lectureCount = useLiveQuery(() => db.lectures.count(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const [editing, setEditing] = useState<CalEvent | null | undefined>(undefined);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const current = todayEvents?.find(e => !e.allDay && minutesOf(e.start) <= nowMin && minutesOf(e.end) > nowMin);
  const next = todayEvents?.find(e => !e.allDay && minutesOf(e.start) > nowMin);
  const done = todayEvents?.filter(e => !e.allDay && minutesOf(e.end) <= nowMin).length ?? 0;
  const progress = todayEvents?.length ? Math.round((done / todayEvents.filter(e => !e.allDay).length || 0) * 100) : 0;

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 5) return { text: 'Burning the midnight oil', Icon: Moon };
    if (h < 12) return { text: 'Good morning', Icon: Sunrise };
    if (h < 17) return { text: 'Good afternoon', Icon: Sun };
    return { text: 'Good evening', Icon: Moon };
  }, [now]);

  const nextAlarm = useMemo(() => {
    if (!alarms?.length) return null;
    return [...alarms].sort((a, b) => a.time.localeCompare(b.time)).find(a => minutesOf(a.time) > nowMin && (!a.days.length || a.days.includes(now.getDay()))) ?? alarms[0];
  }, [alarms, nowMin, now]);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 p-6 md:p-8 text-white shadow-lg shadow-brand-700/30">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-20 bottom-0 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-100 text-sm"><greeting.Icon className="h-4 w-4" /> {greeting.text}</div>
            {profile ? <h1 className="mt-1 text-2xl md:text-3xl font-bold">{profile.name.split(' ')[0] || 'there'} 👋</h1> : <Skeleton className="mt-2 h-8 w-40 bg-white/20" />}
            <p className="mt-1 text-sm text-brand-100">{format(now, 'EEEE, d MMMM yyyy')}{profile && [profile.department, profile.year].filter(Boolean).length ? ` · ${[profile.department, profile.year].filter(Boolean).join(', ')}` : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="btn bg-white text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" /> New event</button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Today" value={todayEvents ? `${todayEvents.length}` : '…'} sub="events" onClick={() => onNavigate('schedule')} />
          <Stat label="Next up" value={current ? 'Now' : next ? fmtTime(next.start) : '—'} sub={(current ?? next)?.title ?? 'Nothing more today'} onClick={() => onNavigate('schedule')} />
          <Stat label="Alarm" value={nextAlarm ? fmtTime(nextAlarm.time) : 'Off'} sub={nextAlarm?.label ?? 'No alarms set'} onClick={() => onNavigate('alarms')} />
          <Stat label="Class notes" value={lectureCount === undefined ? '…' : String(lectureCount)} sub="PDF files" onClick={() => onNavigate('lectures')} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-brand-500" /> Today's schedule</h2>
              {!!todayEvents?.length && <p className="text-xs text-slate-500 mt-0.5">{done} of {todayEvents.filter(e => !e.allDay).length} done · {progress}%</p>}
            </div>
            <button onClick={() => onNavigate('schedule')} className="btn-ghost text-brand-600 text-xs">Full schedule <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          {!!todayEvents?.length && <div className="mb-4 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all" style={{ width: `${progress}%` }} /></div>}
          {todayEvents === undefined ? <ListSkeleton /> : todayEvents.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="A free day!" description="No classes or events scheduled for today. Enjoy it, or add something." action={<button onClick={() => setEditing(null)} className="btn-primary"><Plus className="h-4 w-4" /> Add event</button>} />
          ) : (
            <div className="space-y-2">
              {todayEvents.map(e => <EventCard key={e.id} ev={e} compact now={current?.id === e.id} onClick={() => setEditing(e)} />)}
            </div>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-500" /> Today's note</h2>
              <button onClick={() => onOpenDay(today)} className="btn-ghost text-brand-600 text-xs">Open <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            {note === undefined ? <Skeleton className="h-20 w-full" /> : note?.content ? (
              <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300 line-clamp-6">{note.content}</p>
            ) : (
              <button onClick={() => onOpenDay(today)} className="w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600 transition">Nothing written yet — tap to jot something down</button>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3"><Flame className="h-4 w-4 text-rose-500" /> Deadlines & exams</h2>
            {upcoming === undefined ? <ListSkeleton rows={3} /> : upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing pressing in the next 3 weeks. 🎉</p>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map(e => {
                  const d = differenceInCalendarDays(fromKey(e.date), now);
                  const m = eventTypeMeta[e.type];
                  return (
                    <li key={e.id}>
                      <button onClick={() => setEditing(e)} className="w-full text-left flex items-center gap-3 group">
                        <div className={cn('flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border text-center', m.bg)}>
                          <span className={cn('text-[10px] font-semibold uppercase', m.color)}>{format(fromKey(e.date), 'MMM')}</span>
                          <span className="text-sm font-bold leading-none text-slate-900 dark:text-white">{format(fromKey(e.date), 'd')}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-brand-600">{e.title}</div>
                          <div className="text-xs text-slate-500">{m.label}{e.courseCode ? ` · ${e.courseCode}` : ''} · {fmtTime(e.start)}</div>
                        </div>
                        <span className={cn('chip shrink-0', d <= 2 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300')}>{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d}d`}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Courses */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="h-4 w-4 text-brand-500" /> This semester's courses</h2>
          <button onClick={() => onNavigate('courses')} className="btn-ghost text-brand-600 text-xs">{courses.length ? `${courses.reduce((s, c) => s + c.credit, 0)} credits · Manage` : 'Add courses'} <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
        {courses.length === 0 && <button onClick={() => onNavigate('courses')} className="card w-full p-5 text-sm text-slate-500 border-dashed hover:border-brand-300 hover:text-brand-600 transition">No courses yet — tap to add the courses you are taking this semester.</button>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map(c => (
            <div key={c.code} className="card p-4 flex gap-3 hover:shadow-md transition">
              <div className="h-10 w-1.5 rounded-full shrink-0" style={{ background: c.color }} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-500">{c.code} · {c.credit} cr</div>
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{c.title}</div>
                <div className="truncate text-xs text-slate-500 mt-0.5">{c.teacher}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink icon={Repeat} label="Weekly routine" desc="Repeat classes every week" onClick={() => onNavigate('routine')} />
        <QuickLink icon={AlarmClock} label="Set an alarm" desc="Wake up for that 9 AM class" onClick={() => onNavigate('alarms')} />
        <QuickLink icon={FileText} label="Add class note PDF" desc="Saved to your file manager" onClick={() => onNavigate('lectures')} />
        <QuickLink icon={StickyNote} label="Browse notes" desc="Your day-by-day journal" onClick={() => onNavigate('notes')} />
      </div>

      <EventEditor open={editing !== undefined} onClose={() => setEditing(undefined)} initial={editing ?? null} />
    </div>
  );
}

function Stat({ label, value, sub, onClick }: { label: string; value: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-3 text-left hover:bg-white/15 transition">
      <div className="text-[11px] uppercase tracking-wide text-brand-100">{label}</div>
      <div className="text-xl font-bold leading-tight mt-0.5 truncate">{value}</div>
      <div className="text-xs text-brand-100/90 truncate">{sub}</div>
    </button>
  );
}

function QuickLink({ icon: Icon, label, desc, onClick }: { icon: typeof AlarmClock; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-4 flex items-center gap-3 text-left hover:shadow-md transition">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-300"><Icon className="h-5 w-5" /></div>
      <div><div className="text-sm font-semibold text-slate-900 dark:text-white">{label}</div><div className="text-xs text-slate-500">{desc}</div></div>
      <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
    </button>
  );
}
