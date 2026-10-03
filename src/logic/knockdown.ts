/** Where a knocked-down figure is: how far tipped over (0 = up, 1 = flat on the back). */
export interface KnockdownState {
  tip: number;
  /** Which part: falling over, lying still, or getting back up. */
  phase: 'fall' | 'lie' | 'rise' | 'done';
}

export interface KnockdownTimes {
  fallMs: number;
  lieMs: number;
  riseMs: number;
}

/**
 * Crashing into someone: fall over onto your back, lie there for a moment,
 * then get back up by yourself. `elapsedMs` is the time since the crash.
 */
export function knockdownAt(elapsedMs: number, times: KnockdownTimes): KnockdownState {
  const { fallMs, lieMs, riseMs } = times;
  if (elapsedMs < fallMs) {
    // Falls faster and faster, like a real fall
    const t = Math.max(elapsedMs, 0) / fallMs;
    return { tip: t * t, phase: 'fall' };
  }
  if (elapsedMs < fallMs + lieMs) return { tip: 1, phase: 'lie' };
  if (elapsedMs < fallMs + lieMs + riseMs) {
    // Gets up quickly at first, then slows down to stand straight
    const t = (elapsedMs - fallMs - lieMs) / riseMs;
    return { tip: (1 - t) * (1 - t), phase: 'rise' };
  }
  return { tip: 0, phase: 'done' };
}

/** Does a point (like the middle of the flying player) hit a box (like an enemy)? */
export function bumps(
  point: { x: number; y: number },
  box: { left: number; right: number; top: number; bottom: number },
  margin: number,
): boolean {
  return (
    point.x >= box.left - margin &&
    point.x <= box.right + margin &&
    point.y >= box.top - margin &&
    point.y <= box.bottom + margin
  );
}
