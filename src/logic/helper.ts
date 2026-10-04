/** The enemy the helper should breathe fire at: the closest one within `range`, or null. */
export function helperTarget(
  helperX: number,
  enemies: readonly { x: number; y: number }[],
  range: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  for (const e of enemies) {
    const d = Math.abs(e.x - helperX);
    if (d > range) continue;
    if (!best || d < Math.abs(best.x - helperX)) best = e;
  }
  return best;
}

/** Where the helper flies: a bit behind you and up in the air, gently bobbing. */
export function helperSpot(
  playerX: number,
  facing: 1 | -1,
  behind: number,
  timeMs: number,
  bob: number,
): { x: number; lift: number } {
  return { x: playerX - facing * behind, lift: Math.sin(timeMs / 400) * bob };
}

/** Moves the helper part of the way toward where it wants to be (smooth flying). */
export function glide(from: number, to: number, step: number): number {
  return from + (to - from) * Math.min(Math.max(step, 0), 1);
}

/** How steeply a fireball must fly to hit something `dy` lower, `dx` ahead (kept gentle). */
export function fireSlope(dx: number, dy: number, max: number): number {
  const slope = dy / Math.max(Math.abs(dx), 1);
  return Math.min(Math.max(slope, -max), max);
}

/** Does the baby dragon fly with you in this story chapter (0 = the first)? */
export function hasDragonFriend(chapter: number, joinsAfter: number): boolean {
  return chapter >= joinsAfter;
}
