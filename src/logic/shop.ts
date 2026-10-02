/** Something you can buy in the shop with ⭐ points. */
export interface ShopItem {
  id: string;
  emoji: string;
  /** English and Finnish name. */
  name: string;
  price: number;
  /** Not for sale yet: coming in a later version of the game. */
  comingSoon?: boolean;
}

export type BuyResult =
  { ok: true; score: number } | { ok: false; reason: 'not-enough-points' | 'not-for-sale' };

/** Pay for an item with points. You can't buy if you don't have enough. */
export function buy(score: number, item: ShopItem): BuyResult {
  if (item.comingSoon) return { ok: false, reason: 'not-for-sale' };
  if (score < item.price) return { ok: false, reason: 'not-enough-points' };
  return { ok: true, score: score - item.price };
}

/** Can the player afford this item right now? */
export function canAfford(score: number, item: ShopItem): boolean {
  return buy(score, item).ok;
}
