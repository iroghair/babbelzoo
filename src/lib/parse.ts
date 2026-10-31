// Reading pasted word lists and CSV files (PLAN.md 2.2).
import { newId } from './storage';
import { normalize } from './text';
import type { Entry, Side, WordLang } from './types';

export type WarningKind = 'unreadable' | 'duplicate' | 'shared';

export interface ParseWarning {
  /** 1-based line number in the pasted text. */
  line: number;
  text: string;
  kind: WarningKind;
}

export interface ParseResult {
  entries: Entry[];
  warnings: ParseWarning[];
  /** Set when the first line names the two languages ("English = Nederlands"). */
  langs?: [WordLang, WordLang];
}

const LANG_NAMES: Record<WordLang, string[]> = {
  en: ['english', 'engels', 'en', 'eng'],
  nl: ['dutch', 'nederlands', 'nl', 'ned'],
  de: ['german', 'duits', 'deutsch', 'de'],
  fr: ['french', 'frans', 'francais', 'fr'],
  es: ['spanish', 'spaans', 'espanol', 'es'],
};

export function langFromName(name: string): WordLang | null {
  const n = normalize(name);
  for (const [lang, names] of Object.entries(LANG_NAMES) as [WordLang, string[]][]) {
    if (names.includes(n)) return lang;
  }
  return null;
}

/** "big / large [size]" → { text: 'big', alts: ['large'], hint: 'size' }. */
export function parseSide(raw: string): Side | null {
  let hint: string | undefined;
  const withoutHint = raw.replace(/\[([^\]]*)\]/g, (_, h: string) => {
    if (h.trim()) hint = h.trim();
    return ' ';
  });
  const parts = withoutHint
    .split('/')
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return hint ? { text: parts[0], alts: parts.slice(1), hint } : { text: parts[0], alts: parts.slice(1) };
}

/** The reverse of parseSide, used for sharing and editing. */
export function serializeSide(side: Side): string {
  return [side.text, ...side.alts].join(' / ') + (side.hint ? ` [${side.hint}]` : '');
}

/** Splits a line into its two sides; the separator is detected per line. */
export function splitLine(line: string): [string, string] | null {
  if (line.includes('\t')) {
    const cells = line
      .split('\t')
      .map((c) => c.trim())
      .filter(Boolean);
    return cells.length >= 2 ? [cells[0], cells[1]] : null;
  }
  for (const sep of ['=', ' – ', ' — ', ' - ', ';', '|']) {
    const i = line.indexOf(sep);
    if (i > 0) {
      const a = line.slice(0, i).trim();
      const b = line.slice(i + sep.length).trim();
      if (a && b) return [a, b];
    }
  }
  // Last resort: exactly one comma ("house, huis").
  const commas = line.split(',');
  if (commas.length === 2 && commas[0].trim() && commas[1].trim()) return [commas[0].trim(), commas[1].trim()];
  return null;
}

/** Removes list numbering and bullets that are often copied from a Word document. */
function cleanLine(line: string): string {
  return line
    .replace(/^\s*(\d{1,3}[.)]|[-•*·▪●])\s+/, '')
    .replace(/ /g, ' ')
    .trim();
}

const sideKey = (s: Side) => normalize(s.text);

export function parseList(text: string): ParseResult {
  const result: ParseResult = { entries: [], warnings: [] };
  const seen = new Map<string, number>();
  const aKeys = new Map<string, Entry>();
  const bKeys = new Map<string, Entry>();
  const lines = text.split(/\r?\n/);

  let first = true;
  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const line = cleanLine(rawLine);
    if (!line || line.startsWith('#')) return;
    const split = splitLine(line);
    const a = split && parseSide(split[0]);
    const b = split && parseSide(split[1]);

    if (first) {
      first = false;
      const la = split && langFromName(split[0]);
      const lb = split && langFromName(split[1]);
      if (la && lb && la !== lb) {
        result.langs = [la, lb];
        return;
      }
    }

    if (!a || !b) {
      result.warnings.push({ line: lineNo, text: rawLine.trim(), kind: 'unreadable' });
      return;
    }
    const pairKey = `${sideKey(a)}=${sideKey(b)}`;
    if (seen.has(pairKey)) {
      result.warnings.push({ line: lineNo, text: rawLine.trim(), kind: 'duplicate' });
      return;
    }
    seen.set(pairKey, lineNo);
    const entry: Entry = { id: newId(), a, b };
    if (aKeys.has(sideKey(a)) || bKeys.has(sideKey(b))) {
      result.warnings.push({ line: lineNo, text: rawLine.trim(), kind: 'shared' });
    }
    aKeys.set(sideKey(a), entry);
    bKeys.set(sideKey(b), entry);
    result.entries.push(entry);
  });
  return result;
}

/** The list as text, one "a = b" line per entry (for editing and the .txt export). */
export function listToText(entries: Entry[]): string {
  return entries.map((e) => `${serializeSide(e.a)} = ${serializeSide(e.b)}`).join('\n');
}

/* ───── CSV ───── */

/** Reads CSV with "," or ";" (Dutch Excel) as separator and "quoted" fields. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** CSV rows → the tab format parseList understands. */
export function csvToText(text: string): string {
  return parseCsv(text)
    .map((r) => r.map((c) => c.replace(/[\t\n]/g, ' ').trim()).join('\t'))
    .join('\n');
}

export function listToCsv(entries: Entry[], header: [string, string]): string {
  const q = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return [header, ...entries.map((e) => [serializeSide(e.a), serializeSide(e.b)])].map((r) => r.map(q).join(',')).join('\n');
}
