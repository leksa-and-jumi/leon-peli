import type { EnemyKind } from './spawn';

export type Difficulty = 'easy' | 'normal' | 'hard';

/** A special enemy that comes every `every`-th time. `lives` changes how tough it is. */
export interface SpecialEnemy {
  every: number;
  kind: Exclude<EnemyKind, 'white'>;
  lives?: number;
}

/** What changes with the difficulty. */
export interface DifficultyRules {
  /** Special enemies, most important first: the first one that fits wins. */
  specials: readonly SpecialEnemy[];
  /** Hits it takes to break a white stick figure. */
  whiteLives: number;
}

/** Which enemy number `enemyNumber` (counted from 1) is in this difficulty. */
export function enemyFor(
  rules: DifficultyRules,
  enemyNumber: number,
): { kind: EnemyKind; lives?: number } {
  for (const special of rules.specials) {
    if (special.every < 1) throw new RangeError('every must be at least 1');
    if (enemyNumber > 0 && enemyNumber % special.every === 0) {
      return special.lives === undefined
        ? { kind: special.kind }
        : { kind: special.kind, lives: special.lives };
    }
  }
  return { kind: 'white', lives: rules.whiteLives };
}
