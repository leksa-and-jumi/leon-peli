import type { Weapon } from '../config';

/** What a bullet from the shop can do. */
export interface BulletPowers {
  /** Poisons the enemy: it keeps losing lives slowly. */
  poison: boolean;
  /** Explodes inside the enemy and takes several lives at once. */
  explosive: boolean;
}

/** Poison bullets fit the pistol and the rifle. */
const POISON_GUNS: readonly Weapon[] = ['pistol', 'rifle'];
/** Exploding bullets fit the rifle and the troll's small gun. */
const EXPLOSIVE_GUNS: readonly Weapon[] = ['rifle', 'smallGun'];
/** The golden gun from the treasure always shoots exploding bullets. */
const ALWAYS_EXPLOSIVE: readonly Weapon[] = ['goldGun'];

/** What the bullets from `weapon` do, with the bullets you've bought. */
export function bulletPowers(
  weapon: Weapon,
  owned: { poison: boolean; explosive: boolean },
): BulletPowers {
  return {
    poison: owned.poison && POISON_GUNS.includes(weapon),
    explosive:
      ALWAYS_EXPLOSIVE.includes(weapon) || (owned.explosive && EXPLOSIVE_GUNS.includes(weapon)),
  };
}

/**
 * A poisoned enemy loses a life every `everyMs`. Returns whether it loses one now,
 * and when the next one is due.
 */
export function poisonStep(
  nextAt: number,
  now: number,
  everyMs: number,
): { hurt: boolean; nextAt: number } {
  if (now < nextAt) return { hurt: false, nextAt };
  return { hurt: true, nextAt: now + everyMs };
}
