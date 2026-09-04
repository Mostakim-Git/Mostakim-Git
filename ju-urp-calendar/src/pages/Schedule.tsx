import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, startOfWeek, format, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin } from 'lucide-react';
import { db } from '../lib/db';
import type { CalEvent } from '../lib/types';
import { toKey, todayKey, eventTypeMeta, cn, minutesOf, fmtTime, fromKey } from '../lib/utils';
import { EventEditor } from '../components/EventEditor';
import { PageHeader, EmptyState } from '../components/ui';
import { useNow } from '../lib/hooks';

const START_H = 7, END_H = 22, PX_PER_MIN = 1.1;

export function SchedulePage({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const settings = useLiveQuery(() => db.settings.get(1));
  const wso = settings?.weekStartsOn ?? 0;
  const now = useNow(60000);
  const [mode, setMode] = useState<'day' | 'week'>(() => (window.innerWidth >= 1024 ? 'week' : 'day'));
  const [editing, setEditing] = useState<CalEvent | null | undefined>(undefined);
  const [draftDate, setDraftDate] = useState(selected);

  const selDate = fromKey(selected);
  const weekStart = startOfWeek(selDate, { weekStartsOn: wso });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeStart = mode === 'week' ? toKey(weekStart) : selected;
  const rangeEnd = mode === 'week' ? toKey(addDays(weekStart, 6)) : selected;
  const events = useLiveQuery(() => db.events.where('date').between(rangeStart, rangeEnd, true, true).toArray(), [rangeStart, rangeEnd]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events ?? []) { const a = m.get(e.date) ?? []; a.push(e); m.set(e.date, a); }
    return m;
  }, [events]);

  const hours = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i);
  const colH = (END_H - START_H) * 60 * PX_PER_MIN;
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) - START_H * 60) * PX_PER_MIN;
  const shift = (n: number) => onSelect(toKey(addDays(selDate, mode === 'week' ? 7 * n : n)));
  const columns = mode === 'week' ? weekDays : [selDate];

  function openNew(date: string, hour?: number) {
    setDraftDate(date);
    setEditing(hour !== undefined ? { title: '', type: 'class', date, start: `${String(hour).padStart(2, '0')}:00`, end: `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:30`, location: '', createdAt: Date.now() } : null);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Schedule" subtitle="Your classes and events laid out by time"
        actions={<>
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
            {(['day', 'week'] as const).map(m => <button key={m} onClick={() => setMode(m)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium capitalize', mode === m ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300')}>{m}</button>)}
          </div>
          <button onClick={() => openNew(selected)} className="btn-primary"><Plus className="h-4 w-4" /> Event</button>
        </>} />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => shift(-1)} className="btn-ghost p-2"><ChevronLeft className="h-5 w-5" /></button>
          <div className="text-center">
            <div className="font-bold text-slate-900 dark:text-white">{mode === 'week' ? `${format(weekStart, 'd MMM')} – ${format(addDays(weekStart, 6), 'd MMM yyyy')}` : format(selDate, 'EEEE, d MMMM')}</div>
            <button onClick={() => onSelect(todayKey())} className="text-xs text-brand-600 font-medium hover:underline">Jump to today</button>
          </div>
          <button onClick={() => shift(1)} className="btn-ghost p-2"><ChevronRight className="h-5 w-5" /></button>
        </div>

        {/* Day strip for day mode */}
        {mode === 'day' && (
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {weekDays.map(d => { const k = toKey(d); const cnt = (byDay.get(k) ?? []).length; return (
              <button key={k} onClick={() => onSelect(k)} className={cn('flex flex-col items-center py-2 text-xs transition', k === selected ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500')}>
                <span>{format(d, 'EEE')}</span>
                <span className={cn('mt-1 flex h-8 w-8 items-center justify-center rounded-full font-semibold', k === selected ? 'bg-brand-600 text-white' : isSameDay(d, now) ? 'ring-2 ring-brand-500' : '')}>{format(d, 'd')}</span>
                {k === selected && cnt > 0 && <span className="mt-0.5 h-1 w-1 rounded-full bg-brand-500" />}
              </button>
            ); })}
          </div>
        )}

        {events === undefined ? <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 w-full" />)}</div> :
          mode === 'day' && (byDay.get(selected) ?? []).length === 0 ? (
            <EmptyState icon={Clock} title="Free day" description="No classes or events on this day. Tap the + button or click an hour slot to add one." action={<button onClick={() => openNew(selected)} className="btn-outline"><Plus className="h-4 w-4" /> Add event</button>} />
          ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[640px] lg:min-w-0">
              {mode === 'week' && (
                <div className="grid border-b border-slate-100 dark:border-slate-800" style={{ gridTemplateColumns: `56px repeat(7, minmax(0,1fr))` }}>
                  <div />
                  {weekDays.map(d => { const k = toKey(d); return (
                    <button key={k} onClick={() => { onSelect(k); setMode('day'); }} className={cn('py-2 text-center text-xs', isSameDay(d, now) ? 'text-brand-600 font-bold' : 'text-slate-500')}>
                      <div>{format(d, 'EEE')}</div>
                      <div className={cn('mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold', isSameDay(d, now) && 'bg-brand-600 text-white')}>{format(d, 'd')}</div>
                    </button>
                  ); })}
                </div>
              )}
              {/* All-day row */}
              {columns.some(d => (byDay.get(toKey(d)) ?? []).some(e => e.allDay)) && (
                <div className="grid border-b border-slate-100 dark:border-slate-800" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0,1fr))` }}>
                  <div className="text-[10px] text-slate-400 p-1 text-right pr-2">all-day</div>
                  {columns.map(d => <div key={toKey(d)} className="p-1 space-y-1">{(byDay.get(toKey(d)) ?? []).filter(e => e.allDay).map(e => <button key={e.id} onClick={() => setEditing(e)} className={cn('w-full truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-left', eventTypeMeta[e.type].bg, eventTypeMeta[e.type].color)}>{e.title}</button>)}</div>)}
                </div>
              )}
              <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0,1fr))`, height: colH }}>
                {/* Hour labels + lines */}
                <div className="relative">
                  {hours.map(h => <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-slate-400" style={{ top: (h - START_H) * 60 * PX_PER_MIN }}>{fmtTime(`${h}:00`).replace(':00', '')}</div>)}
                </div>
                {columns.map(d => {
                  const k = toKey(d);
                  const evs = (byDay.get(k) ?? []).filter(e => !e.allDay);
                  const isT = isSameDay(d, now);
                  return (
                    <div key={k} className={cn('relative border-l border-slate-100 dark:border-slate-800', isT && 'bg-brand-50/30 dark:bg-brand-950/10')}>
                      {hours.map(h => <div key={h} onClick={() => openNew(k, h)} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" style={{ top: (h - START_H) * 60 * PX_PER_MIN, height: 60 * PX_PER_MIN }} />)}
                      {evs.map(e => {
                        const top = Math.max(0, (minutesOf(e.start) - START_H * 60) * PX_PER_MIN);
                        const height = Math.max(26, (minutesOf(e.end) - minutesOf(e.start)) * PX_PER_MIN);
                        const m = eventTypeMeta[e.type];
                        const live = isT && minutesOf(e.start) <= now.getHours() * 60 + now.getMinutes() && minutesOf(e.end) > now.getHours() * 60 + now.getMinutes();
                        return (
                          <button key={e.id} onClick={(ev) => { ev.stopPropagation(); setEditing(e); }} className={cn('absolute left-1 right-1 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition hover:z-10 hover:shadow-md', m.bg, live && 'ring-2 ring-brand-500')} style={{ top, height }}>
                            <div className={cn('truncate text-[11px] font-semibold', m.color)}>{e.courseCode ?? m.label}</div>
                            <div className="truncate text-xs font-medium text-slate-900 dark:text-white">{e.title}</div>
                            {height > 48 && <div className="mt-0.5 truncate text-[11px] text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(e.start)}–{fmtTime(e.end)}{e.location && <><MapPin className="h-3 w-3 ml-1" />{e.location}</>}</div>}
                          </button>
                        );
                      })}
                      {isT && nowTop >= 0 && nowTop <= colH && (
                        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowTop }}>
                          <span className="h-2.5 w-2.5 -ml-1 rounded-full bg-rose-500 shadow" /><span className="h-px flex-1 bg-rose-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <EventEditor open={editing !== undefined} onClose={() => setEditing(undefined)} initial={editing && editing.id ? editing : editing ?? null} defaultDate={draftDate} />
    </div>
  );
}
