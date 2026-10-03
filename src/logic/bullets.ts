/** A flying bullet. `x`/`y` is its middle. `direction` 1 flies right, -1 flies left. */
export interface Bullet {
  x: number;
  y: number;
  direction: 1 | -1;
  /** How much it goes down for every step forward (negative = up). Straight if not given. */
  slope?: number;
}

/** Which way a bullet moves for one pixel of flying: forward and down parts. */
export function bulletHeading(bullet: Bullet): { x: number; y: number } {
  const slope = bullet.slope ?? 0;
  const length = Math.hypot(1, slope);
  return { x: bullet.direction / length, y: slope / length };
}

/** A box on the screen. */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The whole screen as an area, when the view doesn't move. */
export function screenArea(width: number, height: number): Box {
  return { left: 0, right: width, top: 0, bottom: height };
}

/**
 * Moves every bullet the way it flies and drops the ones that have left the screen.
 * `deltaMs` is how much time passed since the last frame.
 */
export function moveBullets(
  bullets: readonly Bullet[],
  speed: number,
  deltaMs: number,
  /** The part of the world on the screen: bullets that fly out of it are gone. */
  area: Box,
): Bullet[] {
  if (speed <= 0) {
    throw new RangeError('Bullet speed must be positive');
  }
  const step = (speed * deltaMs) / 1000;
  return bullets
    .map((b) => {
      const heading = bulletHeading(b);
      return { ...b, x: b.x + step * heading.x, y: b.y + step * heading.y };
    })
    .filter((b) => b.x > area.left && b.x < area.right && b.y > area.top && b.y < area.bottom);
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
