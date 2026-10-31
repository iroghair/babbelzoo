// Hints when an answer takes too long (PLAN.md 3.4).
import { coreText, stripLeading, type Articles } from './text';

export type HintSpeed = 'slow' | 'normal' | 'off';

/** Waiting times in ms: the first hint, then each next one. Slow doubles them. */
export function hintTimes(kind: 'type' | 'choose', speed: HintSpeed): { first: number; next: number } | null {
  if (speed === 'off') return null;
  const base = kind === 'type' ? { first: 8000, next: 4000 } : { first: 6000, next: 3000 };
  const f = speed === 'slow' ? 2 : 1;
  return { first: base.first * f, next: base.next * f };
}

const isLetter = (c: string) => /[\p{L}\p{N}]/u.test(c);

/** The part of the answer that is revealed letter by letter: no optional words or articles. */
export function hintTarget(answer: string, lang: string, articles: Articles): string {
  return stripLeading(coreText(answer), lang, articles);
}

export function letterCount(s: string): number {
  return [...s].filter(isLetter).length;
}

/** "huis" with 1 letter shown → "h _ _ _". Spaces and punctuation are shown for free. */
export function maskAnswer(target: string, shown: number): string {
  let n = 0;
  return [...target]
    .map((c) => {
      if (c === ' ') return '  ';
      if (!isLetter(c)) return c;
      return n++ < shown ? c : '_';
    })
    .join(' ')
    .replace(/ {3,}/g, '   ');
}

/** Share of the coins left after `shown` of `total` hint steps. */
export function hintFactor(shown: number, total: number): number {
  return total > 0 ? Math.max(0, 1 - shown / total) : 1;
}
