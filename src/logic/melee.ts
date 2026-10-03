/**
 * Can a swing from `attackerX` facing `facing` reach someone at `targetX`?
 * They must be in front, no further than `reach`.
 */
export function inReach(
  attackerX: number,
  facing: 1 | -1,
  targetX: number,
  reach: number,
): boolean {
  const ahead = (targetX - attackerX) * facing;
  return ahead >= 0 && ahead <= reach;
}
