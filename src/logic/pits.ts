/** A hole in the ground, from `left` to `right` (x on the screen). */
export interface Pit {
  left: number;
  right: number;
}

/**
 * Is the player standing over a pit? The feet must be a bit inside the hole
 * (`grip` pixels from the edge), so just touching the edge is still safe.
 */
export function overPit(x: number, pits: readonly Pit[], grip: number): Pit | null {
  return pits.find((p) => x > p.left + grip && x < p.right - grip) ?? null;
}

/** One frame of a jump: going up, slowing down, falling back to the ground. */
export function jumpStep(
  lift: number,
  speed: number,
  deltaMs: number,
  gravity: number,
): { lift: number; speed: number; landed: boolean } {
  const dt = deltaMs / 1000;
  const nextSpeed = speed - gravity * dt;
  const nextLift = lift + nextSpeed * dt;
  if (nextLift <= 0) return { lift: 0, speed: 0, landed: true };
  return { lift: nextLift, speed: nextSpeed, landed: false };
}

/** Where to put the player back after falling into a pit: next to the edge they came from. */
export function safeSpotBeside(pit: Pit, facing: 1 | -1, gap: number): number {
  return facing === 1 ? pit.left - gap : pit.right + gap;
}
