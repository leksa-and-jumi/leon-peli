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
