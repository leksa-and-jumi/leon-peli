import type { EnemyKind } from './spawn';

export type Difficulty = 'test' | 'easy' | 'normal' | 'hard' | 'superHard' | 'story';

/** An enemy and how many hits it takes (none = its usual number). */
export interface EnemyPick {
  kind: EnemyKind;
  lives?: number;
}

/** A special enemy that comes every `every`-th time. */
export interface SpecialEnemy extends EnemyPick {
  every: number;
}

/** What changes with the difficulty. */
export interface DifficultyRules {
  /** Special enemies, most important first: the first one that fits wins. */
  specials: readonly SpecialEnemy[];
  /** Who comes when no special one does. */
  regular: EnemyPick;
  /** If given, enemies just take turns in this order, over and over. */
  cycle?: readonly EnemyPick[];
  /** You can't lose lives (for testing). */
  invincible?: boolean;
  /** The white ones aim their guns at you wherever you go. */
  aimAtPlayer?: boolean;
  /** Doors and hidden keys take you from stage to stage. */
  stages?: boolean;
  /** The machine-gun boss is the fierce one (chases, sees crouchers, lets loose the brutes). */
  fierceGunner?: boolean;
  /** No enemies come by themselves: you call them in with buttons (the test level). */
  manualSpawns?: boolean;
  /** No treasure behind the last door. */
  noTreasure?: boolean;
  /** At most this many enemies at once (fewer for a duel). */
  maxAtOnce?: number;
}

/** Which enemy number `enemyNumber` (counted from 1) is in this difficulty. */
export function enemyFor(rules: DifficultyRules, enemyNumber: number): EnemyPick {
  if (rules.cycle && rules.cycle.length > 0) {
    const turn = rules.cycle[(Math.max(enemyNumber, 1) - 1) % rules.cycle.length];
    if (turn) return turn;
  }
  for (const special of rules.specials) {
    if (special.every < 1) throw new RangeError('every must be at least 1');
    if (enemyNumber > 0 && enemyNumber % special.every === 0) {
      return special.lives === undefined
        ? { kind: special.kind }
        : { kind: special.kind, lives: special.lives };
    }
  }
  return rules.regular;
}

/** Do enemies come by themselves on this level (not on the test level)? */
export function autoSpawns(rules: DifficultyRules): boolean {
  return rules.manualSpawns !== true;
}

/** Is there a treasure behind the last door on this level? */
export function hasTreasure(rules: DifficultyRules): boolean {
  return rules.noTreasure !== true;
}
