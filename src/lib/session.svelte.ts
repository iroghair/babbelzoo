// One learning or test session (PLAN.md 3 and 4).
import { answerCoins, grade, streakBonus } from './coins';
import { hintFactor } from './hints';
import { buildQuestion, isRightOption, modeAvailable, type Other, type Question } from './questions';
import { LearnScheduler, shuffle, type ItemProgress, type Outcome, type Rng } from './scheduler';
import { matchAnswer, type Articles, type Spelling } from './text';
import type { Dir, DirSetting, Entry, Mode, WordList } from './types';
import type { HintSpeed } from './hints';

export type Path = 'learn' | 'test';

export interface SessionSettings {
  spelling: Spelling;
  articles: Articles;
  hintSpeed: HintSpeed;
  copyAfterWrong: boolean;
  testFeedback: 'each' | 'end';
}

/** Where progress lives (per player); the session only reads and records. */
export interface ProgressStore {
  get(key: string): ItemProgress;
  record(key: string, outcome: Outcome): ItemProgress;
}

export interface SessionConfig {
  path: Path;
  list: WordList;
  dir: DirSetting;
  modes: Mode[] | 'auto';
  /** Number of questions on the learning path (the test asks every word once). */
  length: number;
  settings: SessionSettings;
  progress: ProgressStore;
  /** Only these entries ("Practise these words"). */
  entryIds?: string[];
  rng?: Rng;
}

export type Phase = 'intro' | 'question' | 'feedback' | 'done';
export type ResultKind = 'right' | 'typo' | 'wrong' | 'skipped' | 'revealed';

export interface AnswerRecord {
  q: Question;
  kind: ResultKind;
  typed: string;
  /** Typo match: the written form that was meant, for the spelling diff. */
  form?: string;
  /** Typo guard: the other word that was typed. */
  other?: Other;
  /** Some hint letters/options were used. */
  hinted: boolean;
  coins: number;
  streakBonus: number;
  before: ItemProgress;
  after: ItemProgress;
}

export const progressKey = (listId: string, entryId: string, dir: Dir) => `${listId}:${entryId}:${dir}`;

const AUTO_MODES: Mode[] = ['choose4', 'choose4', 'choose8', 'type', 'type', 'type'];

export class GameSession {
  readonly path: Path;
  readonly list: WordList;
  readonly total: number;
  readonly settings: SessionSettings;
  readonly config: SessionConfig;

  index = $state(0);
  phase: Phase = $state('question');
  question: Question | null = $state(null);
  records: AnswerRecord[] = $state([]);
  last: AnswerRecord | null = $state(null);
  streak = $state(0);
  bestStreak = $state(0);
  coins = $state(0);
  skipsLeft = $state(2);
  /** Set when the player stopped halfway. */
  stopped = $state(false);

  private readonly rng: Rng;
  private readonly entries: Entry[];
  private readonly byId: Map<string, Entry>;
  private readonly modes: Mode[] | 'auto';
  private readonly scheduler?: LearnScheduler;
  private readonly order: string[] = [];
  private readonly introduced = new Set<string>();
  private readonly dirs: Dir[];

  constructor(config: SessionConfig) {
    this.config = config;
    this.path = config.path;
    this.list = config.list;
    this.settings = config.settings;
    this.rng = config.rng ?? Math.random;
    const only = config.entryIds && new Set(config.entryIds);
    this.entries = only ? config.list.entries.filter((e) => only.has(e.id)) : config.list.entries;
    this.byId = new Map(this.entries.map((e) => [e.id, e]));
    this.dirs = config.dir === 'both' ? ['ab', 'ba'] : [config.dir];

    const usable = (m: Mode) => modeAvailable(config.list, m, this.dirs);
    this.modes = config.modes === 'auto' && config.path === 'learn' ? 'auto' : config.modes === 'auto' ? ['type'] : config.modes.filter(usable);
    if (this.modes !== 'auto' && !this.modes.length) this.modes = ['type'];

    if (config.path === 'learn') {
      const ids = this.entries.flatMap((e) => this.dirs.map((d) => `${e.id}:${d}`));
      this.scheduler = new LearnScheduler(ids, (id) => this.progressOf(id), this.rng);
      this.total = config.length;
    } else {
      this.order = shuffle(this.entries, this.rng).map((e) => `${e.id}:${this.dirs[Math.floor(this.rng() * this.dirs.length)]}`);
      this.total = this.order.length;
      this.skipsLeft = 0;
    }
    this.ask();
  }

  private progressOf(item: string): ItemProgress {
    const [entryId, dir] = item.split(':');
    return this.config.progress.get(progressKey(this.list.id, entryId, dir as Dir));
  }

