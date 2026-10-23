import 'fake-indexeddb/auto';
(globalThis as any).window = globalThis; (globalThis as any).document = { visibilityState: 'visible', addEventListener(){}, removeEventListener(){} };
const { db } = await import('../src/lib/db.ts');
const { initIfNeeded } = await import('../src/data/seed.ts');
const { buildSnapshot } = await import('../src/lib/widget.ts');
console.log('init', await initIfNeeded(), 'again', await initIfNeeded());
console.log('clean start ->', 'events', await db.events.count(), 'courses', await db.courses.count(), 'notes', await db.notes.count(), 'lectures', await db.lectures.count(), 'onboarded', (await db.settings.get(1))?.onboarded);
const s = await buildSnapshot(); console.log('snapshot keys', Object.keys(s), 'days', Object.keys(s.days).length);

// v1.2: routine create / delete / undo
const { createRoutine, deleteRoutine, restoreRoutine } = await import('../src/lib/routines');
const r = await createRoutine({ title: 'Stats', type: 'class', days: [0, 2], start: '09:00', end: '10:30', location: 'R201', from: '2026-09-06', until: '2026-10-03', createdAt: Date.now() });
console.log('routine created', r);
if (r.created !== 8) throw new Error('expected 8 events, got ' + r.created);
const snap = await deleteRoutine(r.id, 'all');
console.log('after delete', await db.events.count(), 'events');
await restoreRoutine(snap);
console.log('after undo', await db.events.count(), 'events, routines', await db.routines.count());
if (await db.events.count() !== 8) throw new Error('undo failed');
console.log('settings v2 fields', (await db.settings.get(1))?.firstClassAlarmMinutes, (await db.settings.get(1))?.alarmTone);
