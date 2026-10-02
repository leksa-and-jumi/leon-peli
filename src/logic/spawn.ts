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
