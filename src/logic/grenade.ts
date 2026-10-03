/**
 * How to throw something so it lands `dx` pixels away (and `dy` lower, down is +)
 * after `flightMs`, with `gravity` pulling it down. Returns the starting speed.
 */
export function throwVelocity(
  dx: number,
  dy: number,
  flightMs: number,
  gravity: number,
): { vx: number; vy: number } {
  if (flightMs <= 0) throw new RangeError('flightMs must be positive');
  const t = flightMs / 1000;
  return { vx: dx / t, vy: dy / t - (gravity * t) / 2 };
}

/** Is something at `x` close enough to a blast at `blastX` to get hurt? */
export function inBlast(x: number, blastX: number, radius: number): boolean {
  return Math.abs(x - blastX) <= radius;
}

/** Counts shots; after `every` shots it's time to throw a grenade (and the count starts over). */
export function grenadeAfterShots(shots: number, every: number): boolean {
  return shots > 0 && shots % every === 0;
}
