import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Upload, Search, Trash2, Download, Eye, Tag, Loader2, Share2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { db } from '../lib/db';
import type { Lecture } from '../lib/types';
import { bytes, cn } from '../lib/utils';
import { PageHeader, EmptyState, Modal, Field, ListSkeleton } from '../components/ui';
import { PdfViewer } from '../components/PdfViewer';
import { useToast } from '../components/Toast';

export function LecturesPage() {
  const lectures = useLiveQuery(() => db.lectures.orderBy('addedAt').reverse().toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [course, setCourse] = useState('');
  const [viewing, setViewing] = useState<Lecture | null>(null);
  const [pending, setPending] = useState<{ file: File; title: string; courseCode: string; tags: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filtered = useMemo(() => (lectures ?? []).filter(l => (!course || l.courseCode === course) && (!q || `${l.title} ${l.fileName} ${l.tags.join(' ')} ${l.courseCode}`.toLowerCase().includes(q.toLowerCase()))), [lectures, q, course]);
  const totalSize = (lectures ?? []).reduce((s, l) => s + l.size, 0);

  function pick(f?: File | null) {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files are supported', 'error'); return; }
    setPending({ file: f, title: f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '), courseCode: courses[0]?.code ?? '', tags: '' });
  }
  async function save() {
    if (!pending) return;
    setUploading(true);
    try {
      const blob = new Blob([await pending.file.arrayBuffer()], { type: 'application/pdf' });
      await db.lectures.add({ title: pending.title.trim() || pending.file.name, courseCode: pending.courseCode, fileName: pending.file.name, size: blob.size, blob, addedAt: Date.now(), tags: pending.tags.split(',').map(t => t.trim()).filter(Boolean) });
      toast('Lecture saved offline');
      setPending(null);
    } catch (e) { console.error(e); toast('Failed to save file', 'error'); }
    finally { setUploading(false); }
  }
  async function remove(l: Lecture) {
    await db.lectures.delete(l.id!);
    if (viewing?.id === l.id) setViewing(null);
    toast('Lecture removed', 'info', { label: 'Undo', onClick: async () => { const { id: _id, ...rest } = l; await db.lectures.add(rest as Lecture); } });
  }
  async function exportFile(l: Lecture) {
    try {
      if (Capacitor.isNativePlatform()) {
        const b64 = await blobToBase64(l.blob);
        await Filesystem.writeFile({ path: l.fileName, data: b64, directory: Directory.Documents, recursive: true });
        toast(`Saved to Documents/${l.fileName}`);
      } else {
        const url = URL.createObjectURL(l.blob); const a = document.createElement('a'); a.href = url; a.download = l.fileName; a.click(); URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); toast('Export failed', 'error'); }
  }
  async function share(l: Lecture) {
    try {
      const f = new File([l.blob], l.fileName, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: l.title });
      else await exportFile(l);
    } catch { /* cancelled */ }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Lecture PDFs" subtitle={lectures ? `${lectures.length} files · ${bytes(totalSize)} stored offline` : 'Loading…'} actions={<button onClick={() => fileRef.current?.click()} className="btn-primary"><Upload className="h-4 w-4" /> Add PDF</button>} />
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={cn('mb-5 hidden md:flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-sm transition', drag ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
        <Upload className="h-4 w-4" /> Drag & drop a PDF here, or <button onClick={() => fileRef.current?.click()} className="font-semibold text-brand-600 hover:underline">browse</button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search by title, tag or course…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          <button onClick={() => setCourse('')} className={cn('chip whitespace-nowrap', !course ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}>All</button>
          {courses.map(c => <button key={c.code} onClick={() => setCourse(c.code === course ? '' : c.code)} className={cn('chip whitespace-nowrap', course === c.code ? 'text-white border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')} style={course === c.code ? { background: c.color } : undefined}>{c.code}</button>)}
        </div>
      </div>

      {lectures === undefined ? <div className="card p-4"><ListSkeleton rows={5} /></div> : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title={q || course ? 'No lectures match' : 'No lecture files yet'} description={q || course ? 'Try clearing the filters.' : 'Add PDF slides and handouts so they are always available offline — even in the exam hall corridor.'} action={<button onClick={() => fileRef.current?.click()} className="btn-primary"><Upload className="h-4 w-4" /> Add your first PDF</button>} /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(l => {
            const c = courses.find(x => x.code === l.courseCode);
            return (
              <div key={l.id} className="card group p-4 flex flex-col hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 text-rose-600"><FileText className="h-5 w-5" /><span className="absolute -bottom-1 rounded bg-rose-600 px-1 text-[9px] font-bold text-white">PDF</span></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold" style={{ color: c?.color }}>{l.courseCode}{c ? ` · ${c.title}` : ''}</div>
                    <button onClick={() => setViewing(l)} className="text-left text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 hover:text-brand-600">{l.title}</button>
                    <div className="text-xs text-slate-500 mt-0.5">{bytes(l.size)}{l.pages ? ` · ${l.pages} pages` : ''} · {formatDistanceToNow(l.addedAt, { addSuffix: true })}</div>
                  </div>
                </div>
                {l.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{l.tags.map(t => <span key={t} className="chip border-slate-200 dark:border-slate-700 text-slate-500 py-0.5"><Tag className="h-3 w-3" />{t}</span>)}</div>}
                <div className="mt-3 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button onClick={() => setViewing(l)} className="btn-outline flex-1 py-1.5"><Eye className="h-4 w-4" /> Open</button>
                  <button onClick={() => share(l)} className="btn-ghost p-2" title="Share"><Share2 className="h-4 w-4" /></button>
                  <button onClick={() => exportFile(l)} className="btn-ghost p-2" title="Save to device"><Download className="h-4 w-4" /></button>
                  <button onClick={() => remove(l)} className="btn-ghost p-2 text-slate-400 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ''} size="full">
        {viewing && <PdfViewer blob={viewing.blob} />}
      </Modal>

      <Modal open={!!pending} onClose={() => setPending(null)} title="Add lecture PDF"
        footer={<><button onClick={() => setPending(null)} className="btn-outline">Cancel</button><button onClick={save} disabled={uploading} className="btn-primary">{uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save offline'}</button></>}>
        {pending && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm"><FileText className="h-5 w-5 text-rose-500" /><span className="truncate flex-1">{pending.file.name}</span><span className="text-slate-500">{bytes(pending.file.size)}</span></div>
            <Field label="Title"><input className="input" value={pending.title} onChange={e => setPending({ ...pending, title: e.target.value })} /></Field>
            <Field label="Course"><select className="input" value={pending.courseCode} onChange={e => setPending({ ...pending, courseCode: e.target.value })}>{courses.map(c => <option key={c.code} value={c.code}>{c.code} · {c.title}</option>)}<option value="">Other</option></select></Field>
            <Field label="Tags" hint="Comma separated, e.g. midterm, chapter 3"><input className="input" value={pending.tags} onChange={e => setPending({ ...pending, tags: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function blobToBase64(b: Blob) {
  return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });
}
