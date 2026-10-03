/** Pure score helpers, kept free of Phaser so they are easy to test. */
export function addPoints(score: number, points: number): number {
  if (!Number.isFinite(points) || points < 0) {
    throw new RangeError(`points must be a non-negative number, got ${points}`);
  }
  return score + points;
}

export function formatScore(score: number): string {
  return `⭐ ${score}`;
}

/** The best score so far, in both languages. */
export function formatBest(best: number): string {
  return `🏆 Best / Ennätys: ${String(best)}`;
}
