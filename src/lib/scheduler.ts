// Choosing the next question: Leitner boxes with soft weights, new words in small batches,
// and a "not forgotten" rule (PLAN.md 4.1). Based on TopoChamp's scheduler.ts.

export interface ItemProgress {
  /** 0 = never asked, 1 = wrong recently, 2–5 = answered right more and more often. */
  box: number;
  attempts: number;
  /** Answers that were right without hints. */
  correct: number;
  /** Timestamp (ms) of the last answer. */
  last: number;
}

export const NEW_PROGRESS: ItemProgress = { box: 0, attempts: 0, correct: 0, last: 0 };

/** Draw weight per box (index = box): words that need practice most, mastered ones still regularly. */
export const BOX_WEIGHTS = [4, 5, 4, 3, 2, 1];

/** From this box on a word counts as mastered ("geleerd"). */
export const MASTERED_BOX = 4;

/** At most this many words in box 1 before new words are let in. */
export const BATCH = 5;

const DAY = 24 * 60 * 60 * 1000;

/** right = moves up a box; hinted = right after hints, stays in its box; wrong = back to box 1. */
export type Outcome = 'right' | 'hinted' | 'wrong';

export function updateProgress(p: ItemProgress, outcome: Outcome, now = Date.now()): ItemProgress {
  const box = outcome === 'right' ? Math.min(5, Math.max(p.box, 1) + 1) : outcome === 'hinted' ? Math.max(p.box, 1) : 1;
  return { box, attempts: p.attempts + 1, correct: p.correct + (outcome === 'right' ? 1 : 0), last: now };
}

/** Draw weight; a word not asked for 2 days gets at least the weight of box 3. */
export function weightOf(p: ItemProgress, now = Date.now()): number {
  const w = BOX_WEIGHTS[p.box] ?? 1;
  return p.box >= 1 && p.last && now - p.last > 2 * DAY ? Math.max(w, BOX_WEIGHTS[3]) : w;
}

export type Rng = () => number;

export function shuffle<T>(list: T[], rng: Rng = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Picks the next item for a learning session. Items are given in list order. */
export class LearnScheduler {
  private recent: string[] = [];
  private retries: { id: string; due: number }[] = [];
  private readonly cooldown: number;

  constructor(
    private readonly ids: string[],
    private readonly progressOf: (id: string) => ItemProgress,
    private readonly rng: Rng = Math.random,
    private readonly now: () => number = Date.now,
  ) {
    this.cooldown = Math.min(3, Math.floor(ids.length / 2));
  }

  /** Items that may be asked now: everything introduced, plus the next new ones in list order. */
  pool(): string[] {
    const learning = this.ids.filter((id) => this.progressOf(id).box === 1).length;
    let room = Math.max(0, BATCH - learning);
    const out: string[] = [];
    for (const id of this.ids) {
      if (this.progressOf(id).box > 0) out.push(id);
      else if (room > 0) {
        out.push(id);
        room--;
      }
    }
    return out.length ? out : [...this.ids];
  }

  /** The item for question number `index` (0-based). */
  next(index: number): string {
    const blocked = new Set(this.recent.slice(-this.cooldown));
    const dueIdx = this.retries.findIndex((r) => r.due <= index && !blocked.has(r.id));
    let id: string;
    if (dueIdx >= 0) {
      id = this.retries[dueIdx].id;
      this.retries.splice(dueIdx, 1);
    } else {
      const pool = this.pool();
      const open = pool.filter((i) => !blocked.has(i));
      const candidates = open.length ? open : this.ids.filter((i) => !blocked.has(i)).length ? this.ids.filter((i) => !blocked.has(i)) : this.ids;
      const now = this.now();
      const weights = candidates.map((i) => weightOf(this.progressOf(i), now));
      let r = this.rng() * weights.reduce((a, b) => a + b, 0);
      id = candidates[candidates.length - 1];
      for (let i = 0; i < candidates.length; i++) {
        r -= weights[i];
        if (r < 0) {
          id = candidates[i];
          break;
        }
      }
    }
    this.recent.push(id);
    return id;
  }

  /** After a wrong (or skipped) answer the word is asked once more, 3–5 questions later. */
  scheduleRetry(id: string, index: number): void {
    this.retries = this.retries.filter((r) => r.id !== id);
    this.retries.push({ id, due: index + 3 + Math.floor(this.rng() * 3) });
  }
}
