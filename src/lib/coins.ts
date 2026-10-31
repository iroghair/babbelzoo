// Coin rules and bonuses (PLAN.md 3.6), food (5.3) and the test grade (4.2).
import { MASTERED_BOX, type ItemProgress } from './scheduler';
import type { Mode } from './types';

export const MODE_MULTIPLIER: Record<Mode, number> = { choose4: 1, choose8: 1.5, type: 2 };

/** Hard words answered right are worth double, mastered ones half. */
export function wordFactor(p: ItemProgress): number {
  if (p.box === 1 || (p.attempts >= 3 && p.correct / p.attempts < 0.6)) return 2;
  if (p.box >= MASTERED_BOX) return 0.5;
  return 1;
}

export interface CoinInput {
  mode: Mode;
  /** Progress of the word before this answer. */
  before: ItemProgress;
  typo: boolean;
  /** 1 without hints, down to 0 when the whole answer was revealed. */
  hint: number;
}

export function answerCoins({ mode, before, typo, hint }: CoinInput): number {
  if (hint <= 0) return 0;
  return Math.max(1, Math.round(10 * MODE_MULTIPLIER[mode] * wordFactor(before) * (typo ? 0.75 : 1) * hint));
}

export const STREAK_STEP = 5;

/** +5 at every 5 right answers in a row. */
export function streakBonus(streak: number): number {
  return streak > 0 && streak % STREAK_STEP === 0 ? 5 : 0;
}

/** First finished session of the day: +20, plus +5 for each extra day in a row (max +50). */
export function dailyBonus(dayStreak: number): number {
  return Math.min(50, 20 + 5 * (Math.max(1, dayStreak) - 1));
}

export function foodFor(path: 'learn' | 'test', length: number): number {
  return path === 'test' || length >= 20 ? 2 : 1;
}

/** 1 + 9 × (right / total), one decimal. */
export function grade(right: number, total: number): number {
  return total ? Math.round((1 + (9 * right) / total) * 10) / 10 : 1;
}

/** Local date as "YYYY-MM-DD". */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** The day streak after playing today; `first` = this is the first finished session today. */
export function playDay(lastDay: string, streak: number, today = dayKey()): { streak: number; first: boolean } {
  if (lastDay === today) return { streak, first: false };
  return { streak: lastDay === previousDay(today) ? streak + 1 : 1, first: true };
}