  private modeFor(item: string): Mode {
    const usable = (m: Mode) => modeAvailable(this.list, m, this.dirs);
    if (this.modes === 'auto') {
      let mode = AUTO_MODES[this.progressOf(item).box] ?? 'type';
      if (mode === 'choose8' && !usable('choose8')) mode = usable('choose4') ? 'choose4' : 'type';
      if (mode === 'choose4' && !usable('choose4')) mode = 'type';
      return mode;
    }
    return this.modes[Math.floor(this.rng() * this.modes.length)];
  }

  private ask(): void {
    const item = this.scheduler ? this.scheduler.next(this.index) : this.order[this.index];
    const [entryId, dir] = item.split(':') as [string, Dir];
    const entry = this.byId.get(entryId)!;
    this.question = buildQuestion(this.list, entry, dir, this.modeFor(item), this.rng);
    const isNew = this.path === 'learn' && this.progressOf(item).box === 0 && !this.introduced.has(entryId);
    this.phase = isNew ? 'intro' : 'question';
  }

  /** The introduction card of a new word was seen. */
  dismissIntro(): void {
    if (this.question) this.introduced.add(this.question.entry.id);
    this.phase = 'question';
  }

  /** A typed answer. `hintShown`/`hintTotal`: letters revealed by the timed hint. */
  answerText(typed: string, hintShown = 0, hintTotal = 0): AnswerRecord {
    const q = this.question!;
    const m = matchAnswer(typed, q.accepted, { lang: q.aLang, spelling: this.settings.spelling, articles: this.settings.articles }, q.others.map((o) => o.text));
    if (m.kind === 'exact') return this.finish('right', typed, hintShown, hintTotal);
    if (m.kind === 'typo') return this.finish('typo', typed, hintShown, hintTotal, { form: m.form });
    const other = m.other ? q.others.find((o) => o.text === m.other) : undefined;
    return this.finish('wrong', typed, 0, 0, { other });
  }

  /** A multiple-choice answer. `hintShown`/`hintTotal`: wrong options faded out by the timed hint. */
  answerOption(option: string, hintShown = 0, hintTotal = 0): AnswerRecord {
    const kind = isRightOption(this.question!, option) ? 'right' : 'wrong';
    return this.finish(kind, option, hintShown, hintTotal);
  }

  /** The timed hint showed the whole answer. */
  reveal(): AnswerRecord {
    return this.finish('revealed', '', 1, 1);
  }

  skip(): AnswerRecord | null {
    if (this.skipsLeft <= 0) return null;
    this.skipsLeft--;
    return this.finish('skipped', '', 0, 0);
  }

  private finish(kind: ResultKind, typed: string, hintShown: number, hintTotal: number, extra: Partial<AnswerRecord> = {}): AnswerRecord {
    const q = this.question!;
    const key = progressKey(this.list.id, q.entry.id, q.dir);
    const before = this.config.progress.get(key);
    const good = kind === 'right' || kind === 'typo';
    const hinted = good && hintShown > 0;
    const outcome: Outcome = good ? (hinted ? 'hinted' : 'right') : 'wrong';
    const after = this.config.progress.record(key, outcome);

    let coins = 0;
    let bonus = 0;
    if (good) {
      coins = answerCoins({ mode: q.mode, before, typo: kind === 'typo', hint: hintFactor(hintShown, hintTotal) });
      if (!hinted) {
        this.streak++;
        bonus = streakBonus(this.streak);
        this.bestStreak = Math.max(this.bestStreak, this.streak);
      }
    } else {
      this.streak = 0;
      this.scheduler?.scheduleRetry(`${q.entry.id}:${q.dir}`, this.index);
    }
    this.coins += coins + bonus;
    const record: AnswerRecord = { q, kind, typed, hinted, coins, streakBonus: bonus, before, after, ...extra };
    this.records.push(record);
    this.last = record;
    this.phase = 'feedback';
    return record;
  }

  /** On to the next question, or the end. */
  next(): void {
    this.index++;
    if (this.index >= this.total) {
      this.phase = 'done';
      this.question = null;
    } else this.ask();
  }

  stop(): void {
    this.stopped = true;
    this.phase = 'done';
    this.question = null;
  }

  get rightCount(): number {
    return this.records.filter((r) => r.kind === 'right' || r.kind === 'typo').length;
  }

  /** Test grade (1–10). */
  get grade(): number {
    return grade(this.rightCount, this.total);
  }

  /** Entries answered wrong at least once (each once), for "practise these words". */
  get mistakes(): AnswerRecord[] {
    const seen = new Set<string>();
    const out: AnswerRecord[] = [];
    for (const r of this.records) {
      if (r.kind === 'right' || (r.kind === 'typo' && this.path === 'learn') || seen.has(r.q.entry.id)) continue;
      seen.add(r.q.entry.id);
      out.push(r);
    }
    return out;
  }
}
