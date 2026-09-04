import { format, parseISO, isSameDay, differenceInMinutes } from 'date-fns';
import type { EventType } from './types';

export const todayKey = () => format(new Date(), 'yyyy-MM-dd');
export const toKey = (d: Date) => format(d, 'yyyy-MM-dd');
export const fromKey = (k: string) => parseISO(k);

export function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function fmtDateLong(k: string) {
  return format(fromKey(k), 'EEEE, d MMMM yyyy');
}

export function minutesOf(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function durationLabel(start: string, end: string) {
  const d = minutesOf(end) - minutesOf(start);
  if (d <= 0) return '';
  const h = Math.floor(d / 60), m = d % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

export function isToday(k: string) {
  return isSameDay(fromKey(k), new Date());
}

export function minutesUntil(date: string, time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = fromKey(date); d.setHours(h, m, 0, 0);
  return differenceInMinutes(d, new Date());
}

export const eventTypeMeta: Record<EventType, { label: string; color: string; bg: string; dot: string }> = {
  class:      { label: 'Class',        color: 'text-brand-700 dark:text-brand-300',     bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/40 dark:border-brand-800',     dot: 'bg-brand-500' },
  lab:        { label: 'Lab / Studio', color: 'text-violet-700 dark:text-violet-300',   bg: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800', dot: 'bg-violet-500' },
  exam:       { label: 'Exam',         color: 'text-rose-700 dark:text-rose-300',       bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800',         dot: 'bg-rose-500' },
  assignment: { label: 'Assignment',   color: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',     dot: 'bg-amber-500' },
  holiday:    { label: 'Holiday',      color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800', dot: 'bg-emerald-500' },
  seminar:    { label: 'Seminar',      color: 'text-cyan-700 dark:text-cyan-300',       bg: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-800',         dot: 'bg-cyan-500' },
  fieldwork:  { label: 'Field Work',   color: 'text-lime-700 dark:text-lime-300',       bg: 'bg-lime-50 border-lime-200 dark:bg-lime-950/40 dark:border-lime-800',         dot: 'bg-lime-600' },
  personal:   { label: 'Personal',     color: 'text-slate-700 dark:text-slate-300',     bg: 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700',       dot: 'bg-slate-500' },
};

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
