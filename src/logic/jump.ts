/** A time when a white figure must be up in the air, so a bullet passes under it. */
export interface JumpWindow {
  /** Start rising at this time (ms)... */
  start: number;
  /** ...and stay up until this time (ms). */
  end: number;
}

/**
 * When to be in the air for one bullet: start rising early enough to be at the top
 * when it arrives, and stay up until the whole bullet has passed under.
 * `passWidth` is how far the bullet travels while under the figure.
 */
export function dodgeWindow(
  nowMs: number,
  distance: number,
  bulletSpeed: number,
  passWidth: number,
  riseMs: number,
  marginMs: number,
): JumpWindow {
  if (bulletSpeed <= 0) {
    throw new RangeError('Bullet speed must be positive');
  }
  const arrive = nowMs + (Math.max(distance, 0) / bulletSpeed) * 1000;
  const leave = arrive + (passWidth / bulletSpeed) * 1000;
  return { start: arrive - riseMs - marginMs, end: leave + marginMs };
}

/** Should the figure be going up (or staying up) right now? */
export function wantsToBeUp(windows: readonly JumpWindow[], nowMs: number): boolean {
  return windows.some((w) => w.start <= nowMs && nowMs <= w.end);
}

/**
 * How high the feet are next frame: rising toward `height` while wanting to be up,
 * otherwise falling back to the ground. Takes `riseMs` to go all the way.
 */
export function nextLift(
  lift: number,
  wantUp: boolean,
  deltaMs: number,
  height: number,
  riseMs: number,
): number {
  const step = (height * deltaMs) / riseMs;
  return wantUp ? Math.min(lift + step, height) : Math.max(lift - step, 0);
}
