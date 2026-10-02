/**
 * How many footsteps happened between two moments of the walk cycle.
 * One full turn of the phase (2π) is two steps, so a step lands every π.
 */
export function stepsBetween(fromPhase: number, toPhase: number): number {
  if (toPhase <= fromPhase) return 0;
  return Math.floor(toPhase / Math.PI) - Math.floor(fromPhase / Math.PI);
}
