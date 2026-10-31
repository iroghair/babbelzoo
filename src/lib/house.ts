// Buying animals and rooms, placing animals, and feeding them (PLAN.md 5).
import { animalById, roomById, ROOMS, type Animal } from '../data/animals';
import { dayKey } from './coins';
import type { Milestones, Owned, ProfileData, RoomId } from './profile.svelte';
import { newId } from './storage';

/** Days of feeding until a baby animal is grown up. */
export const GROW_DAYS = 5;

export function isUnlocked(a: Animal, ms: Milestones): boolean {
  if (a.lock === 'grade9') return ms.bestGrade >= 9;
  if (a.lock === 'streak7') return ms.longestDayStreak >= 7;
  if (a.lock === 'listMastered') return ms.masteredLists.length > 0;
  return true;
}

/** Water animals live in the pond, and only there. */
export function fitsIn(a: Animal, room: RoomId): boolean {
  return !!a.water === !!roomById(room).water;
}

export function animalsIn(data: ProfileData, room: RoomId): Owned[] {
  return data.owned.filter((o) => o.roomId === room);
}

export function freeSlots(data: ProfileData, room: RoomId): number {
  return roomById(room).capacity - animalsIn(data, room).length;
}

/** The first bought room where this animal fits and there is space. */
export function roomFor(data: ProfileData, a: Animal): RoomId | null {
  return data.rooms.find((r) => fitsIn(a, r) && freeSlots(data, r) > 0) ?? null;
}

export type BuyCheck = { ok: true; room: RoomId } | { ok: false; reason: 'locked' | 'coins' | 'pond' | 'full' };

export function canBuy(data: ProfileData, a: Animal): BuyCheck {
  if (!isUnlocked(a, data.milestones)) return { ok: false, reason: 'locked' };
  if (a.water && !data.rooms.includes('pond')) return { ok: false, reason: 'pond' };
  const room = roomFor(data, a);
  if (!room) return { ok: false, reason: 'full' };
  if (data.wallet.coins < a.price) return { ok: false, reason: 'coins' };
  return { ok: true, room };
}

/** Spots spread over the room (in %), used first-free with a little jitter. */
const SPOTS = [
  [22, 42],
  [50, 38],
  [78, 44],
  [32, 72],
  [62, 70],
  [86, 74],
  [12, 70],
  [68, 30],
];

export function freeSpot(data: ProfileData, room: RoomId, rng = Math.random): { x: number; y: number } {
  const taken = animalsIn(data, room);
  const far = (x: number, y: number) => taken.every((o) => Math.hypot(o.x - x, o.y - y) > 12);
  const spot = SPOTS.find(([x, y]) => far(x, y)) ?? SPOTS[Math.floor(rng() * SPOTS.length)];
  return { x: spot[0] + (rng() * 6 - 3), y: spot[1] + (rng() * 6 - 3) };
}

export function buyAnimal(data: ProfileData, a: Animal, name = ''): Owned | null {
  const check = canBuy(data, a);
  if (!check.ok) return null;
  data.wallet.coins -= a.price;
  const owned: Owned = {
    id: newId(),
    animalId: a.id,
    name: name || a.nl.charAt(0).toUpperCase() + a.nl.slice(1),
    roomId: check.room,
    ...freeSpot(data, check.room),
    bought: Date.now(),
    fedDays: [],
  };
  data.owned.push(owned);
  return owned;
}

export function canBuyRoom(data: ProfileData, room: RoomId): boolean {
  return !data.rooms.includes(room) && data.wallet.coins >= roomById(room).price;
}

export function buyRoom(data: ProfileData, room: RoomId): boolean {
  if (!canBuyRoom(data, room)) return false;
  data.wallet.coins -= roomById(room).price;
  data.rooms.push(room);
  data.rooms.sort((a, b) => ROOMS.findIndex((r) => r.id === a) - ROOMS.findIndex((r) => r.id === b));
  return true;
}

export const isFedToday = (o: Owned, today = dayKey()) => o.fedDays.includes(today);
export const isAdult = (o: Owned) => o.fedDays.length >= GROW_DAYS;

export type FeedResult = 'fed' | 'grown' | 'already' | 'nofood';

/** One portion of food for one animal, once a day. Five different days → grown up. */
export function feed(data: ProfileData, ownedId: string, today = dayKey()): FeedResult {
  const o = data.owned.find((x) => x.id === ownedId);
  if (!o) return 'already';
  if (isFedToday(o, today)) return 'already';
  if (data.wallet.food <= 0) return 'nofood';
  data.wallet.food--;
  o.fedDays.push(today);
  return o.fedDays.length === GROW_DAYS ? 'grown' : 'fed';
}

export function moveAnimal(data: ProfileData, ownedId: string, room: RoomId, x?: number, y?: number): boolean {
  const o = data.owned.find((v) => v.id === ownedId);
  const a = o && animalById(o.animalId);
  if (!o || !a || !fitsIn(a, room) || !data.rooms.includes(room)) return false;
  if (room !== o.roomId) {
    if (freeSlots(data, room) <= 0) return false;
    const spot = freeSpot(data, room);
    o.roomId = room;
    o.x = spot.x;
    o.y = spot.y;
  }
  if (x !== undefined && y !== undefined) {
    o.x = Math.min(92, Math.max(8, x));
    o.y = Math.min(86, Math.max(18, y));
  }
  return true;
}
