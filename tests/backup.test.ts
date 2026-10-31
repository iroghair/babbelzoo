import { beforeEach, describe, expect, it } from 'vitest';
import { makeBackup, restoreBackup } from '../src/lib/backup';

// A tiny in-memory localStorage for node.
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
};

describe('backup', () => {
  beforeEach(() => store.clear());

  it('round-trips players, profiles, progress and lists', () => {
    store.set('babbelzoo.players', JSON.stringify({ list: [{ id: 'p1', name: 'A', avatar: '🦊' }], currentId: 'p1' }));
    store.set('babbelzoo.profile.p1', JSON.stringify({ wallet: { coins: 42 } }));
    store.set('babbelzoo.progress.p1', JSON.stringify({ 'l:e:ab': { box: 3 } }));
    store.set('babbelzoo.lists', JSON.stringify([{ id: 'l' }]));
    const text = JSON.stringify(makeBackup());
    store.clear();
    restoreBackup(text);
    expect(JSON.parse(store.get('babbelzoo.profile.p1')!)).toEqual({ wallet: { coins: 42 } });
    expect(JSON.parse(store.get('babbelzoo.progress.p1')!)).toEqual({ 'l:e:ab': { box: 3 } });
    expect(JSON.parse(store.get('babbelzoo.lists')!)).toEqual([{ id: 'l' }]);
  });

  it('refuses other files', () => {
    expect(() => restoreBackup('{"app":"topochamp"}')).toThrow();
    expect(() => restoreBackup('nonsense')).toThrow();
  });
});
