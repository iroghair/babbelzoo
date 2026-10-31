// Saving what a session earns: coins per answer, and at the end food, the daily bonus and
// milestones (PLAN.md 3.6, 5.1, 5.3).
import { dailyBonus, dayKey, foodFor, playDay } from './coins';
import { listStats, profile, type ListStats } from './profile.svelte';
import type { AnswerRecord, GameSession } from './session.svelte';

export interface SessionSummary {
  /** Coins from answers and streak bonuses. */
  coins: number;
  /** Daily bonus (0 when not the first finished session today). */
  daily: number;
  dayStreak: number;
  food: number;
  before: ListStats;
  after: ListStats;
  /** The test grade reached 9 for the first time: the unicorn is unlocked. */
  unicorn: boolean;
  stopped: boolean;
}

export function addCoins(n: number): void {
  if (n <= 0) return;
  profile.data.wallet.coins += n;
  profile.data.wallet.earned += n;
}

/** After every answer: the coins go into the wallet straight away. */
export function rewardAnswer(r: AnswerRecord): void {
  addCoins(r.coins + r.streakBonus);
}

export function finishSession(session: GameSession, before: ListStats, today = dayKey()): SessionSummary {
  const wallet = profile.data.wallet;
  const ms = profile.data.milestones;
  const after = listStats(session.list);
  const summary: SessionSummary = { coins: session.coins, daily: 0, dayStreak: wallet.dayStreak, food: 0, before, after, unicorn: false, stopped: session.stopped };
  if (session.stopped) return summary;

  const day = playDay(wallet.lastDay, wallet.dayStreak, today);
  wallet.dayStreak = day.streak;
  wallet.lastDay = today;
  ms.longestDayStreak = Math.max(ms.longestDayStreak, day.streak);
  summary.dayStreak = day.streak;
  if (day.first) {
    summary.daily = dailyBonus(day.streak);
    addCoins(summary.daily);
  }

  summary.food = foodFor(session.path, session.total);
  wallet.food += summary.food;

  if (session.path === 'test') {
    summary.unicorn = session.grade >= 9 && ms.bestGrade < 9;
    ms.bestGrade = Math.max(ms.bestGrade, session.grade);
  }
  if (after.total && after.known === after.total && !ms.masteredLists.includes(session.list.id)) {
    ms.masteredLists.push(session.list.id);
  }
  return summary;
}
