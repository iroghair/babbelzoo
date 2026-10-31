import { describe, expect, it } from 'vitest';
import { parseList } from '../src/lib/parse';
import { decodeList, encodeList, qrSvg } from '../src/lib/share';
import { STARTER_TEXT } from '../src/data/starter';

describe('share codes', () => {
  it('round-trips a list', async () => {
    const entries = parseList(STARTER_TEXT).entries;
    const code = await encodeList({ name: 'Unit 3', langA: 'en', langB: 'nl', entries });
    expect(code.length).toBeLessThan(900);
    const back = await decodeList(code);
    expect(back?.name).toBe('Unit 3');
    expect(back?.entries.map((e) => [e.a, e.b])).toEqual(entries.map((e) => [e.a, e.b]));
  });
  it('rejects garbage', async () => {
    expect(await decodeList('x!!')).toBeNull();
  });
  it('makes a QR code', () => {
    expect(qrSvg('https://example.org/#list=zabc')).toContain('<svg');
  });
});
