import { describe, expect, it } from 'vitest';
import { STARTER_TEXT } from '../src/data/starter';
import { csvToText, listToCsv, listToText, parseCsv, parseList, parseSide, splitLine } from '../src/lib/parse';

describe('parseSide', () => {
  it('reads alternatives, hints and optional parts', () => {
    expect(parseSide('big / large')).toEqual({ text: 'big', alts: ['large'] });
    expect(parseSide('bank [river]')).toEqual({ text: 'bank', alts: [], hint: 'river' });
    expect(parseSide('(to) walk')).toEqual({ text: '(to) walk', alts: [] });
    expect(parseSide('  ')).toBeNull();
  });
});

describe('splitLine', () => {
  it('detects the separator', () => {
    expect(splitLine('house = huis')).toEqual(['house', 'huis']);
    expect(splitLine('house\thuis\textra')).toEqual(['house', 'huis']);
    expect(splitLine('house - huis')).toEqual(['house', 'huis']);
    expect(splitLine('well-known – bekend')).toEqual(['well-known', 'bekend']);
    expect(splitLine('house; huis')).toEqual(['house', 'huis']);
    expect(splitLine('house | huis')).toEqual(['house', 'huis']);
    expect(splitLine('house, huis')).toEqual(['house', 'huis']);
    expect(splitLine('well-known')).toBeNull();
  });
});

describe('parseList', () => {
  it('reads a pasted Word list with numbering, comments and blank lines', () => {
    const r = parseList('English = Nederlands\n1. house = huis\n\n# chapter 2\n2) big / large = groot\n• bank [river] = oever\nnonsense\n');
    expect(r.langs).toEqual(['en', 'nl']);
    expect(r.entries.map((e) => [e.a.text, e.b.text])).toEqual([
      ['house', 'huis'],
      ['big', 'groot'],
      ['bank', 'oever'],
    ]);
    expect(r.warnings).toEqual([{ line: 7, text: 'nonsense', kind: 'unreadable' }]);
  });

  it('warns about duplicates and shared words', () => {
    const r = parseList('big = groot\nbig = groot\nlarge = groot');
    expect(r.entries).toHaveLength(2);
    expect(r.warnings.map((w) => w.kind)).toEqual(['duplicate', 'shared']);
  });

  it('reads the starter list completely', () => {
    const r = parseList(STARTER_TEXT);
    expect(r.entries).toHaveLength(30);
    expect(r.warnings).toEqual([]);
  });

  it('round-trips through text', () => {
    const r = parseList('big / large [size] = groot\n(to) walk = lopen');
    expect(listToText(r.entries)).toBe('big / large [size] = groot\n(to) walk = lopen');
  });
});

describe('CSV', () => {
  it('reads comma and semicolon CSV with quotes', () => {
    expect(parseCsv('a,b\n"big, large",groot\n')).toEqual([
      ['a', 'b'],
      ['big, large', 'groot'],
    ]);
    expect(parseCsv('house;huis\r\nroof;dak')).toEqual([
      ['house', 'huis'],
      ['roof', 'dak'],
    ]);
  });
  it('converts to entries and back', () => {
    const r = parseList(csvToText('English,Nederlands\nhouse,huis\n"big / large",groot'));
    expect(r.langs).toEqual(['en', 'nl']);
    expect(r.entries).toHaveLength(2);
    expect(listToCsv(r.entries, ['English', 'Nederlands'])).toBe('English,Nederlands\nhouse,huis\nbig / large,groot');
  });
});
