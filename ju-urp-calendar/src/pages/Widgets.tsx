import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { LayoutGrid, RefreshCw, Smartphone, AlarmClock, StickyNote, CalendarClock, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/db';
import { buildSnapshot, syncWidgets, type WidgetSnapshot } from '../lib/widget';
import { PageHeader, Skeleton } from '../components/ui';
import { useToast } from '../components/Toast';
import { isNative } from '../lib/notifications';
import { cn, eventTypeMeta } from '../lib/utils';

export function WidgetsPage() {
  const [snap, setSnap] = useState<WidgetSnapshot | null>(null);
  const tick = useLiveQuery(async () => (await db.events.count()) + (await db.notes.count()) + (await db.alarms.count()), []);
  const { toast } = useToast();
  useEffect(() => { buildSnapshot().then(setSnap); }, [tick]);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Home-screen widgets" subtitle="Live previews of the Android widgets shipped with this app" actions={<button onClick={async () => { await syncWidgets(); toast('Widgets refreshed'); }} className="btn-outline"><RefreshCw className="h-4 w-4" /> Refresh</button>} />

      <div className={cn('mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm', isNative ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200')}>
        <Smartphone className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          {isNative ? <><b>How to add:</b> long-press your Android home screen → <b>Widgets</b> → find <b>JU URP Calendar</b> → drag <i>Today's Classes</i>, <i>Daily Note</i> or <i>Next Alarm</i> onto the screen. They update automatically whenever you change anything in the app.</>
            : <>You are viewing the web preview. On Android, these three widgets are available from the launcher's widget picker and are populated from the same offline data.</>}
        </div>
      </div>

      <div className="rounded-3xl bg-[radial-gradient(ellipse_at_top,_#1e293b,_#0f172a)] p-6 md:p-10">
        <div className="text-center text-white/60 text-xs mb-6 tracking-widest uppercase">Android home screen preview</div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 items-start">
          {/* Today widget 4x3 */}
          <Widget title="Today's Classes" icon={CalendarClock} size="4 × 3">
            {!snap ? <Skeleton className="h-32 w-full bg-white/10" /> : (
              <>
                <div className="flex items-baseline justify-between mb-2"><span className="text-white font-bold">{format(new Date(), 'EEE, d MMM')}</span><span className="text-[11px] text-white/60">{snap.events.length} events</span></div>
                {snap.events.length === 0 ? <div className="py-6 text-center text-white/60 text-sm">Free day 🎉</div> : (
                  <div className="space-y-1.5">{snap.events.slice(0, 4).map((e, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                      <span className={cn('h-6 w-1 rounded-full', eventTypeMeta[e.type as keyof typeof eventTypeMeta]?.dot ?? 'bg-white')} />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm text-white font-medium">{e.title}</div><div className="text-[11px] text-white/60 truncate">{e.startLabel} · {e.location || e.courseCode}</div></div>
                    </div>))}
                    {snap.events.length > 4 && <div className="text-[11px] text-white/50 text-center">+{snap.events.length - 4} more</div>}
                  </div>
                )}
              </>
            )}
          </Widget>
          {/* Note widget 3x2 */}
          <Widget title="Daily Note" icon={StickyNote} size="3 × 2" tint="from-amber-400/30 to-amber-600/20">
            {!snap ? <Skeleton className="h-24 w-full bg-white/10" /> : snap.note ? <p className="text-sm text-white/90 whitespace-pre-line line-clamp-5 leading-snug">{snap.note}</p> : <div className="py-4 text-center text-white/60 text-sm">Tap to write today's note</div>}
          </Widget>
          {/* Alarm widget 2x2 */}
          <Widget title="Next Alarm" icon={AlarmClock} size="2 × 2" tint="from-brand-400/30 to-brand-700/20">
            {!snap ? <Skeleton className="h-16 w-full bg-white/10" /> : snap.nextAlarm ? (
              <div className="text-center py-2"><div className="text-3xl font-bold text-white">{snap.nextAlarm.split(' · ')[0]}</div><div className="text-xs text-white/70 mt-1 truncate">{snap.nextAlarm.split(' · ')[1]}</div></div>
            ) : <div className="py-4 text-center text-white/60 text-sm">No alarm set</div>}
            {snap && snap.deadlines.length > 0 && <div className="mt-3 border-t border-white/10 pt-2 text-[11px] text-white/70"><span className="uppercase tracking-wide text-white/50">Next deadline</span><div className="truncate text-white">{snap.deadlines[0].title}</div><div>{format(new Date(snap.deadlines[0].date + 'T00:00:00'), 'd MMM')}</div></div>}
          </Widget>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
        {['Updates instantly when you edit events, notes or alarms', 'Zero network use — reads the same on-device database', 'Tapping a widget opens the matching page in the app'].map(t => <div key={t} className="card p-4 flex gap-2 text-slate-600 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{t}</div>)}
      </div>
      <p className="mt-4 text-xs text-slate-400 flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Widgets are implemented natively (AppWidgetProvider) in <code>android/app/src/main/java/.../widgets</code>.</p>
    </div>
  );
}

function Widget({ title, icon: Icon, size, tint = 'from-white/10 to-white/5', children }: { title: string; icon: typeof AlarmClock; size: string; tint?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-3xl border border-white/10 bg-gradient-to-br p-4 shadow-2xl backdrop-blur', tint)}>
      <div className="flex items-center justify-between mb-3"><span className="flex items-center gap-1.5 text-xs font-semibold text-white/80"><Icon className="h-3.5 w-3.5" /> {title}</span><span className="text-[10px] text-white/40">{size}</span></div>
      {children}
    </div>
  );
}
