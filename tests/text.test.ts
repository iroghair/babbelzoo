import { describe, expect, it } from 'vitest';
import { allowedTypos, coreText, expandOptional, matchAnswer, normalize, spellingDiff, stripLeading, type MatchOptions } from '../src/lib/text';

const nl: MatchOptions = { lang: 'nl', spelling: 'lenient', articles: 'optional' };
const en: MatchOptions = { lang: 'en', spelling: 'lenient', articles: 'optional' };

describe('normalize', () => {
  it('ignores capitals, accents, spaces, hyphens and apostrophes', () => {
    expect(normalize("Café")).toBe('cafe');
    expect(normalize("'s-Hertogenbosch")).toBe('shertogenbosch');
    expect(normalize('living  room')).toBe('livingroom');
  });
});

describe('allowedTypos', () => {
  it('depends on word length', () => {
    expect(allowedTypos('ik')).toBe(0);
    expect(allowedTypos('cat')).toBe(0);
    expect(allowedTypos('huis')).toBe(1);
    expect(allowedTypos('keuken')).toBe(1);
    expect(allowedTypos('slaapkamer')).toBe(2);
  });
});

describe('optional parts', () => {
  it('expands brackets', () => {
    expect(expandOptional('(to) walk')).toEqual(['to walk', 'walk']);
    expect(expandOptional('house')).toEqual(['house']);
    expect(coreText('(to) walk')).toBe('walk');
  });
  it('strips leading small words', () => {
    expect(stripLeading('to walk', 'en', 'required')).toBe('walk');
    expect(stripLeading('de hond', 'nl', 'optional')).toBe('hond');
    expect(stripLeading('de hond', 'nl', 'required')).toBe('de hond');
    expect(stripLeading('de', 'nl', 'optional')).toBe('de');
  });
});

describe('matchAnswer', () => {
  it('accepts the exact answer and alternatives', () => {
    expect(matchAnswer('huis', ['huis'], nl)).toEqual({ kind: 'exact', name: 'huis' });
    expect(matchAnswer('Large', ['big', 'large'], en)).toEqual({ kind: 'exact', name: 'large' });
    expect(matchAnswer('cafe', ['café'], nl).kind).toBe('exact');
  });

  it('accepts optional parts and English small words', () => {
    expect(matchAnswer('walk', ['(to) walk'], en).kind).toBe('exact');
    expect(matchAnswer('to walk', ['(to) walk'], en).kind).toBe('exact');
    expect(matchAnswer('the kitchen', ['kitchen'], en).kind).toBe('exact');
  });

  it('handles Dutch articles per setting', () => {
    expect(matchAnswer('hond', ['de hond'], nl).kind).toBe('exact');
    expect(matchAnswer('de hond', ['hond'], nl).kind).toBe('exact');
    const req = { ...nl, articles: 'required' as const };
    expect(matchAnswer('hond', ['de hond'], req).kind).toBe('wrong');
    expect(matchAnswer('het hond', ['de hond'], req).kind).toBe('wrong');
    expect(matchAnswer('de hond', ['de hond'], req).kind).toBe('exact');
    expect(matchAnswer('de hond', ['hond'], req).kind).toBe('exact');
  });

  it('allows typos by length', () => {
    expect(matchAnswer('hius', ['huis'], nl)).toMatchObject({ kind: 'typo', typos: 1, form: 'huis' });
    expect(matchAnswer('huiss', ['het huis'], nl)).toMatchObject({ kind: 'typo', form: 'huis' });
    expect(matchAnswer('slapkamr', ['de slaapkamer'], nl)).toMatchObject({ kind: 'typo', typos: 2 });
    expect(matchAnswer('ok', ['ik'], nl).kind).toBe('wrong');
    expect(matchAnswer('cot', ['cat'], en).kind).toBe('wrong');
    expect(matchAnswer('hoos', ['huis'], nl).kind).toBe('wrong');
  });

  it('typo guard: another word from the list is wrong', () => {
    expect(matchAnswer('horse', ['house'], en, ['horse'])).toEqual({ kind: 'wrong', other: 'horse' });
    expect(matchAnswer('horse', ['house'], en).kind).toBe('typo');
    expect(matchAnswer('de muis', ['het huis'], nl, ['de muis'])).toEqual({ kind: 'wrong', other: 'de muis' });
  });

  it('strict spelling only ignores capitals', () => {
    const strict = { ...nl, spelling: 'strict' as const };
    expect(matchAnswer('Huis', ['huis'], strict).kind).toBe('exact');
    expect(matchAnswer('hius', ['huis'], strict).kind).toBe('wrong');
    expect(matchAnswer('cafe', ['café'], strict).kind).toBe('wrong');
    expect(matchAnswer('walk', ['(to) walk'], { ...en, spelling: 'strict' }).kind).toBe('exact');
  });

  it('empty is wrong', () => {
    expect(matchAnswer('  ', ['huis'], nl).kind).toBe('wrong');
  });
});

describe('spellingDiff', () => {
  it('marks wrong and missing letters', () => {
    const parts = spellingDiff('hius', 'huis');
    expect(parts.map((p) => p.text).join('')).toContain('h');
    expect(parts.some((p) => p.kind !== 'ok')).toBe(true);
    expect(spellingDiff('hius', 'huis')).toEqual([
      { text: 'h', kind: 'ok' },
      { text: 'ui', kind: 'swap' },
      { text: 's', kind: 'ok' },
    ]);
    expect(spellingDiff('huis', 'huis')).toEqual([{ text: 'huis', kind: 'ok' }]);
    expect(spellingDiff('hus', 'huis')).toEqual([
      { text: 'hu', kind: 'ok' },
      { text: 'i', kind: 'missing' },
      { text: 's', kind: 'ok' },
    ]);
  });
});
