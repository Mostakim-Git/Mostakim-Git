import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { GraduationCap } from 'lucide-react';
import { db } from './lib/db';
import { seedIfNeeded } from './data/seed';
import { todayKey } from './lib/utils';
import { initNotifications, isNative, rescheduleAll } from './lib/notifications';
import { startWidgetSync } from './lib/widget';
import { Layout, type Route } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AlarmRinger } from './components/AlarmRinger';
import { Dashboard } from './pages/Dashboard';
import { CalendarPage } from './pages/Calendar';
import { SchedulePage } from './pages/Schedule';
import { NotesPage } from './pages/Notes';
import { LecturesPage } from './pages/Lectures';
import { AlarmsPage } from './pages/Alarms';
import { WidgetsPage } from './pages/Widgets';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';

const ROUTES: Route[] = ['dashboard', 'calendar', 'schedule', 'notes', 'lectures', 'alarms', 'widgets', 'profile', 'settings'];
function routeFromHash(): Route { const h = location.hash.replace('#/', '') as Route; return ROUTES.includes(h) ? h : 'dashboard'; }

export default function App() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const settings = useLiveQuery(() => db.settings.get(1));

  useEffect(() => {
    (async () => {
      try { await seedIfNeeded(); } catch (e) { console.error('seed failed', e); }
      await initNotifications();
      setReady(true);
      const stop = startWidgetSync();
      if (isNative) {
        rescheduleAll();
        LocalNotifications.addListener('localNotificationActionPerformed', (n) => {
          if (n.notification.extra?.alarmId) navigate('alarms'); else navigate('schedule');
        });
        CapApp.addListener('appUrlOpen', ({ url }) => { const r = url.split('://')[1]?.split(/[/?#]/)[0] as Route; if (ROUTES.includes(r)) navigate(r); });
        CapApp.addListener('backButton', ({ canGoBack }) => {
          if (document.querySelector('[data-modal-open]')) return;
          if (routeFromHash() !== 'dashboard') navigate('dashboard'); else if (!canGoBack) CapApp.exitApp();
        });
      }
      return () => stop();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const dark = settings?.theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0f172a' : '#3b63f6');
  }, [settings?.theme]);

  const navigate = useCallback((r: Route) => { location.hash = `/${r}`; setRoute(r); window.scrollTo(0, 0); }, []);
  const openDay = useCallback((d: string) => { setSelectedDay(d); navigate('notes'); }, [navigate]);

  if (!ready) return <Splash />;

  return (
    <ToastProvider>
      <Layout route={route} onNavigate={navigate}>
        {route === 'dashboard' && <Dashboard onNavigate={navigate} onOpenDay={openDay} />}
        {route === 'calendar' && <CalendarPage selected={selectedDay} onSelect={setSelectedDay} />}
        {route === 'schedule' && <SchedulePage selected={selectedDay} onSelect={setSelectedDay} />}
        {route === 'notes' && <NotesPage selected={selectedDay} onSelect={setSelectedDay} />}
        {route === 'lectures' && <LecturesPage />}
        {route === 'alarms' && <AlarmsPage />}
        {route === 'widgets' && <WidgetsPage />}
        {route === 'profile' && <ProfilePage />}
        {route === 'settings' && <SettingsPage />}
      </Layout>
      <AlarmRinger />
    </ToastProvider>
  );
}

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-indigo-800 text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur ring-1 ring-white/20 shadow-xl animate-pulse"><GraduationCap className="h-10 w-10" /></div>
      <h1 className="mt-6 text-xl font-bold">JU URP Calendar</h1>
      <p className="mt-1 text-sm text-brand-100">Preparing your semester…</p>
      <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/20"><div className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-white" /></div>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
