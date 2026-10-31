// Sharing a list as a link (#list=…) and QR code, without a server (PLAN.md 2.3).
// Based on TopoChamp's backup.ts.
import qrcode from 'qrcode-generator';
import { parseSide, serializeSide } from './parse';
import { newId } from './storage';
import type { Entry, WordLang, WordList } from './types';

export interface SharedList {
  name: string;
  langA: WordLang;
  langB: WordLang;
  entries: Entry[];
}

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** The compact code after "#list=": "z" + deflated JSON, or "j" + plain JSON without CompressionStream. */
export async function encodeList(list: Pick<WordList, 'name' | 'langA' | 'langB' | 'entries'>): Promise<string> {
  const json = new TextEncoder().encode(
    JSON.stringify({ v: 1, n: list.name, a: list.langA, b: list.langB, e: list.entries.map((e) => [serializeSide(e.a), serializeSide(e.b)]) }),
  );
  return typeof CompressionStream === 'function' ? 'z' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw'))) : 'j' + toBase64Url(json);
}

export async function decodeList(code: string): Promise<SharedList | null> {
  const m = code.match(/^([zj])([\w-]+)$/);
  if (!m) return null;
  let bytes: Uint8Array = fromBase64Url(m[2]);
  if (m[1] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  const d = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof d.n !== 'string' || !Array.isArray(d.e)) return null;
  const entries: Entry[] = [];
  for (const pair of d.e) {
    const a = Array.isArray(pair) && typeof pair[0] === 'string' ? parseSide(pair[0]) : null;
    const b = Array.isArray(pair) && typeof pair[1] === 'string' ? parseSide(pair[1]) : null;
    if (a && b) entries.push({ id: newId(), a, b });
  }
  return { name: d.n, langA: d.a ?? 'en', langB: d.b ?? 'nl', entries };
}

export async function shareLink(list: WordList): Promise<string> {
  return `${location.origin}${location.pathname}#list=${await encodeList(list)}`;
}

/** Reads a shared list from the page address (#list=…), if there is one. */
export function sharedListFromHash(hash: string): Promise<SharedList | null> {
  const m = hash.match(/^#list=(.+)$/);
  return m ? decodeList(m[1]) : Promise.resolve(null);
}

/** The link as a QR code (SVG markup). */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'L');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

/** Lets the browser save a text file. */
export function downloadText(filename: string, text: string, type = 'text/plain'): void {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
