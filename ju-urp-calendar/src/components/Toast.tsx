import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from 'lucide-react';
import { cn } from '../lib/utils';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; message: string; action?: { label: string; onClick: () => void } }
interface Ctx { toast: (message: string, kind?: Kind, action?: Toast['action']) => void }

const ToastCtx = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems(x => x.filter(t => t.id !== id)), []);
  const toast = useCallback<Ctx['toast']>((message, kind = 'success', action) => {
    const id = ++seq.current;
    setItems(x => [...x.slice(-3), { id, kind, message, action }]);
    setTimeout(() => dismiss(id), action ? 6000 : 3200);
  }, [dismiss]);
  const value = useMemo(() => ({ toast }), [toast]);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 md:bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map(t => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className={cn('pointer-events-auto animate-fade-up flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur bg-white/95 dark:bg-slate-900/95',
              t.kind === 'success' && 'border-emerald-200 dark:border-emerald-900',
              t.kind === 'error' && 'border-rose-200 dark:border-rose-900',
              t.kind === 'info' && 'border-slate-200 dark:border-slate-700')}>
              <I className={cn('h-5 w-5 shrink-0', t.kind === 'success' && 'text-emerald-500', t.kind === 'error' && 'text-rose-500', t.kind === 'info' && 'text-brand-500')} />
              <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">{t.message}</span>
              {t.action && (
                <button onClick={() => { t.action!.onClick(); dismiss(t.id); }} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  <Undo2 className="h-4 w-4" /> {t.action.label}
                </button>
              )}
              <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
