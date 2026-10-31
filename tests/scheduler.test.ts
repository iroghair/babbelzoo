import { describe, expect, it } from 'vitest';
import { BATCH, LearnScheduler, NEW_PROGRESS, updateProgress, weightOf, type ItemProgress } from '../src/lib/scheduler';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('updateProgress', () => {
  it('moves boxes', () => {
    expect(updateProgress(NEW_PROGRESS, 'right', 1).box).toBe(2);
    expect(updateProgress({ ...NEW_PROGRESS, box: 3 }, 'right', 1).box).toBe(4);
    expect(updateProgress({ ...NEW_PROGRESS, box: 5 }, 'right', 1).box).toBe(5);
    expect(updateProgress({ ...NEW_PROGRESS, box: 4 }, 'wrong', 1).box).toBe(1);
    expect(updateProgress({ ...NEW_PROGRESS, box: 3 }, 'hinted', 1).box).toBe(3);
    expect(updateProgress(NEW_PROGRESS, 'hinted', 1).box).toBe(1);
  });
  it('counts only unhinted right answers as correct', () => {
    const p = updateProgress(updateProgress(NEW_PROGRESS, 'right', 1), 'hinted', 2);
    expect(p).toEqual({ box: 2, attempts: 2, correct: 1, last: 2 });
  });
});

describe('weightOf', () => {
  it('uses soft weights and the not-forgotten rule', () => {
    const now = 10 * 86_400_000;
    expect(weightOf({ ...NEW_PROGRESS, box: 1, last: now }, now)).toBe(5);
    expect(weightOf({ ...NEW_PROGRESS, box: 5, last: now }, now)).toBe(1);
    expect(weightOf({ ...NEW_PROGRESS, box: 5, last: now - 3 * 86_400_000 }, now)).toBe(3);
  });
});

describe('LearnScheduler', () => {
  it('lets new words in by batches', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `w${i}`);
    const progress: Record<string, ItemProgress> = {};
    const s = new LearnScheduler(ids, (id) => progress[id] ?? NEW_PROGRESS);
    expect(s.pool()).toEqual(ids.slice(0, BATCH));
    // Two words answered wrong: those stay, three new words may join.
    progress.w0 = { ...NEW_PROGRESS, box: 1 };
    progress.w1 = { ...NEW_PROGRESS, box: 1 };
    progress.w2 = { ...NEW_PROGRESS, box: 2 };
    expect(s.pool()).toEqual(['w0', 'w1', 'w2', 'w3', 'w4', 'w5']);
    // Five words in box 1: no new words.
    for (const id of ['w2', 'w3', 'w4']) progress[id] = { ...NEW_PROGRESS, box: 1 };
    expect(s.pool()).toEqual(['w0', 'w1', 'w2', 'w3', 'w4']);
  });

  it('does not repeat an item within 3 questions', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const s = new LearnScheduler(ids, () => ({ ...NEW_PROGRESS, box: 2 }), seq([0.1, 0.5, 0.9, 0.3, 0.7]));
    const picks = Array.from({ length: 30 }, (_, i) => s.next(i));
    for (let i = 3; i < picks.length; i++) expect(picks.slice(i - 3, i)).not.toContain(picks[i]);
  });

  it('brings a wrong word back 3–5 questions later', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const s = new LearnScheduler(ids, () => ({ ...NEW_PROGRESS, box: 2 }), seq([0]));
    const first = s.next(0);
    s.scheduleRetry(first, 0);
    const picks = Array.from({ length: 6 }, (_, i) => s.next(i + 1));
    expect(picks.indexOf(first)).toBeGreaterThanOrEqual(2);
  });

  it('asks words needing practice more often', () => {
    const ids = ['hard', 'easy1', 'easy2', 'easy3', 'easy4', 'easy5', 'easy6', 'easy7'];
    const p = (id: string): ItemProgress => ({ ...NEW_PROGRESS, box: id === 'hard' ? 1 : 5, last: Date.now() });
    const s = new LearnScheduler(ids, p);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const id = s.next(i);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(counts.hard).toBeGreaterThan(1.5 * (counts.easy1 ?? 0));
    expect(counts.easy1).toBeGreaterThan(0);
  });
});
