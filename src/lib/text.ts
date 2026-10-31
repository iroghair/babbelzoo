// Comparing typed answers: normalising, optional words, typo tolerance and spelling feedback
// (PLAN.md 3.3). Based on TopoChamp's text.ts.

const SPECIAL_LETTERS: Record<string, string> = { ł: 'l', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', đ: 'd', ı: 'i', þ: 'th' };

/** Lowercase, without accents, spaces, hyphens, apostrophes or other punctuation. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[łøæœßđıþ]/g, (c) => SPECIAL_LETTERS[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Lowercase with collapsed whitespace; accents and punctuation still count. */
export function strictForm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[’‘`]/g, "'");
}

/** Edit distance where swapping two neighbouring letters counts as one typo. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Typos allowed in lenient mode: none for 1–3 letters, 1 for 4–7, 2 for 8 or more. */
export function allowedTypos(word: string): number {
  const n = normalize(word).length;
  return n <= 3 ? 0 : n <= 7 ? 1 : 2;
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Expands optional parts in round brackets: "(to) walk" → ["to walk", "walk"].
 * At most 3 bracket groups are expanded; the first result keeps every part.
 */
export function expandOptional(text: string): string[] {
  const groups = text.match(/\([^()]*\)/g) ?? [];
  if (!groups.length) return [collapse(text)];
  const used = groups.slice(0, 3);
  const out = new Set<string>();
  for (let mask = 0; mask < 1 << used.length; mask++) {
    let s = text;
    used.forEach((g, i) => {
      s = s.replace(g, mask & (1 << i) ? ' ' : g.slice(1, -1));
    });
    s = collapse(s.replace(/[()]/g, ''));
    if (s) out.add(s);
  }
  return [...out];
}

/** The word without optional brackets: "(to) walk" → "walk". Used for hints. */
export function coreText(text: string): string {
  const forms = expandOptional(text);
  return forms[forms.length - 1] ?? text;
}

/** Words at the start of an answer that may be left out. English "to/the/a/an" always. */
const LEADING: Record<string, string[]> = {
  en: ['to', 'the', 'a', 'an'],
  nl: ['de', 'het', 'een', "'t"],
  de: ['der', 'die', 'das', 'ein', 'eine', 'zu'],
  fr: ['le', 'la', 'les', 'un', 'une', "l'"],
  es: ['el', 'la', 'los', 'las', 'un', 'una'],
};

export type Spelling = 'lenient' | 'strict';
export type Articles = 'optional' | 'required';

export interface MatchOptions {
  /** Language of the answer side. */
  lang: string;
  spelling: Spelling;
  /** Whether articles (de/het, der/die/das, …) must be typed. English "to/the/a" never has to. */
  articles: Articles;
}

/** Removes one optional leading word, keeping the original case of the rest. */
export function stripLeading(s: string, lang: string, articles: Articles): string {
  if (lang !== 'en' && articles === 'required') return s.trim();
  const t = s.trim();
  for (const w of LEADING[lang] ?? []) {
    const re = w.endsWith("'") ? new RegExp(`^${w.slice(0, -1)}['’]\\s*`, 'i') : new RegExp(`^${w}\\s+`, 'i');
    const m = t.match(re);
    if (m && t.length > m[0].length) return t.slice(m[0].length).trim();
  }
  return t;
}

/** All accepted written forms of one answer, with optional parts and leading words left out. */
function formsOf(raw: string, opts: MatchOptions): string[] {
  const out = new Set<string>();
  for (const v of expandOptional(raw)) {
    out.add(v);
    out.add(stripLeading(v, opts.lang, opts.articles));
  }
  return [...out];
}

/** What was typed, also without an optional leading word (always stripped from the typed side). */
function typedForms(answer: string, lang: string): string[] {
  const t = collapse(answer);
  return [...new Set([t, stripLeading(t, lang, 'optional')])];
}

export type MatchResult =
  | { kind: 'exact'; name: string }
  | { kind: 'typo'; name: string; form: string; typos: number }
  | { kind: 'wrong'; other?: string };

/**
 * Compares a typed answer with the accepted answers (each may contain "(optional)" parts).
 * `others` are the answers of the *other* words in the list: typing one of those exactly is
 * wrong, even when it is within the typo limit ("horse" is not a typo of "house").
 */
export function matchAnswer(answer: string, accepted: string[], opts: MatchOptions, others: string[] = []): MatchResult {
  if (!normalize(answer)) return { kind: 'wrong' };
  const typed = typedForms(answer, opts.lang);
  const key = opts.spelling === 'strict' ? strictForm : normalize;
  const typedKeys = new Set(typed.map(key));

  for (const name of accepted) {
    if (formsOf(name, opts).some((f) => typedKeys.has(key(f)))) return { kind: 'exact', name };
  }

  // Typo guard: exactly another word from the list.
  const typedNorm = new Set(typed.map(normalize));
  for (const other of others) {
    if (formsOf(other, { ...opts, articles: 'optional' }).some((f) => typedNorm.has(normalize(f)))) {
      return { kind: 'wrong', other };
    }
  }

  if (opts.spelling === 'strict') return { kind: 'wrong' };

  let best: { name: string; form: string; typos: number } | null = null;
  for (const name of accepted) {
    for (const form of formsOf(name, opts)) {
      const target = normalize(form);
      const limit = allowedTypos(form);
      for (const t of typedNorm) {
        const typos = levenshtein(t, target);
        if (typos <= limit && (!best || typos < best.typos)) best = { name, form, typos };
      }
    }
  }
  return best ? { kind: 'typo', ...best } : { kind: 'wrong' };
}

export interface DiffPart {
  text: string;
  /**
   * 'ok' = same letter, 'wrong' = typed but should be different or absent, 'missing' = should
   * have been typed, 'swap' = two neighbouring letters typed the wrong way round (shown correctly).
   */
  kind: 'ok' | 'wrong' | 'missing' | 'swap';
}

/**
 * Letter-by-letter comparison of what was typed against the correct spelling, so the
 * game can highlight the mistakes. Case and accents are compared loosely.
 */
export function spellingDiff(typed: string, correct: string): DiffPart[] {
  const fold = (c: string) => normalize(c) || c.toLowerCase();
  const a = [...typed.trim()];
  const b = [...correct];
  const swapped = (i: number, j: number) =>
    i > 1 && j > 1 && fold(a[i - 1]) === fold(b[j - 2]) && fold(a[i - 2]) === fold(b[j - 1]) && fold(a[i - 1]) !== fold(a[i - 2]);
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (fold(a[i - 1]) === fold(b[j - 1]) ? 0 : 1));
      if (swapped(i, j)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  const parts: DiffPart[] = [];
  const push = (text: string, kind: DiffPart['kind']) => {
    const last = parts[parts.length - 1];
    if (last?.kind === kind) last.text = text + last.text;
    else parts.push({ text, kind });
  };
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (swapped(i, j) && d[i][j] === d[i - 2][j - 2] + 1) {
      push(b[j - 2] + b[j - 1], 'swap');
      i -= 2;
      j -= 2;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (fold(a[i - 1]) === fold(b[j - 1]) ? 0 : 1)) {
      if (fold(a[i - 1]) === fold(b[j - 1])) push(b[j - 1], 'ok');
      else {
        push(b[j - 1], 'missing');
        push(a[i - 1], 'wrong');
      }
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      push(a[i - 1], 'wrong');
      i--;
    } else {
      push(b[j - 1], 'missing');
      j--;
    }
  }
  return parts.reverse();
}
