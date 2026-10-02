/**
 * How long to wait before jumping so the highest point of the jump comes
 * exactly when the bullet arrives. 0 means jump right away.
 */
export function jumpDelayMs(distance: number, bulletSpeed: number, riseMs: number): number {
  if (bulletSpeed <= 0) {
    throw new RangeError('Bullet speed must be positive');
  }
  const arrivalMs = (Math.max(distance, 0) / bulletSpeed) * 1000;
  return Math.max(arrivalMs - riseMs, 0);
}
