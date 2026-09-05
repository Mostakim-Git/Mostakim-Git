import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import { db } from './db';
import type { CalEvent, Routine } from './types';

/** Materialise a routine into concrete events between from..until on the chosen weekdays. */
function expand(r: Routine): CalEvent[] {
  const days = eachDayOfInterval({ start: parseISO(r.from), end: parseISO(r.until) });
  return days.filter(d => r.days.includes(d.getDay())).map(d => ({
    title: r.title, type: r.type, date: format(d, 'yyyy-MM-dd'), start: r.start, end: r.end,
    location: r.location, courseCode: r.courseCode, description: r.description, seriesId: r.id, createdAt: Date.now(),
  }));
}

export async function createRoutine(r: Routine): Promise<{ id: number; created: number }> {
  return db.transaction('rw', [db.routines, db.events], async () => {
    const id = await db.routines.add(r);
    const evs = expand({ ...r, id });
    await db.events.bulkAdd(evs);
    return { id, created: evs.length };
  });
}

/** Replace all future (>= today) generated events of the routine; past ones are kept as history. */
export async function updateRoutine(r: Routine): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd');
  return db.transaction('rw', [db.routines, db.events], async () => {
    await db.routines.put(r);
    await db.events.where('seriesId').equals(r.id!).filter(e => e.date >= today).delete();
    const evs = expand(r).filter(e => e.date >= today);
    await db.events.bulkAdd(evs);
    return evs.length;
  });
}

export interface RoutineSnapshot { routine: Routine; events: CalEvent[] }

/** Delete a routine and (optionally) its generated events. Returns a snapshot for Undo. */
export async function deleteRoutine(id: number, scope: 'future' | 'all' | 'keep'): Promise<RoutineSnapshot> {
  const today = format(new Date(), 'yyyy-MM-dd');
  return db.transaction('rw', [db.routines, db.events], async () => {
    const routine = (await db.routines.get(id))!;
    const coll = db.events.where('seriesId').equals(id);
    const events = scope === 'all' ? await coll.toArray() : scope === 'future' ? await coll.filter(e => e.date >= today).toArray() : [];
    if (events.length) await db.events.bulkDelete(events.map(e => e.id!));
    if (scope === 'keep') await coll.modify({ seriesId: undefined });
    await db.routines.delete(id);
    return { routine, events };
  });
}

export async function restoreRoutine(snap: RoutineSnapshot) {
  await db.transaction('rw', [db.routines, db.events], async () => {
    await db.routines.put(snap.routine);
    if (snap.events.length) await db.events.bulkPut(snap.events);
    else await db.events.filter(e => e.title === snap.routine.title && e.start === snap.routine.start && !e.seriesId).modify({ seriesId: snap.routine.id });
  });
}

/** Extend routines whose `until` is within 2 weeks by another 16 weeks? No — we keep it explicit; but expose helper. */
export async function extendRoutine(id: number, weeks: number) {
  const r = await db.routines.get(id); if (!r) return 0;
  const newUntil = format(addDays(parseISO(r.until), weeks * 7), 'yyyy-MM-dd');
  const extra = expand({ ...r, from: format(addDays(parseISO(r.until), 1), 'yyyy-MM-dd'), until: newUntil });
  await db.transaction('rw', [db.routines, db.events], async () => {
    await db.routines.update(id, { until: newUntil });
    await db.events.bulkAdd(extra);
  });
  return extra.length;
}
