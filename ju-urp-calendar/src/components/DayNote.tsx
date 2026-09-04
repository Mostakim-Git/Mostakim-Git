import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StickyNote, Check, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import type { Note } from '../lib/types';
import { cn } from '../lib/utils';

const MOODS: { id: NonNullable<Note['mood']>; emoji: string; label: string }[] = [
  { id: 'great', emoji: '🤩', label: 'Great' }, { id: 'good', emoji: '🙂', label: 'Good' }, { id: 'ok', emoji: '😐', label: 'Okay' }, { id: 'bad', emoji: '😩', label: 'Rough' },
];

export function DayNote({ date, autoFocus }: { date: string; autoFocus?: boolean }) {
  const note = useLiveQuery(() => db.notes.where('date').equals(date).first(), [date]);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<Note['mood']>();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const loadedFor = useRef<string | null>(null);
  const timer = useRef<number | null>(null);

  // Load from db when date changes (or when the note first resolves)
  useEffect(() => {
    if (note === undefined) return;
    if (loadedFor.current !== date) {
      setText(note?.content ?? ''); setMood(note?.mood); loadedFor.current = date; setStatus('idle');
    }
  }, [note, date]);

  async function persist(content: string, m: Note['mood']) {
    setStatus('saving');
    const existing = await db.notes.where('date').equals(date).first();
    if (existing?.id) await db.notes.update(existing.id, { content, mood: m, updatedAt: Date.now() });
    else if (content.trim() || m) await db.notes.add({ date, content, mood: m, updatedAt: Date.now() });
    setStatus('saved');
    window.setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 1500);
  }
  function schedule(content: string, m: Note['mood']) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(content, m), 500);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-500" /> Note for this day</h3>
        <span className={cn('text-xs flex items-center gap-1 transition', status === 'idle' ? 'opacity-0' : 'opacity-100', status === 'saved' ? 'text-emerald-600' : 'text-slate-400')}>
          {status === 'saving' ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving</> : <><Check className="h-3 w-3" /> Saved</>}
        </span>
      </div>
      <div className="flex gap-1.5 mb-3">
        {MOODS.map(m => (
          <button key={m.id} title={m.label} onClick={() => { const nm = mood === m.id ? undefined : m.id; setMood(nm); schedule(text, nm); }}
            className={cn('h-9 w-9 rounded-xl text-lg transition border', mood === m.id ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 scale-110' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 grayscale hover:grayscale-0')}>{m.emoji}</button>
        ))}
      </div>
      {note === undefined ? <div className="skeleton h-32 w-full" /> : (
        <textarea autoFocus={autoFocus} value={text} onChange={e => { setText(e.target.value); schedule(e.target.value, mood); }}
          placeholder="What happened today? To-dos, lecture takeaways, reminders…"
          className="input min-h-[140px] resize-y leading-relaxed bg-amber-50/40 dark:bg-slate-800/60 border-amber-100 dark:border-slate-700 focus:ring-amber-400/40 focus:border-amber-400" />
      )}
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>Auto-saves as you type</span><span>{text.length} chars</span>
      </div>
    </div>
  );
}
