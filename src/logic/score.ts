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
