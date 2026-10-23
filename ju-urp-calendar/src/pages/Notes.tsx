import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, formatDistanceToNow } from 'date-fns';
import { Search, StickyNote, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { db } from '../lib/db';
import { fromKey, todayKey, fmtDateLong, cn } from '../lib/utils';
import { DayNote } from '../components/DayNote';
import { PageHeader, EmptyState, ListSkeleton } from '../components/ui';
import { useToast } from '../components/Toast';

const MOOD_EMOJI: Record<string, string> = { great: '🤩', good: '🙂', ok: '😐', bad: '😩' };

export function NotesPage({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const notes = useLiveQuery(() => db.notes.orderBy('date').reverse().toArray(), []);
  const [q, setQ] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toast } = useToast();
  const filtered = useMemo(() => (notes ?? []).filter(n => n.content.trim() && (!q || n.content.toLowerCase().includes(q.toLowerCase()) || fmtDateLong(n.date).toLowerCase().includes(q.toLowerCase()))), [notes, q]);

  async function remove(id: number) {
    const snap = await db.notes.get(id);
    await db.notes.delete(id);
    toast('Note deleted', 'info', { label: 'Undo', onClick: async () => { if (snap) await db.notes.add(snap); } });
  }
  const open = (d: string) => { onSelect(d); setMobileOpen(true); };

  return (
    <div className="animate-fade-up">
      <PageHeader title="Daily Notes" subtitle="One note per day — your semester journal" actions={<button onClick={() => open(todayKey())} className="btn-primary"><Plus className="h-4 w-4" /> Today's note</button>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className={cn('lg:col-span-2 space-y-3', mobileOpen && 'hidden lg:block')}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search notes…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {notes === undefined ? <div className="p-4"><ListSkeleton /></div> : filtered.length === 0 ? (
              <EmptyState icon={StickyNote} title={q ? 'No matches' : 'No notes yet'} description={q ? 'Try a different search term.' : 'Notes you write on any day will show up here.'} action={!q && <button onClick={() => open(todayKey())} className="btn-outline"><Plus className="h-4 w-4" /> Write today's note</button>} />
            ) : filtered.map(n => (
              <div key={n.id} className={cn('group flex gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition', n.date === selected && 'bg-brand-50/60 dark:bg-brand-950/30')} onClick={() => open(n.date)}>
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                  <span className="text-[10px] font-semibold uppercase text-amber-600">{format(fromKey(n.date), 'MMM')}</span>
                  <span className="text-lg font-bold leading-none text-slate-900 dark:text-white">{format(fromKey(n.date), 'd')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{format(fromKey(n.date), 'EEEE')}</span>
                    {n.mood && <span>{MOOD_EMOJI[n.mood]}</span>}
                    <span className="ml-auto">{formatDistanceToNow(n.updatedAt, { addSuffix: true })}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{n.content}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(n.id!); }} className="self-center rounded-lg p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className={cn('lg:col-span-3 space-y-3', !mobileOpen && 'hidden lg:block')}>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(false)} className="btn-ghost lg:hidden p-2"><ChevronLeft className="h-5 w-5" /></button>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{fmtDateLong(selected)}</div>
              <input type="date" className="text-xs text-brand-600 bg-transparent" value={selected} onChange={e => e.target.value && onSelect(e.target.value)} />
            </div>
          </div>
          <DayNote date={selected} autoFocus />
        </div>
      </div>
    </div>
  );
}
