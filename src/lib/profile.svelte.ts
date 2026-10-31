// Players and everything that belongs to one player: wallet, food, animals, house, settings,
// list choices and learning progress (PLAN.md 6). Stored in localStorage per player.
import { MASTERED_BOX, NEW_PROGRESS, updateProgress, type ItemProgress, type Outcome } from './scheduler';
import type { HintSpeed } from './hints';
import type { ProgressStore, SessionSettings } from './session.svelte';
import { newId, readJson, removeKey, writeJson } from './storage';
import { DEFAULT_SETUP, type Dir, type ListSetup, type WordList } from './types';

export interface Player {
  id: string;
  name: string;
  avatar: string;
}

export const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄', '🐢', '🦉', '🐬', '🐨', '🐧', '🦖', '🐯', '🐰', '🦒', '🐝'];

export interface Wallet {
  coins: number;
  /** All coins ever earned. */
  earned: number;
  food: number;
  dayStreak: number;
  /** "YYYY-MM-DD" of the last finished session. */
  lastDay: string;
}

export type RoomId = 'living' | 'garden' | 'pond' | 'attic';

export interface Owned {
  id: string;
  animalId: string;
  name: string;
  roomId: RoomId;
  /** Position in the room, in % of its width and height. */
  x: number;
  y: number;
  bought: number;
  /** Days ("YYYY-MM-DD") this animal was fed. Grown up after 5. */
  fedDays: string[];
}

export interface Milestones {
  bestGrade: number;
  /** Lists where every word was mastered at some point. */
  masteredLists: string[];
  longestDayStreak: number;
}

export interface ProfileData {
  wallet: Wallet;
  owned: Owned[];
  rooms: RoomId[];
  milestones: Milestones;
  settings: SessionSettings;
  setups: Record<string, ListSetup>;
  lastListId: string;
}

export const DEFAULT_SETTINGS: SessionSettings = {
  spelling: 'lenient',
  articles: 'optional',
  hintSpeed: 'normal' as HintSpeed,
  copyAfterWrong: true,
  testFeedback: 'each',
};

function emptyProfile(): ProfileData {
  return {
    wallet: { coins: 0, earned: 0, food: 0, dayStreak: 0, lastDay: '' },
    owned: [],
    rooms: ['living'],
    milestones: { bestGrade: 0, masteredLists: [], longestDayStreak: 0 },
    settings: { ...DEFAULT_SETTINGS },
    setups: {},
    lastListId: '',
  };
}

function loadProfile(id: string): ProfileData {
  const saved = readJson<Partial<ProfileData>>(`profile.${id}`, {});
  const base = emptyProfile();
  return {
    ...base,
    ...saved,
    wallet: { ...base.wallet, ...saved.wallet },
    milestones: { ...base.milestones, ...saved.milestones },
    settings: { ...base.settings, ...saved.settings },
  };
}

/* ───── players ───── */

interface PlayersState {
  list: Player[];
  currentId: string;
}

const savedPlayers = readJson<PlayersState>('players', { list: [], currentId: '' });

export const players: PlayersState = $state(savedPlayers);

/** The current player's data. Replaced as a whole when another player is chosen. */
export const profile: { data: ProfileData } = $state({ data: loadProfile(savedPlayers.currentId || 'none') });

$effect.root(() => {
  $effect(() => writeJson('players', $state.snapshot(players)));
  $effect(() => {
    const data = $state.snapshot(profile.data);
    if (players.currentId) writeJson(`profile.${players.currentId}`, data);
  });
});

export function currentPlayer(): Player | undefined {
  return players.list.find((p) => p.id === players.currentId);
}

export function selectPlayer(id: string): void {
  players.currentId = id;
  profile.data = loadProfile(id);
}

export function addPlayer(name: string, avatar: string): Player {
  const p = { id: newId(), name: name.trim() || 'Speler', avatar };
  players.list.push(p);
  selectPlayer(p.id);
  return p;
}

export function updatePlayer(id: string, name: string, avatar: string): void {
  const p = players.list.find((x) => x.id === id);
  if (p) Object.assign(p, { name: name.trim() || p.name, avatar });
}

export function removePlayer(id: string): void {
  players.list = players.list.filter((p) => p.id !== id);
  removeKey(`profile.${id}`);
  removeKey(`progress.${id}`);
  progressCache.delete(id);
  if (players.currentId === id) {
    players.currentId = '';
    profile.data = emptyProfile();
  }
}

/** A short peek at another player's data (coins on the profile screen). */
export function peekProfile(id: string): ProfileData {
  return id === players.currentId ? profile.data : loadProfile(id);
}

/* ───── progress: `${listId}:${entryId}:${dir}` → ItemProgress ───── */

type ProgressMap = Record<string, ItemProgress>;
const progressCache = new Map<string, ProgressMap>();
/** Bumped on every recorded answer, so derived progress views update. */
export const progressVersion = $state({ n: 0 });

function progressOf(playerId: string): ProgressMap {
  let map = progressCache.get(playerId);
  if (!map) {
    map = readJson<ProgressMap>(`progress.${playerId}`, {});
    progressCache.set(playerId, map);
  }
  return map;
}

export function progressStore(playerId = players.currentId): ProgressStore {
  return {
    get: (key) => progressOf(playerId)[key] ?? NEW_PROGRESS,
    record: (key: string, outcome: Outcome) => {
      const map = progressOf(playerId);
      const next = updateProgress(map[key] ?? NEW_PROGRESS, outcome);
      map[key] = next;
      writeJson(`progress.${playerId}`, map);
      progressVersion.n++;
      return next;
    },
  };
}

export function exportProgress(playerId: string): ProgressMap {
  return { ...progressOf(playerId) };
}

export function importProgress(playerId: string, data: ProgressMap): void {
  progressCache.set(playerId, { ...data });
  writeJson(`progress.${playerId}`, data);
}

/* ───── list progress ───── */

export interface ListStats {
  total: number;
  known: number;
  learning: number;
  fresh: number;
}

/** Per entry: known = mastered in every practised direction; new = never asked. */
export function listStats(list: WordList, playerId = players.currentId): ListStats {
  void progressVersion.n;
  const setup = setupFor(list.id);
  const dirs: Dir[] = setup.dir === 'both' ? ['ab', 'ba'] : [setup.dir];
  const map = progressOf(playerId);
  const stats: ListStats = { total: list.entries.length, known: 0, learning: 0, fresh: 0 };
  for (const e of list.entries) {
    const boxes = dirs.map((d) => (map[`${list.id}:${e.id}:${d}`] ?? NEW_PROGRESS).box);
    if (Math.min(...boxes) >= MASTERED_BOX) stats.known++;
    else if (Math.max(...boxes) === 0) stats.fresh++;
    else stats.learning++;
  }
  return stats;
}

export function setupFor(listId: string): ListSetup {
  return { ...DEFAULT_SETUP, ...profile.data.setups[listId] };
}

/** "Ready for the test?" from 80 % mastered. */
export const READY_SHARE = 0.8;
