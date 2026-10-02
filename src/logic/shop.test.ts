import { describe, expect, it } from 'vitest';
import { buy, canAfford, type ShopItem } from './shop';

const life: ShopItem = { id: 'life', emoji: '❤️', name: 'Extra life', price: 3 };
const hat: ShopItem = { id: 'hat', emoji: '🎩', name: 'Hat', price: 5, comingSoon: true };
const rifle: ShopItem = { id: 'rifle', emoji: '🔫', name: 'Rifle', price: 15, onlyOnce: true };

describe('buy', () => {
  it('takes the price from the points', () => {
    expect(buy(5, life)).toEqual({ ok: true, score: 2 });
  });

  it('works with exactly enough points', () => {
    expect(buy(3, life)).toEqual({ ok: true, score: 0 });
  });

  it('says no when there are not enough points', () => {
    expect(buy(2, life)).toEqual({ ok: false, reason: 'not-enough-points' });
  });

  it('does not sell things that are coming later', () => {
    expect(buy(100, hat)).toEqual({ ok: false, reason: 'not-for-sale' });
  });

  it('sells a one-time item once', () => {
    expect(buy(20, rifle, false)).toEqual({ ok: true, score: 5 });
    expect(buy(20, rifle, true)).toEqual({ ok: false, reason: 'already-owned' });
  });

  it('lets you buy lives again and again', () => {
    expect(buy(10, life, true)).toEqual({ ok: true, score: 7 });
  });
});

describe('canAfford', () => {
  it('is true only when buying would work', () => {
    expect(canAfford(3, life)).toBe(true);
    expect(canAfford(2, life)).toBe(false);
  });
});
