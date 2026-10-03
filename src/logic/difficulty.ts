import type { EnemyKind } from './spawn';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'superHard';

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
}

/** Which enemy number `enemyNumber` (counted from 1) is in this difficulty. */
export function enemyFor(rules: DifficultyRules, enemyNumber: number): EnemyPick {
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
