/** A flying bullet. */
export interface Bullet {
  x: number;
  y: number;
}

/**
 * Moves every bullet to the right and drops the ones that have flown off the screen.
 * `deltaMs` is how much time passed since the last frame.
 */
export function moveBullets(
  bullets: readonly Bullet[],
  speed: number,
  deltaMs: number,
  screenWidth: number,
): Bullet[] {
  if (speed <= 0) {
    throw new RangeError('Bullet speed must be positive');
  }
  const step = (speed * deltaMs) / 1000;
  return bullets.map((b) => ({ x: b.x + step, y: b.y })).filter((b) => b.x < screenWidth);
}
