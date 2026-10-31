import { describe, expect, it } from 'vitest';
import { animalById } from '../src/data/animals';
import { buyAnimal, buyRoom, canBuy, feed, freeSlots, isAdult, isUnlocked, moveAnimal } from '../src/lib/house';
import type { ProfileData } from '../src/lib/profile.svelte';
import { DEFAULT_SETTINGS } from '../src/lib/profile.svelte';

function data(coins = 10_000): ProfileData {
  return {
    wallet: { coins, earned: coins, food: 0, dayStreak: 0, lastDay: '' },
    owned: [],
    rooms: ['living'],
    milestones: { bestGrade: 0, masteredLists: [], longestDayStreak: 0 },
    settings: DEFAULT_SETTINGS,
    setups: {},
    lastListId: '',
  };
}
const A = (id: string) => animalById(id)!;

describe('shop', () => {
  it('buys an animal and pays for it', () => {
    const d = data(100);
    expect(canBuy(d, A('hamster'))).toEqual({ ok: false, reason: 'coins' });
    const o = buyAnimal(d, A('mouse'));
    expect(o).toMatchObject({ animalId: 'mouse', name: 'Muis', roomId: 'living' });
    expect(d.wallet.coins).toBe(50);
  });

  it('needs the pond for water animals', () => {
    const d = data();
    expect(canBuy(d, A('fish'))).toEqual({ ok: false, reason: 'pond' });
    expect(buyRoom(d, 'pond')).toBe(true);
    expect(buyAnimal(d, A('fish'))?.roomId).toBe('pond');
    expect(buyRoom(d, 'pond')).toBe(false);
  });

  it('stops when the house is full', () => {
    const d = data();
    for (let i = 0; i < 6; i++) buyAnimal(d, A('mouse'));
    expect(freeSlots(d, 'living')).toBe(0);
    expect(canBuy(d, A('mouse'))).toEqual({ ok: false, reason: 'full' });
    buyRoom(d, 'garden');
    expect(buyAnimal(d, A('mouse'))?.roomId).toBe('garden');
  });

  it('keeps locked animals locked until the milestone', () => {
    const d = data();
    expect(canBuy(d, A('unicorn'))).toEqual({ ok: false, reason: 'locked' });
    d.milestones.bestGrade = 9.2;
    expect(isUnlocked(A('unicorn'), d.milestones)).toBe(true);
    expect(isUnlocked(A('dragon'), d.milestones)).toBe(false);
    d.milestones.longestDayStreak = 7;
    expect(isUnlocked(A('dragon'), d.milestones)).toBe(true);
    d.milestones.masteredLists = ['x'];
    expect(isUnlocked(A('phoenix'), d.milestones)).toBe(true);
  });
});

describe('feeding', () => {
  it('feeds once a day and grows up after 5 days', () => {
    const d = data();
    const o = buyAnimal(d, A('cat'))!;
    expect(feed(d, o.id, '2026-11-01')).toBe('nofood');
    d.wallet.food = 10;
    expect(feed(d, o.id, '2026-11-01')).toBe('fed');
    expect(feed(d, o.id, '2026-11-01')).toBe('already');
    expect(d.wallet.food).toBe(9);
    for (const day of ['02', '03', '04']) feed(d, o.id, `2026-11-${day}`);
    expect(isAdult(o)).toBe(false);
    expect(feed(d, o.id, '2026-11-05')).toBe('grown');
    expect(isAdult(o)).toBe(true);
  });
});

describe('moving', () => {
  it('moves within a room and to rooms where the animal fits', () => {
    const d = data();
    const o = buyAnimal(d, A('dog'))!;
    expect(moveAnimal(d, o.id, 'living', 150, -5)).toBe(true);
    expect([o.x, o.y]).toEqual([92, 18]);
    expect(moveAnimal(d, o.id, 'garden')).toBe(false);
    buyRoom(d, 'garden');
    buyRoom(d, 'pond');
    expect(moveAnimal(d, o.id, 'pond')).toBe(false);
    expect(moveAnimal(d, o.id, 'garden')).toBe(true);
    expect(o.roomId).toBe('garden');
  });
});
