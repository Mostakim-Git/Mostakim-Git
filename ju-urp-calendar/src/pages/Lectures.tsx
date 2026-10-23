import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Upload, Search, Trash2, Download, Eye, Tag, Loader2, Share2, FolderOpen } from 'lucide-react';
import { db } from '../lib/db';
import type { Lecture } from '../lib/types';
import { bytes, cn, todayKey } from '../lib/utils';
import { PageHeader, EmptyState, Modal, Field, ListSkeleton } from '../components/ui';
import { PdfViewer } from '../components/PdfViewer';
import { useToast } from '../components/Toast';
import { classNoteFileName, savePdfToDevice, readPdfFromDevice, deletePdfFromDevice, downloadInBrowser, NOTES_FOLDER } from '../lib/files';
import { isNative } from '../lib/notifications';

export function LecturesPage() {
  const lectures = useLiveQuery(() => db.lectures.orderBy('addedAt').reverse().toArray(), []);
  const courses = useLiveQuery(() => db.courses.toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [course, setCourse] = useState('');
  const [viewing, setViewing] = useState<{ l: Lecture; blob: Blob } | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [pending, setPending] = useState<{ file: File; title: string; courseCode: string; tags: string; date: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filtered = useMemo(() => (lectures ?? []).filter(l => (!course || l.courseCode === course) && (!q || `${l.title} ${l.fileName} ${l.tags.join(' ')} ${l.courseCode}`.toLowerCase().includes(q.toLowerCase()))), [lectures, q, course]);
  const totalSize = (lectures ?? []).reduce((s, l) => s + l.size, 0);

  function pick(f?: File | null) {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files are supported', 'error'); return; }
    setPending({ file: f, title: f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '), courseCode: courses[0]?.code ?? '', tags: '', date: todayKey() });
  }
  async function save() {
    if (!pending) return;
    setUploading(true);
    try {
      const blob = new Blob([await pending.file.arrayBuffer()], { type: 'application/pdf' });
      const fileName = await classNoteFileName(new Date(pending.date + 'T00:00:00'), pending.courseCode);
      const saved = await savePdfToDevice(blob, fileName);
      await db.lectures.add({ title: pending.title.trim() || fileName, courseCode: pending.courseCode, fileName, size: blob.size, blob, filePath: saved?.path, fileUri: saved?.uri, addedAt: Date.now(), tags: pending.tags.split(',').map(t => t.trim()).filter(Boolean) });
      toast(saved ? `Saved to Documents/${NOTES_FOLDER}/${fileName}` : 'Class note saved');
      setPending(null);
    } catch (e) { console.error(e); toast('Failed to save file', 'error'); }
    finally { setUploading(false); }
  }
  async function getBlob(l: Lecture): Promise<Blob | null> {
    if (l.blob) return l.blob;
    if (l.filePath) return readPdfFromDevice(l.filePath);
    return null;
  }
  async function open(l: Lecture) {
    setOpening(l.id!);
    const blob = await getBlob(l);
    setOpening(null);
    if (!blob) { toast('File not found — it may have been moved or deleted from your file manager', 'error'); return; }
    setViewing({ l, blob });
  }
  async function remove(l: Lecture, alsoFile: boolean) {
    await db.lectures.delete(l.id!);
    if (alsoFile && l.filePath) await deletePdfFromDevice(l.filePath);
    if (viewing?.l.id === l.id) setViewing(null);
    toast(alsoFile ? 'Class note and file deleted' : 'Removed from list (file kept in Documents)', 'info', alsoFile ? undefined : { label: 'Undo', onClick: async () => { const { id: _id, ...rest } = l; await db.lectures.add(rest as Lecture); } });
  }
  async function exportFile(l: Lecture) {
    const blob = await getBlob(l); if (!blob) return;
    if (isNative) { const saved = await savePdfToDevice(blob, l.fileName); toast(saved ? `Saved to Documents/${NOTES_FOLDER}/${l.fileName}` : 'Saved'); }
    else downloadInBrowser(blob, l.fileName);
  }
  async function share(l: Lecture) {
    try {
      const blob = await getBlob(l); if (!blob) return;
      const f = new File([blob], l.fileName, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: l.title });
      else await exportFile(l);
    } catch { /* cancelled */ }
  }
  const [confirmDel, setConfirmDel] = useState<Lecture | null>(null);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Class Notes (PDF)" subtitle={lectures ? `${lectures.length} files · ${bytes(totalSize)}${isNative ? ` · stored in Internal storage › Documents › ${NOTES_FOLDER}` : ''}` : 'Loading…'} actions={<button onClick={() => fileRef.current?.click()} className="btn-primary"><Upload className="h-4 w-4" /> Add PDF</button>} />
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={cn('mb-5 hidden md:flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-sm transition', drag ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
        <Upload className="h-4 w-4" /> Drag & drop a PDF here, or <button onClick={() => fileRef.current?.click()} className="font-semibold text-brand-600 hover:underline">browse</button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search by title, tag or course…" value={q} onChange={e => setQ(e.target.value)} /></div>
        {courses.length > 0 && <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          <button onClick={() => setCourse('')} className={cn('chip whitespace-nowrap', !course ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}>All</button>
          {courses.map(c => <button key={c.code} onClick={() => setCourse(c.code === course ? '' : c.code)} className={cn('chip whitespace-nowrap', course === c.code ? 'text-white border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')} style={course === c.code ? { background: c.color } : undefined}>{c.code}</button>)}
        </div>}
      </div>

      {lectures === undefined ? <div className="card p-4"><ListSkeleton rows={5} /></div> : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title={q || course ? 'No class notes match' : 'No class notes yet'} description={q || course ? 'Try clearing the filters.' : `Add PDF slides and handouts. Each file is saved as "Class Note <date>.pdf" in your file manager under Documents/${NOTES_FOLDER}, and is viewable offline here.`} action={<button onClick={() => fileRef.current?.click()} className="btn-primary"><Upload className="h-4 w-4" /> Add your first PDF</button>} /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(l => {
            const c = courses.find(x => x.code === l.courseCode);
            return (
              <div key={l.id} className="card group p-4 flex flex-col hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 text-rose-600"><FileText className="h-5 w-5" /><span className="absolute -bottom-1 rounded bg-rose-600 px-1 text-[9px] font-bold text-white">PDF</span></div>
                  <div className="min-w-0 flex-1">
                    {l.courseCode && <div className="text-xs font-semibold" style={{ color: c?.color }}>{l.courseCode}{c ? ` · ${c.title}` : ''}</div>}
                    <button onClick={() => open(l)} className="text-left text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 hover:text-brand-600">{l.title}</button>
                    <div className="text-xs text-slate-500 mt-0.5 truncate" title={l.fileName}><FolderOpen className="inline h-3 w-3 mr-1" />{l.fileName}</div>
                    <div className="text-xs text-slate-400">{bytes(l.size)} · {formatDistanceToNow(l.addedAt, { addSuffix: true })}</div>
                  </div>
                </div>
                {l.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{l.tags.map(t => <span key={t} className="chip border-slate-200 dark:border-slate-700 text-slate-500 py-0.5"><Tag className="h-3 w-3" />{t}</span>)}</div>}
                <div className="mt-3 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button onClick={() => open(l)} className="btn-outline flex-1 py-1.5">{opening === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Open</button>
                  <button onClick={() => share(l)} className="btn-ghost p-2" title="Share"><Share2 className="h-4 w-4" /></button>
                  <button onClick={() => exportFile(l)} className="btn-ghost p-2" title="Save a copy"><Download className="h-4 w-4" /></button>
                  <button onClick={() => setConfirmDel(l)} className="btn-ghost p-2 text-slate-400 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.l.title ?? ''} size="full">
        {viewing && <PdfViewer blob={viewing.blob} />}
      </Modal>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete class note?" footer={<>
        <button onClick={() => setConfirmDel(null)} className="btn-outline">Cancel</button>
        {confirmDel?.filePath && <button onClick={() => { remove(confirmDel!, false); setConfirmDel(null); }} className="btn-outline">Remove from list only</button>}
        <button onClick={() => { remove(confirmDel!, true); setConfirmDel(null); }} className="btn-danger">Delete{confirmDel?.filePath ? ' file too' : ''}</button>
      </>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{confirmDel?.filePath ? <>“{confirmDel.fileName}” is stored in Documents/{NOTES_FOLDER}. You can keep the file and only remove it from CaCa, or delete both.</> : 'This removes the PDF from CaCa.'}</p>
      </Modal>

      <Modal open={!!pending} onClose={() => setPending(null)} title="Add class note"
        footer={<><button onClick={() => setPending(null)} className="btn-outline">Cancel</button><button onClick={save} disabled={uploading} className="btn-primary">{uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save'}</button></>}>
        {pending && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm"><FileText className="h-5 w-5 text-rose-500" /><span className="truncate flex-1">{pending.file.name}</span><span className="text-slate-500">{bytes(pending.file.size)}</span></div>
            <Field label="Title"><input className="input" value={pending.title} onChange={e => setPending({ ...pending, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class date" hint="Used in the file name"><input type="date" className="input" value={pending.date} onChange={e => setPending({ ...pending, date: e.target.value })} /></Field>
              <Field label="Course"><select className="input" value={pending.courseCode} onChange={e => setPending({ ...pending, courseCode: e.target.value })}><option value="">— none —</option>{courses.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></Field>
            </div>
            <Field label="Tags" hint="Comma separated, e.g. midterm, chapter 3"><input className="input" value={pending.tags} onChange={e => setPending({ ...pending, tags: e.target.value })} /></Field>
            <div className="rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900 p-3 text-xs text-brand-800 dark:text-brand-200 flex gap-2"><FolderOpen className="h-4 w-4 shrink-0" /><span>Will be saved as <b>Class Note {pending.date}{pending.courseCode ? ` ${pending.courseCode}` : ''}.pdf</b> in Internal storage › Documents › {NOTES_FOLDER}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
