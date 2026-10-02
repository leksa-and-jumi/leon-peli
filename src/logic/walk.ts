/**
 * Moves `x` toward `targetX` at `speed` pixels per second, and stops exactly on the target.
 */
export function walkTowards(x: number, targetX: number, speed: number, deltaMs: number): number {
  if (speed < 0) {
    throw new RangeError('Speed must not be negative');
  }
  const step = (speed * deltaMs) / 1000;
  if (Math.abs(targetX - x) <= step) return targetX;
  return x + Math.sign(targetX - x) * step;
}

/**
 * Where a follower should stand next to the player: on the side it's already on,
 * `reach` away, and kept between `minX` and `maxX`.
 */
export function followTarget(
  followerX: number,
  playerX: number,
  reach: number,
  minX: number,
  maxX: number,
): number {
  const side = followerX >= playerX ? 1 : -1;
  return Math.min(Math.max(playerX + side * reach, minX), maxX);
}

/** Which way to face: toward the target if walking, otherwise toward the player. */
export function facingToward(fromX: number, toX: number, fallback: 1 | -1): 1 | -1 {
  if (toX > fromX) return 1;
  if (toX < fromX) return -1;
  return fallback;
}
