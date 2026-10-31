// Building one question: what is asked, which answers count, and the wrong options (PLAN.md 3.2).
import { shuffle, type Rng } from './scheduler';
import { coreText, expandOptional, normalize, stripLeading } from './text';
import type { Dir, Entry, Mode, Side, WordLang, WordList } from './types';

export interface Other {
  /** Another answer from the list. */
  text: string;
  /** What that answer means (its question side). */
  meaning: string;
}

export interface Question {
  entry: Entry;
  dir: Dir;
  mode: Mode;
  /** The word that is asked, alternatives included: "big / large". */
  prompt: string;
  hint?: string;
  qLang: WordLang;
  aLang: WordLang;
  /** The main answer, shown in feedback and revealed by hints: "de keuken". */
  answer: string;
  /** Every answer that counts as right, also from other entries with the same question word. */
  accepted: string[];
  /** Answers of the other words in the list, for the typo guard. */
  others: Other[];
  /** Multiple choice: the options, the right one included. */
  options: string[];
}

export const questionSide = (e: Entry, dir: Dir): Side => (dir === 'ab' ? e.a : e.b);
export const answerSide = (e: Entry, dir: Dir): Side => (dir === 'ab' ? e.b : e.a);
export const sideTexts = (s: Side): string[] => [s.text, ...s.alts];
export const sideLabel = (s: Side): string => sideTexts(s).join(' / ');

const keysOf = (text: string) => [normalize(text), ...expandOptional(text).map(normalize)];

/** How many different answers a direction has: decides whether Choose 4 / Choose 8 is possible. */
export function distinctAnswers(list: WordList, dir: Dir): number {
  return new Set(list.entries.map((e) => normalize(answerSide(e, dir).text))).size;
}

export function modeAvailable(list: WordList, mode: Mode, dirs: Dir[]): boolean {
  if (mode === 'type') return list.entries.length > 0;
  const need = mode === 'choose4' ? 4 : 8;
  return dirs.every((d) => distinctAnswers(list, d) >= need);
}

/** Similarity for "look-alike" wrong options: same first letters, similar length. */
function similarity(a: string, b: string, lang: string): number {
  const x = normalize(stripLeading(coreText(a), lang, 'optional'));
  const y = normalize(stripLeading(coreText(b), lang, 'optional'));
  let prefix = 0;
  while (prefix < x.length && x[prefix] === y[prefix]) prefix++;
  return prefix * 2 - Math.abs(x.length - y.length) * 0.5;
}

export function buildQuestion(list: WordList, entry: Entry, dir: Dir, mode: Mode, rng: Rng = Math.random): Question {
  const qSide = questionSide(entry, dir);
  const aSide = answerSide(entry, dir);
  const qKey = normalize(qSide.text);
  const aLang = dir === 'ab' ? list.langB : list.langA;
  const siblings = list.entries.filter((e) => e === entry || normalize(questionSide(e, dir).text) === qKey);
  const accepted = [...new Set(siblings.flatMap((e) => sideTexts(answerSide(e, dir))))];
  const acceptedKeys = new Set(accepted.flatMap(keysOf));

  const others: Other[] = [];
  for (const e of list.entries) {
    if (siblings.includes(e)) continue;
    for (const text of sideTexts(answerSide(e, dir))) {
      if (!keysOf(text).some((k) => acceptedKeys.has(k))) others.push({ text, meaning: sideLabel(questionSide(e, dir)) });
    }
  }

  let options: string[] = [];
  if (mode !== 'type') {
    const n = mode === 'choose4' ? 4 : 8;
    const seen = new Set(acceptedKeys);
    const pool: string[] = [];
    for (const e of shuffle(list.entries, rng)) {
      const text = answerSide(e, dir).text;
      if (siblings.includes(e) || seen.has(normalize(text))) continue;
      seen.add(normalize(text));
      pool.push(text);
    }
    let wrong: string[];
    if (mode === 'choose8') {
      const alike = Math.ceil((n - 1) / 2);
      const byLook = [...pool].sort((p, q) => similarity(q, aSide.text, aLang) - similarity(p, aSide.text, aLang));
      const looks = shuffle(byLook.slice(0, alike + 2), rng).slice(0, alike);
      wrong = [...looks, ...shuffle(pool.filter((p) => !looks.includes(p)), rng)].slice(0, n - 1);
    } else {
      wrong = pool.slice(0, n - 1);
    }
    options = shuffle([aSide.text, ...wrong], rng);
  }

  return {
    entry,
    dir,
    mode,
    prompt: sideLabel(qSide),
    hint: qSide.hint,
    qLang: dir === 'ab' ? list.langA : list.langB,
    aLang,
    answer: aSide.text,
    accepted,
    others,
    options,
  };
}

/** Is a multiple-choice option a right answer? */
export function isRightOption(q: Question, option: string): boolean {
  const keys = new Set(q.accepted.flatMap(keysOf));
  return keysOf(option).some((k) => keys.has(k));
}
