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
