import { MapPin, Clock } from 'lucide-react';
import type { CalEvent } from '../lib/types';
import { cn, eventTypeMeta, fmtTime, durationLabel } from '../lib/utils';

export function EventCard({ ev, onClick, compact, now }: { ev: CalEvent; onClick?: () => void; compact?: boolean; now?: boolean }) {
  const m = eventTypeMeta[ev.type];
  return (
    <button onClick={onClick} className={cn('group w-full text-left rounded-xl border p-3 transition hover:shadow-card', m.bg, now && 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950')}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-0.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', m.dot)} />
          {!compact && <span className="mt-1 w-px flex-1 bg-current opacity-10" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('text-[11px] font-semibold uppercase tracking-wide', m.color)}>{m.label}{ev.courseCode ? ` · ${ev.courseCode}` : ''}</span>
            {now && <span className="chip bg-brand-600 text-white border-brand-600 text-[10px] py-0.5">Now</span>}
          </div>
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{ev.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{ev.allDay ? 'All day' : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`}{!ev.allDay && durationLabel(ev.start, ev.end) && <span className="opacity-60">· {durationLabel(ev.start, ev.end)}</span>}</span>
            {ev.location && <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5" />{ev.location}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
