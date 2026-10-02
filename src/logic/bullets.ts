/** A flying bullet. `x`/`y` is its middle. `direction` 1 flies right, -1 flies left. */
export interface Bullet {
  x: number;
  y: number;
  direction: 1 | -1;
}

/** A box on the screen. */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Moves every bullet the way it flies and drops the ones that have left the screen.
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
  return bullets
    .map((b) => ({ ...b, x: b.x + step * b.direction }))
    .filter((b) => b.x > 0 && b.x < screenWidth);
}

/** Does a bullet of this size touch the box? */
export function bulletHits(
  bullet: Bullet,
  size: { width: number; height: number },
  box: Box,
): boolean {
  return (
    bullet.x + size.width / 2 >= box.left &&
    bullet.x - size.width / 2 <= box.right &&
    bullet.y + size.height / 2 >= box.top &&
    bullet.y - size.height / 2 <= box.bottom
  );
}
