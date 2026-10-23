import { type ReactNode } from 'react';
import { LayoutDashboard, CalendarDays, Clock, StickyNote, FileText, AlarmClock, User, Settings, LayoutGrid, BookOpen, Repeat } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { cn } from '../lib/utils';
import { Avatar } from './ui';

export type Route = 'dashboard' | 'calendar' | 'schedule' | 'routine' | 'notes' | 'lectures' | 'courses' | 'alarms' | 'widgets' | 'profile' | 'settings';

export const NAV: { id: Route; label: string; icon: typeof LayoutDashboard; mobile?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, mobile: true },
  { id: 'schedule', label: 'Schedule', icon: Clock, mobile: true },
  { id: 'routine', label: 'Weekly Routine', icon: Repeat },
  { id: 'notes', label: 'Daily Notes', icon: StickyNote, mobile: true },
  { id: 'lectures', label: 'Class Notes (PDF)', icon: FileText },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'alarms', label: 'Alarms', icon: AlarmClock, mobile: true },
  { id: 'widgets', label: 'Widgets', icon: LayoutGrid },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Layout({ route, onNavigate, children }: { route: Route; onNavigate: (r: Route) => void; children: ReactNode }) {
  const profile = useLiveQuery(() => db.profile.get(1));
  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950">
      {/* Sidebar (desktop / tablet) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 dark:border-slate-800">
          <AppLogo size={36} />
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900 dark:text-white">CaCa</div>
            <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{profile?.university || 'Class Calendar'}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {NAV.map(n => (
            <button key={n.id} onClick={() => onNavigate(n.id)} className={cn('nav-item w-full text-left', route === n.id && 'nav-item-active')}>
              <n.icon className="h-[18px] w-[18px]" /> {n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => onNavigate('profile')} className="m-3 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          {profile ? <Avatar name={profile.name} color={profile.avatarColor} size="sm" /> : <div className="skeleton h-8 w-8 rounded-full" />}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{profile?.name ?? '...'}</div>
            <div className="truncate text-xs text-slate-500">{profile ? [profile.department, profile.year].filter(Boolean).join(' · ') : ''}</div>
          </div>
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 pt-[var(--sat)] box-content">
          <div className="flex items-center gap-2">
            <AppLogo size={30} />
            <span className="text-sm font-bold text-slate-900 dark:text-white">CaCa</span>
          </div>
          <button onClick={() => onNavigate('profile')}>{profile ? <Avatar name={profile.name} color={profile.avatarColor} size="sm" /> : <div className="skeleton h-8 w-8 rounded-full" />}</button>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-8 pb-24 md:pb-8">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[var(--sab)]">
          <div className="grid grid-cols-5">
            {NAV.filter(n => n.mobile).map(n => (
              <button key={n.id} onClick={() => onNavigate(n.id)} className={cn('flex flex-col items-center gap-1 py-2 text-[11px] font-medium', route === n.id ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500')}>
                <n.icon className={cn('h-5 w-5', route === n.id && 'scale-110')} />
                {n.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
