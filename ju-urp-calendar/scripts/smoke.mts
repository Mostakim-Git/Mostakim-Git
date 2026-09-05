import 'fake-indexeddb/auto';
(globalThis as any).window = globalThis; (globalThis as any).document = { visibilityState: 'visible', addEventListener(){}, removeEventListener(){} };
const { db } = await import('../src/lib/db.ts');
const { initIfNeeded } = await import('../src/data/seed.ts');
const { buildSnapshot } = await import('../src/lib/widget.ts');
console.log('init', await initIfNeeded(), 'again', await initIfNeeded());
console.log('clean start ->', 'events', await db.events.count(), 'courses', await db.courses.count(), 'notes', await db.notes.count(), 'lectures', await db.lectures.count(), 'onboarded', (await db.settings.get(1))?.onboarded);
const s = await buildSnapshot(); console.log('snapshot keys', Object.keys(s), 'days', Object.keys(s.days).length);
