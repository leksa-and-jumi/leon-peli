/** Something you can buy in the shop with ⭐ points. */
export interface ShopItem {
  id: string;
  emoji: string;
  /** English and Finnish name. */
  name: string;
  price: number;
  /** Not for sale yet: coming in a later version of the game. */
  comingSoon?: boolean;
  /** Can be bought only once, like a gun. */
  onlyOnce?: boolean;
  /** Clothes: which outfit you get. */
  outfit?: string;
}

export type BuyResult =
  | { ok: true; score: number }
  | { ok: false; reason: 'not-enough-points' | 'not-for-sale' | 'already-owned' };

/**
 * Pay for an item with points. You can't buy if you don't have enough,
 * or if it's a one-time item you already own.
 */
export function buy(score: number, item: ShopItem, owned = false): BuyResult {
  if (item.comingSoon) return { ok: false, reason: 'not-for-sale' };
  if (item.onlyOnce && owned) return { ok: false, reason: 'already-owned' };
  if (score < item.price) return { ok: false, reason: 'not-enough-points' };
  return { ok: true, score: score - item.price };
}

/** Can the player afford this item right now? */
export function canAfford(score: number, item: ShopItem, owned = false): boolean {
  return buy(score, item, owned).ok;
}
