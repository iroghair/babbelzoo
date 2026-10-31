// Shared data types (PLAN.md section 9, "Data model").

/** Interface language. */
export type UiLang = 'nl' | 'en';

/** Language codes a word list side can have. */
export type WordLang = 'en' | 'nl' | 'de' | 'fr' | 'es';

/** 'ab' = question in side A, answer in side B; 'ba' = the other way round. */
export type Dir = 'ab' | 'ba';

/** Direction setting: one direction or a random one per question. */
export type DirSetting = Dir | 'both';

export type Mode = 'choose4' | 'choose8' | 'type';

export interface Side {
  /** The word as shown, e.g. "(to) walk". Brackets mark optional parts when typing. */
  text: string;
  /** Other answers that also count as right ("big / large"). */
  alts: string[];
  /** Shown with the question, never typed ("bank [river]"). */
  hint?: string;
}

export interface Entry {
  id: string;
  a: Side;
  b: Side;
}

export interface WordList {
  id: string;
  name: string;
  langA: WordLang;
  langB: WordLang;
  entries: Entry[];
  created: number;
  updated: number;
}
