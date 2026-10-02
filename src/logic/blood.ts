/** A flying drop of blood: where it is and how fast it's going (pixels per second). */
export interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Moves a drop for `deltaMs`, pulled down by `gravity` (pixels per second²). */
export function stepDrop(drop: Drop, deltaMs: number, gravity: number): Drop {
  const dt = deltaMs / 1000;
  const vy = drop.vy + gravity * dt;
  return { x: drop.x + drop.vx * dt, y: drop.y + vy * dt, vx: drop.vx, vy };
}

/**
 * How a flying drop looks: turned the way it flies, and stretched longer
 * the faster it goes (like real drops in a photo).
 */
export function dropShape(
  vx: number,
  vy: number,
  maxStretch: number,
): { angle: number; stretch: number } {
  const speed = Math.hypot(vx, vy);
  return { angle: Math.atan2(vy, vx), stretch: 1 + Math.min(speed / 400, maxStretch - 1) };
}
