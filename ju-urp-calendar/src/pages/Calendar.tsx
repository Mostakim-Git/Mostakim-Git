import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, StickyNote } from 'lucide-react';
import { db } from '../lib/db';
import type { CalEvent } from '../lib/types';
import { toKey, todayKey, eventTypeMeta, cn, fmtDateLong, DAY_NAMES } from '../lib/utils';
import { EventCard } from '../components/EventCard';
import { EventEditor } from '../components/EventEditor';
import { EmptyState, PageHeader } from '../components/ui';
import { DayNote } from '../components/DayNote';

export function CalendarPage({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date(selected + 'T00:00:00')));
  const settings = useLiveQuery(() => db.settings.get(1));
  const wso = settings?.weekStartsOn ?? 0;
  const [editing, setEditing] = useState<CalEvent | null | undefined>(undefined);

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: wso });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: wso });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart.getTime(), gridEnd.getTime()]);

  const events = useLiveQuery(() => db.events.where('date').between(toKey(gridStart), toKey(gridEnd), true, true).toArray(), [toKey(gridStart), toKey(gridEnd)]);
  const notes = useLiveQuery(() => db.notes.where('date').between(toKey(gridStart), toKey(gridEnd), true, true).toArray(), [toKey(gridStart), toKey(gridEnd)]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events ?? []) { const a = m.get(e.date) ?? []; a.push(e); m.set(e.date, a); }
    for (const a of m.values()) a.sort((x, y) => x.start.localeCompare(y.start));
    return m;
  }, [events]);
  const noteDays = useMemo(() => new Set((notes ?? []).filter(n => n.content.trim()).map(n => n.date)), [notes]);
  const dayEvents = byDay.get(selected) ?? [];
  const today = todayKey();
  const weekdays = Array.from({ length: 7 }, (_, i) => DAY_NAMES[(wso + i) % 7]);

  function jump(to: Date) { setCursor(startOfMonth(to)); }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Calendar" subtitle="Tap a day to see its schedule and note" actions={<button onClick={() => setEditing(null)} className="btn-primary"><Plus className="h-4 w-4" /> Event</button>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => jump(subMonths(cursor, 1))} className="btn-ghost p-2"><ChevronLeft className="h-5 w-5" /></button>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{format(cursor, 'MMMM yyyy')}</div>
              <button onClick={() => { jump(new Date()); onSelect(today); }} className="text-xs text-brand-600 font-medium hover:underline">Today</button>
            </div>
            <button onClick={() => jump(addMonths(cursor, 1))} className="btn-ghost p-2"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
            {weekdays.map(d => <div key={d} className={cn('py-1', (d === 'Fri' || d === 'Sat') && 'text-rose-400')}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {events === undefined ? days.map((d, i) => <div key={i} className="skeleton aspect-square" />) : days.map(d => {
              const k = toKey(d);
              const evs = byDay.get(k) ?? [];
              const inMonth = isSameMonth(d, cursor);
              const sel = k === selected;
              const types = [...new Set(evs.map(e => e.type))].slice(0, 4);
              return (
                <button key={k} onClick={() => onSelect(k)} className={cn('relative flex aspect-square flex-col items-center justify-start rounded-xl p-1 text-sm transition',
                  !inMonth && 'opacity-35', sel ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                  k === today && !sel && 'ring-2 ring-brand-500 ring-inset font-bold text-brand-700 dark:text-brand-300')}>
                  <span className="mt-1 leading-none">{format(d, 'd')}</span>
                  <div className="mt-auto mb-1 flex items-center gap-0.5">
                    {types.map(t => <span key={t} className={cn('h-1.5 w-1.5 rounded-full', sel ? 'bg-white/90' : eventTypeMeta[t].dot)} />)}
                    {noteDays.has(k) && <StickyNote className={cn('h-2.5 w-2.5 ml-0.5', sel ? 'text-white/90' : 'text-amber-500')} />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {(Object.keys(eventTypeMeta) as (keyof typeof eventTypeMeta)[]).map(t => <span key={t} className="inline-flex items-center gap-1"><span className={cn('h-2 w-2 rounded-full', eventTypeMeta[t].dot)} />{eventTypeMeta[t].label}</span>)}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{fmtDateLong(selected)}</div>
                <div className="text-xs text-slate-500">{dayEvents.length} event{dayEvents.length === 1 ? '' : 's'}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onSelect(toKey(addDays(new Date(selected + 'T00:00:00'), -1)))} className="btn-ghost p-1.5"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => onSelect(toKey(addDays(new Date(selected + 'T00:00:00'), 1)))} className="btn-ghost p-1.5"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            {dayEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Add a class, exam, deadline or personal event for this day." action={<button onClick={() => setEditing(null)} className="btn-outline"><Plus className="h-4 w-4" /> Add event</button>} />
            ) : (
              <div className="space-y-2">{dayEvents.map(e => <EventCard key={e.id} ev={e} compact onClick={() => setEditing(e)} />)}</div>
            )}
          </div>
          <DayNote date={selected} />
        </div>
      </div>
      <EventEditor open={editing !== undefined} onClose={() => setEditing(undefined)} initial={editing ?? null} defaultDate={selected} />
    </div>
  );
}
