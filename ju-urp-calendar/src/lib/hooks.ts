import { useEffect, useState } from 'react';

export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [intervalMs]);
  return now;
}

export function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  const [timer, setTimer] = useState<number | null>(null);
  return (...args: T) => {
    if (timer) window.clearTimeout(timer);
    setTimer(window.setTimeout(() => fn(...args), ms));
  };
}
