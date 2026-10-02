/**
 * Is this enemy the boss? Enemies are counted from 1, and every
 * `bossEvery`-th one is the boss (15th, 30th, 45th...).
 */
export function isBossTurn(enemyNumber: number, bossEvery: number): boolean {
  if (bossEvery < 1) {
    throw new RangeError('bossEvery must be at least 1');
  }
  return enemyNumber > 0 && enemyNumber % bossEvery === 0;
}

export type EnemyKind = 'white' | 'boss' | 'giant';

/**
 * Which kind of enemy number `enemyNumber` is (counted from 1).
 * Every `giantEvery`-th is a giant; otherwise every `bossEvery`-th is the axe guy.
 */
export function enemyKind(enemyNumber: number, bossEvery: number, giantEvery: number): EnemyKind {
  if (isBossTurn(enemyNumber, giantEvery)) return 'giant';
  if (isBossTurn(enemyNumber, bossEvery)) return 'boss';
  return 'white';
}
