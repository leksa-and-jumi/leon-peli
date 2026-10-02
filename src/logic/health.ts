/** How full a health bar is: 1 = all lives left, 0 = none. */
export function healthFraction(lives: number, maxLives: number): number {
  if (maxLives <= 0) {
    throw new RangeError('maxLives must be positive');
  }
  return Math.min(Math.max(lives / maxLives, 0), 1);
}
