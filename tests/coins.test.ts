import { describe, expect, it } from 'vitest';
import { answerCoins, dailyBonus, foodFor, grade, playDay, previousDay, streakBonus, wordFactor } from '../src/lib/coins';
import { hintFactor, hintTarget, hintTimes, letterCount, maskAnswer } from '../src/lib/hints';
import { NEW_PROGRESS } from '../src/lib/scheduler';

const p = (box: number, attempts = 0, correct = 0) => ({ ...NEW_PROGRESS, box, attempts, correct });

describe('coins', () => {
  it('uses the word factor', () => {
    expect(wordFactor(p(0))).toBe(1);
    expect(wordFactor(p(1))).toBe(2);
    expect(wordFactor(p(3, 5, 2))).toBe(2);
    expect(wordFactor(p(3, 5, 4))).toBe(1);
    expect(wordFactor(p(4, 5, 5))).toBe(0.5);
  });
  it('matches the examples in the plan', () => {
    expect(answerCoins({ mode: 'choose4', before: p(5), typo: false, hint: 1 })).toBe(5);
    expect(answerCoins({ mode: 'type', before: p(1), typo: false, hint: 1 })).toBe(40);
    expect(answerCoins({ mode: 'type', before: p(2), typo: true, hint: 1 })).toBe(15);
    expect(answerCoins({ mode: 'choose8', before: p(2), typo: false, hint: 1 })).toBe(15);
    expect(answerCoins({ mode: 'type', before: p(2), typo: false, hint: 0.5 })).toBe(10);
    expect(answerCoins({ mode: 'choose4', before: p(5), typo: false, hint: 0.1 })).toBe(1);
    expect(answerCoins({ mode: 'type', before: p(2), typo: false, hint: 0 })).toBe(0);
  });
  it('gives streak and daily bonuses', () => {
    expect([1, 4, 5, 6, 10].map(streakBonus)).toEqual([0, 0, 5, 0, 5]);
    expect(dailyBonus(1)).toBe(20);
    expect(dailyBonus(4)).toBe(35);
    expect(dailyBonus(30)).toBe(50);
  });
  it('tracks the day streak', () => {
    expect(previousDay('2026-11-01')).toBe('2026-10-31');
    expect(playDay('', 0, '2026-11-02')).toEqual({ streak: 1, first: true });
    expect(playDay('2026-11-01', 3, '2026-11-02')).toEqual({ streak: 4, first: true });
    expect(playDay('2026-11-02', 4, '2026-11-02')).toEqual({ streak: 4, first: false });
    expect(playDay('2026-10-30', 4, '2026-11-02')).toEqual({ streak: 1, first: true });
  });
  it('gives food and grades', () => {
    expect(foodFor('learn', 10)).toBe(1);
    expect(foodFor('learn', 20)).toBe(2);
    expect(foodFor('test', 30)).toBe(2);
    expect(grade(25, 30)).toBe(8.5);
    expect(grade(30, 30)).toBe(10);
    expect(grade(0, 30)).toBe(1);
  });
});

describe('hints', () => {
  it('reveals letter by letter', () => {
    expect(hintTarget('de keuken', 'nl', 'optional')).toBe('keuken');
    expect(hintTarget('de keuken', 'nl', 'required')).toBe('de keuken');
    expect(hintTarget('(to) cook', 'en', 'optional')).toBe('cook');
    expect(letterCount('living room')).toBe(10);
    expect(maskAnswer('huis', 1)).toBe('h _ _ _');
    expect(maskAnswer('ice cream', 2)).toBe('i c _   _ _ _ _ _');
    expect(hintFactor(1, 4)).toBe(0.75);
    expect(hintTimes('type', 'normal')).toEqual({ first: 8000, next: 4000 });
    expect(hintTimes('choose', 'slow')).toEqual({ first: 12000, next: 6000 });
    expect(hintTimes('type', 'off')).toBeNull();
  });
});
