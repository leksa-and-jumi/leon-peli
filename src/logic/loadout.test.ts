import { describe, expect, it } from 'vitest';
import {
  hasNeededItem,
  loadoutOf,
  ownsItem,
  purchaseItem,
  runWithLoadout,
  wearItem,
  type Loadout,
} from './loadout';
import type { RunState } from './save';

const start: Loadout = {
  score: 100,
  lives: 4,
  rifle: false,
  rifleUpgrade: false,
  outfits: ['black'],
  worn: 'black',
  items: [],
  crown: false,
};
const life = { id: 'life', emoji: '❤️', name: '', price: 3 };
const rifle = { id: 'rifle', emoji: '🔫', name: '', price: 15, onlyOnce: true };
const upgrade = {
  id: 'rifleUpgrade',
  emoji: '⚡',
  name: '',
  price: 30,
  onlyOnce: true,
  needs: 'rifle',
};
const camo = { id: 'camo', emoji: '🪖', name: '', price: 20, onlyOnce: true, outfit: 'camo' };
const poison = { id: 'poison', emoji: '🧪', name: '', price: 200, onlyOnce: true };
const gold = {
  id: 'gold',
  emoji: '👑',
  name: '',
  price: 0,
  onlyOnce: true,
  outfit: 'gold',
  needs: 'crown',
};

describe('the shop', () => {
  it('sells a life, paid with points', () => {
    expect(purchaseItem(start, life)).toMatchObject({ score: 97, lives: 5 });
  });

  it('sells the rifle once, and the upgrade only after it', () => {
    expect(hasNeededItem(start, upgrade)).toBe(false);
    const withRifle = purchaseItem(start, rifle);
    expect(withRifle?.rifle).toBe(true);
    expect(withRifle && ownsItem(withRifle, rifle)).toBe(true);
    expect(withRifle && purchaseItem(withRifle, rifle)).toBeNull();
    expect(withRifle && hasNeededItem(withRifle, upgrade)).toBe(true);
  });

  it('puts bought clothes on right away, and lets you change back', () => {
    const inCamo = purchaseItem(start, camo);
    expect(inCamo).toMatchObject({ worn: 'camo', score: 80 });
    expect(inCamo && wearItem(inCamo, { ...camo, id: 'black', outfit: 'black' }).worn).toBe(
      'black',
    );
  });

  it('will not sell what you cannot afford', () => {
    expect(purchaseItem(start, poison)).toBeNull();
  });

  it('gives the golden suit only with the crown', () => {
    expect(hasNeededItem(start, gold)).toBe(false);
    expect(hasNeededItem({ ...start, crown: true }, gold)).toBe(true);
  });
});

describe('saved games and the shop', () => {
  const run: RunState = {
    score: 50,
    earned: 60,
    lives: 3,
    enemyCount: 4,
    playerX: 70,
    ownedOutfits: ['black'],
    wornOutfit: 'black',
    ownedItems: [],
    stage: 2,
    stageSeed: 5,
    keysFound: [],
  };

  it('reads the loadout from a saved game, with gold when the crown is found', () => {
    const l = loadoutOf(run, { rifle: true, rifleUpgrade: false, deaths: 0 }, true);
    expect(l).toMatchObject({ score: 50, lives: 3, rifle: true, crown: true });
    expect(l.outfits).toContain('gold');
  });

  it('writes the shop changes back into the saved game', () => {
    const l = purchaseItem(
      loadoutOf(run, { rifle: false, rifleUpgrade: false, deaths: 0 }, false),
      camo,
    );
    expect(l && runWithLoadout(run, l)).toMatchObject({
      score: 30,
      wornOutfit: 'camo',
      ownedOutfits: ['black', 'camo'],
      stage: 2,
    });
  });
});
