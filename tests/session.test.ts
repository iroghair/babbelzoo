import { describe, expect, it } from 'vitest';
import { parseList } from '../src/lib/parse';
import { NEW_PROGRESS, updateProgress, type ItemProgress } from '../src/lib/scheduler';
import { GameSession, type ProgressStore, type SessionSettings } from '../src/lib/session.svelte';
import type { WordList } from '../src/lib/types';
import { STARTER_TEXT } from '../src/data/starter';

const list: WordList = { id: 'l', name: 'L', langA: 'en', langB: 'nl', entries: parseList(STARTER_TEXT).entries, created: 0, updated: 0 };
const settings: SessionSettings = { spelling: 'lenient', articles: 'optional', hintSpeed: 'normal', copyAfterWrong: true, testFeedback: 'each' };

function memory(): ProgressStore & { map: Record<string, ItemProgress> } {
  const map: Record<string, ItemProgress> = {};
  return { map, get: (k) => map[k] ?? NEW_PROGRESS, record: (k, o) => (map[k] = updateProgress(map[k] ?? NEW_PROGRESS, o)) };
}

describe('learning session', () => {
  it('introduces new words, scores answers and ends after the set length', () => {
    const progress = memory();
    const s = new GameSession({ path: 'learn', list, dir: 'ab', modes: 'auto', length: 10, settings, progress });
    expect(s.phase).toBe('intro');
    expect(s.question?.mode).toBe('choose4');
    let n = 0;
    while (s.phase !== 'done') {
      if (s.phase === 'intro') s.dismissIntro();
      const r = s.answerText(s.question!.answer);
      expect(r.kind).toBe('right');
      expect(r.coins).toBeGreaterThan(0);
      s.next();
      n++;
    }
    expect(n).toBe(10);
    expect(s.bestStreak).toBe(10);
    // 10 answers + 2 streak bonuses.
    expect(s.coins).toBe(s.records.reduce((a, r) => a + r.coins, 0) + 10);
  });

  it('handles typos, wrong answers, skips and reveals', () => {
    const progress = memory();
    const s = new GameSession({ path: 'learn', list, dir: 'ab', modes: ['type'], length: 10, settings, progress });
    s.dismissIntro();
    expect(s.answerText('xyz').kind).toBe('wrong');
    expect(s.streak).toBe(0);
    s.next();
    s.dismissIntro();
    const answer = s.question!.answer.replace(/^(de|het) /, '');
    const typo = answer.length >= 4 ? answer.slice(0, -1) + 'x' : answer;
    expect(['typo', 'right']).toContain(s.answerText(typo).kind);
    s.next();
    s.dismissIntro();
    expect(s.skip()?.kind).toBe('skipped');
    s.next();
    s.dismissIntro();
    expect(s.reveal()).toMatchObject({ kind: 'revealed', coins: 0 });
    expect(s.skipsLeft).toBe(1);
  });

  it('keeps the box after a hinted answer', () => {
    const progress = memory();
    const s = new GameSession({ path: 'learn', list, dir: 'ab', modes: ['type'], length: 10, settings, progress });
    s.dismissIntro();
    const r = s.answerText(s.question!.answer, 2, 4);
    expect(r.hinted).toBe(true);
    expect(r.after.box).toBe(1);
    expect(s.streak).toBe(0);
  });
});

describe('test session', () => {
  it('asks every word once and gives a grade', () => {
    const progress = memory();
    const s = new GameSession({ path: 'test', list, dir: 'both', modes: ['type'], length: 10, settings, progress });
    expect(s.total).toBe(30);
    expect(s.skipsLeft).toBe(0);
    const seen = new Set<string>();
    let i = 0;
    while (s.phase !== 'done') {
      expect(s.phase).toBe('question');
      seen.add(s.question!.entry.id);
      s.answerText(i++ < 24 ? s.question!.answer : 'nope');
      s.next();
    }
    expect(seen.size).toBe(30);
    expect(s.grade).toBe(8.2);
    expect(s.mistakes).toHaveLength(6);
  });
});
