import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { format } from 'date-fns';

export const NOTES_FOLDER = 'CaCa';
const isNative = Capacitor.isNativePlatform();

function blobToBase64(b: Blob) {
  return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });
}

/** "Class Note 2026-09-05.pdf" (adds " (2)", " (3)" … when the name is taken). */
export async function classNoteFileName(date = new Date(), suffix = ''): Promise<string> {
  const base = `Class Note ${format(date, 'yyyy-MM-dd')}${suffix ? ' ' + suffix : ''}`;
  if (!isNative) return `${base}.pdf`;
  let name = `${base}.pdf`;
  for (let i = 2; i < 100; i++) {
    try { await Filesystem.stat({ path: `${NOTES_FOLDER}/${name}`, directory: Directory.Documents }); name = `${base} (${i}).pdf`; }
    catch { return name; }
  }
  return name;
}

/** Saves the PDF into Internal storage → Documents/CaCa/. Returns the relative path + a content URI. */
export async function savePdfToDevice(blob: Blob, fileName: string): Promise<{ path: string; uri: string } | null> {
  if (!isNative) return null;
  try { await Filesystem.mkdir({ path: NOTES_FOLDER, directory: Directory.Documents, recursive: true }); } catch { /* exists */ }
  const data = await blobToBase64(blob);
  const r = await Filesystem.writeFile({ path: `${NOTES_FOLDER}/${fileName}`, data, directory: Directory.Documents, recursive: true });
  return { path: `${NOTES_FOLDER}/${fileName}`, uri: r.uri };
}

export async function readPdfFromDevice(path: string): Promise<Blob | null> {
  if (!isNative) return null;
  try {
    const r = await Filesystem.readFile({ path, directory: Directory.Documents });
    const bin = atob(r.data as string); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: 'application/pdf' });
  } catch { return null; }
}

export async function deletePdfFromDevice(path: string) {
  if (!isNative) return;
  try { await Filesystem.deleteFile({ path, directory: Directory.Documents }); } catch { /* ignore */ }
}

export function downloadInBrowser(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
