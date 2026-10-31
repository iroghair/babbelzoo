// The animal shop catalogue and the rooms of the house (PLAN.md 5).
import type { RoomId } from '../lib/profile.svelte';

export type Tier = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Lock = 'grade9' | 'streak7' | 'listMastered';

export interface Animal {
  id: string;
  emoji: string;
  nl: string;
  en: string;
  tier: Tier;
  price: number;
  /** Lives in the pond only. */
  water?: boolean;
  /** Locked until a learning milestone. */
  lock?: Lock;
}

export const ANIMALS: Animal[] = [
  { id: 'mouse', emoji: '🐭', nl: 'muis', en: 'mouse', tier: 'common', price: 50 },
  { id: 'chick', emoji: '🐥', nl: 'kuiken', en: 'chick', tier: 'common', price: 60 },
  { id: 'fish', emoji: '🐟', nl: 'vis', en: 'fish', tier: 'common', price: 80, water: true },
  { id: 'frog', emoji: '🐸', nl: 'kikker', en: 'frog', tier: 'common', price: 90 },
  { id: 'rabbit', emoji: '🐰', nl: 'konijn', en: 'rabbit', tier: 'common', price: 100 },
  { id: 'hamster', emoji: '🐹', nl: 'hamster', en: 'hamster', tier: 'common', price: 120 },
  { id: 'cat', emoji: '🐱', nl: 'kat', en: 'cat', tier: 'uncommon', price: 250 },
  { id: 'dog', emoji: '🐶', nl: 'hond', en: 'dog', tier: 'uncommon', price: 300 },
  { id: 'duck', emoji: '🦆', nl: 'eend', en: 'duck', tier: 'uncommon', price: 320, water: true },
  { id: 'pig', emoji: '🐷', nl: 'varken', en: 'pig', tier: 'uncommon', price: 350 },
  { id: 'owl', emoji: '🦉', nl: 'uil', en: 'owl', tier: 'uncommon', price: 400 },
  { id: 'turtle', emoji: '🐢', nl: 'schildpad', en: 'turtle', tier: 'uncommon', price: 450, water: true },
  { id: 'fox', emoji: '🦊', nl: 'vos', en: 'fox', tier: 'rare', price: 700 },
  { id: 'penguin', emoji: '🐧', nl: 'pinguïn', en: 'penguin', tier: 'rare', price: 800 },
  { id: 'panda', emoji: '🐼', nl: 'panda', en: 'panda', tier: 'rare', price: 1000 },
  { id: 'koala', emoji: '🐨', nl: 'koala', en: 'koala', tier: 'rare', price: 1000 },
  { id: 'parrot', emoji: '🦜', nl: 'papegaai', en: 'parrot', tier: 'rare', price: 1100 },
  { id: 'horse', emoji: '🐴', nl: 'paard', en: 'horse', tier: 'rare', price: 1200 },
  { id: 'lion', emoji: '🦁', nl: 'leeuw', en: 'lion', tier: 'legendary', price: 2500 },
  { id: 'elephant', emoji: '🐘', nl: 'olifant', en: 'elephant', tier: 'legendary', price: 3000 },
  { id: 'whale', emoji: '🐋', nl: 'walvis', en: 'whale', tier: 'legendary', price: 4000, water: true },
  { id: 'unicorn', emoji: '🦄', nl: 'eenhoorn', en: 'unicorn', tier: 'legendary', price: 4500, lock: 'grade9' },
  { id: 'dragon', emoji: '🐉', nl: 'draak', en: 'dragon', tier: 'legendary', price: 5000, lock: 'streak7' },
  { id: 'phoenix', emoji: '🐦‍🔥', nl: 'feniks', en: 'phoenix', tier: 'legendary', price: 5000, lock: 'listMastered' },
];

export const TIERS: Tier[] = ['common', 'uncommon', 'rare', 'legendary'];

/** Token background per tier. */
export const TIER_BG: Record<Tier, string> = {
  common: 'var(--leaf-light)',
  uncommon: 'var(--sky-light)',
  rare: 'var(--gold-light)',
  legendary: 'var(--coral-light)',
};

export interface Room {
  id: RoomId;
  icon: string;
  price: number;
  capacity: number;
  /** Only water animals live here (and water animals only live here). */
  water?: boolean;
}

export const ROOMS: Room[] = [
  { id: 'living', icon: '🛋️', price: 0, capacity: 6 },
  { id: 'garden', icon: '🌳', price: 300, capacity: 6 },
  { id: 'pond', icon: '🪷', price: 600, capacity: 6, water: true },
  { id: 'attic', icon: '🪟', price: 1000, capacity: 6 },
];

export const animalById = (id: string) => ANIMALS.find((a) => a.id === id);
export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;
