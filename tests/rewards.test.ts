import { describe, expect, it } from 'vitest';
import { STARTER_TEXT } from '../src/data/starter';
import { parseList } from '../src/lib/parse';
import { addPlayer, DEFAULT_SETTINGS, listStats, profile, progressStore } from '../src/lib/profile.svelte';
import { finishSession, rewardAnswer } from '../src/lib/rewards';
import { GameSession } from '../src/lib/session.svelte';
import type { WordList } from '../src/lib/types';

const list: WordList = { id: 'r', name: 'R', langA: 'en', langB: 'nl', entries: parseList(STARTER_TEXT).entries, created: 0, updated: 0 };

function play(path: 'learn' | 'test', rightShare = 1) {
  const s = new GameSession({ path, list, dir: 'ab', modes: ['type'], length: 10, settings: DEFAULT_SETTINGS, progress: progressStore() });
  const before = listStats(list);
  let i = 0;
  while (s.phase !== 'done') {
    if (s.phase === 'intro') s.dismissIntro();
    rewardAnswer(s.answerText(i++ < rightShare * s.total ? s.question!.answer : 'xyz'));
    s.next();
  }
  return { s, before };
}

describe('rewards', () => {
  it('pays coins per answer, then food and a daily bonus once per day', () => {
    addPlayer('Test', '🦊');
    const { s, before } = play('learn');
    expect(profile.data.wallet.coins).toBe(s.coins);
    const sum = finishSession(s, before, '2026-11-02');
    expect(sum).toMatchObject({ daily: 20, dayStreak: 1, food: 1, stopped: false });
    expect(profile.data.wallet.coins).toBe(s.coins + 20);
    expect(profile.data.wallet.food).toBe(1);

    const again = play('learn');
    expect(finishSession(again.s, again.before, '2026-11-02').daily).toBe(0);
    const next = play('learn');
    expect(finishSession(next.s, next.before, '2026-11-03')).toMatchObject({ daily: 25, dayStreak: 2 });
  });

  it('gives nothing extra for a stopped session', () => {
    addPlayer('Stopper', '🐼');
    const s = new GameSession({ path: 'learn', list, dir: 'ab', modes: ['type'], length: 10, settings: DEFAULT_SETTINGS, progress: progressStore() });
    s.stop();
    expect(finishSession(s, listStats(list), '2026-11-02')).toMatchObject({ daily: 0, food: 0, stopped: true });
    expect(profile.data.wallet.food).toBe(0);
  });

  it('records the best grade and unlocks the unicorn at 9+', () => {
    addPlayer('Tester', '🦄');
    const { s, before } = play('test', 0.95);
    const sum = finishSession(s, before, '2026-11-02');
    expect(s.grade).toBeGreaterThanOrEqual(9);
    expect(sum.unicorn).toBe(true);
    expect(sum.food).toBe(2);
    expect(profile.data.milestones.bestGrade).toBe(s.grade);
  });
});
