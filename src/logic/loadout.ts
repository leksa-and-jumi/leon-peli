import type { LevelWeapons, RunState } from './save';
import { buy, type ShopItem } from './shop';

/** Everything the shop looks at and changes: points, lives, guns, clothes and bullets. */
export interface Loadout {
  score: number;
  lives: number;
  rifle: boolean;
  rifleUpgrade: boolean;
  outfits: readonly string[];
  worn: string;
  items: readonly string[];
  /** The treasure behind door 10 was found (it gives the golden suit). */
  crown: boolean;
}

/** Things bought for one game, not clothes or guns. */
const GAME_ITEMS: readonly string[] = ['poison', 'explosive'];

/** Do you already have this one-time item? */
export function ownsItem(l: Loadout, item: ShopItem): boolean {
  if (item.id === 'rifle') return l.rifle;
  if (item.id === 'rifleUpgrade') return l.rifleUpgrade;
  if (GAME_ITEMS.includes(item.id)) return l.items.includes(item.id);
  return item.outfit !== undefined && l.outfits.includes(item.outfit);
}

/** Do you have what this item needs first (the rifle for its upgrade, the crown for gold)? */
export function hasNeededItem(l: Loadout, item: ShopItem): boolean {
  if (item.needs === undefined) return true;
  if (item.needs === 'crown') return l.crown;
  return ownsItem(l, { id: item.needs, emoji: '', name: '', price: 0 });
}

/** Buy an item: the new loadout, or null if you can't buy it. Clothes go on right away. */
export function purchaseItem(l: Loadout, item: ShopItem): Loadout | null {
  const result = buy(l.score, item, ownsItem(l, item), hasNeededItem(l, item));
  if (!result.ok) return null;
  let next: Loadout = { ...l, score: result.score };
  if (item.id === 'life') next = { ...next, lives: next.lives + 1 };
  if (item.id === 'rifle') next = { ...next, rifle: true };
  if (item.id === 'rifleUpgrade') next = { ...next, rifleUpgrade: true };
  if (GAME_ITEMS.includes(item.id)) next = { ...next, items: [...next.items, item.id] };
  if (item.outfit !== undefined) {
    next = { ...next, outfits: [...new Set([...next.outfits, item.outfit])], worn: item.outfit };
  }
  return next;
}

/** Put on clothes you own. */
export function wearItem(l: Loadout, item: ShopItem): Loadout {
  if (item.outfit === undefined || !l.outfits.includes(item.outfit)) return l;
  return { ...l, worn: item.outfit };
}

/** The loadout of a saved game on a level. */
export function loadoutOf(run: RunState, weapons: LevelWeapons, crown: boolean): Loadout {
  const outfits = crown ? [...new Set([...run.ownedOutfits, 'gold'])] : run.ownedOutfits;
  return {
    score: run.score,
    lives: run.lives,
    rifle: weapons.rifle,
    rifleUpgrade: weapons.rifleUpgrade,
    outfits,
    worn: run.wornOutfit,
    items: run.ownedItems,
    crown,
  };
}

/** The saved game with the shop's changes in it. */
export function runWithLoadout(run: RunState, l: Loadout): RunState {
  return {
    ...run,
    score: l.score,
    lives: l.lives,
    ownedOutfits: [...l.outfits],
    wornOutfit: l.worn,
    ownedItems: [...l.items],
  };
}
