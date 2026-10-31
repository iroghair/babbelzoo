import { describe, expect, it } from 'vitest';
import { parseList } from '../src/lib/parse';
import { buildQuestion, isRightOption, modeAvailable } from '../src/lib/questions';
import type { WordList } from '../src/lib/types';
import { STARTER_TEXT } from '../src/data/starter';

const list = (text: string): WordList => ({ id: 'l', name: 'L', langA: 'en', langB: 'nl', entries: parseList(text).entries, created: 0, updated: 0 });
const starter = list(STARTER_TEXT);

describe('buildQuestion', () => {
  it('asks side A and accepts side B', () => {
    const e = starter.entries[0];
    const q = buildQuestion(starter, e, 'ab', 'type');
    expect(q.prompt).toBe('house');
    expect(q.answer).toBe('het huis');
    expect(q.accepted).toEqual(['het huis']);
    expect(q.qLang).toBe('en');
    expect(q.aLang).toBe('nl');
    expect(q.others.some((o) => o.text === 'de keuken' && o.meaning === 'kitchen')).toBe(true);
  });

  it('accepts the answers of entries with the same question word', () => {
    const l = list('groot = big\ngroot = large\nklein = small\nhuis = house');
    const q = buildQuestion(l, l.entries[0], 'ab', 'type');
    expect(q.accepted).toEqual(['big', 'large']);
    expect(q.others.map((o) => o.text)).toEqual(['small', 'house']);
  });

  it('shows alternatives and hints in the question', () => {
    const l = list('big / large = groot\nbank [river] = oever');
    expect(buildQuestion(l, l.entries[0], 'ab', 'type').prompt).toBe('big / large');
    const q = buildQuestion(l, l.entries[1], 'ab', 'type');
    expect(q.prompt).toBe('bank');
    expect(q.hint).toBe('river');
    expect(buildQuestion(l, l.entries[0], 'ba', 'type').accepted).toEqual(['big', 'large']);
  });

  it('makes 4 or 8 different options without other right answers', () => {
    const l = list(STARTER_TEXT + '\nlarge = enorm');
    const e = l.entries.find((x) => x.a.text === 'big')!;
    for (const mode of ['choose4', 'choose8'] as const) {
      for (let i = 0; i < 20; i++) {
        const q = buildQuestion(l, e, 'ba', mode);
        expect(q.options).toHaveLength(mode === 'choose4' ? 4 : 8);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.options.filter((o) => isRightOption(q, o))).toEqual(['big']);
      }
    }
  });

  it('knows when a list is too short for multiple choice', () => {
    const l = list('a = b\nc = d\ne = f\ng = h\ni = j');
    expect(modeAvailable(l, 'choose4', ['ab'])).toBe(true);
    expect(modeAvailable(l, 'choose8', ['ab'])).toBe(false);
  });
});
