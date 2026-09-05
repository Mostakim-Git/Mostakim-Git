import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertTriangle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export function PdfViewer({ blob }: { blob: Blob }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const renderTask = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading'); setDoc(null); setPage(1);
    blob.arrayBuffer().then(buf => pdfjs.getDocument({ data: buf }).promise).then(d => { if (!cancelled) { setDoc(d); setStatus('ready'); } }).catch(e => { console.error(e); if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [blob]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(page);
      const width = (wrapRef.current?.clientWidth ?? 600) - 16;
      const base = p.getViewport({ scale: 1 });
      const fit = width / base.width;
      const viewport = p.getViewport({ scale: fit * scale * (window.devicePixelRatio || 1) });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width; canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;
      renderTask.current?.cancel();
      const task = p.render({ canvasContext: ctx, viewport });
      renderTask.current = task;
      try { await task.promise; } catch { /* cancelled */ }
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [doc, page, scale]);

  if (status === 'error') return <div className="flex flex-col items-center justify-center py-16 text-slate-500"><AlertTriangle className="h-8 w-8 text-amber-500 mb-2" /> Could not render this PDF.</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="inline-flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-outline p-2"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-slate-600 dark:text-slate-300 w-24 text-center">{doc ? `${page} / ${doc.numPages}` : '…'}</span>
          <button onClick={() => setPage(p => Math.min(doc?.numPages ?? 1, p + 1))} disabled={!doc || page >= doc.numPages} className="btn-outline p-2"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="inline-flex items-center gap-1">
          <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))} className="btn-outline p-2"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-sm w-12 text-center text-slate-600 dark:text-slate-300">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, +(s + 0.25).toFixed(2)))} className="btn-outline p-2"><ZoomIn className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={wrapRef} className="relative flex-1 min-h-[50vh] overflow-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-2 scrollbar-thin">
        {status === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        <canvas ref={canvasRef} className="mx-auto block rounded shadow-md bg-white" />
      </div>
    </div>
  );
}
