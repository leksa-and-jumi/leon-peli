/** A point on the screen. */
export interface Spot {
  x: number;
  y: number;
}

/** A swinging liana: how far it leans (radians, 0 = straight down) and how fast it turns. */
export interface Swing {
  angle: number;
  speed: number;
}

export interface SwingRules {
  gravity: number;
  length: number;
  /** How hard A/D push the swing. */
  push: number;
  /** How quickly the swing slows down by itself. */
  damping: number;
  /** It never swings further than this (radians). */
  maxAngle: number;
}

/**
 * One frame of swinging like a pendulum. `input` is -1 (A, push left),
 * 0 (just hang) or 1 (D, push right).
 */
export function pendulumStep(
  swing: Swing,
  input: -1 | 0 | 1,
  deltaMs: number,
  rules: SwingRules,
): Swing {
  const dt = deltaMs / 1000;
  const pull = -(rules.gravity / rules.length) * Math.sin(swing.angle);
  const speed = (swing.speed + (pull + input * rules.push) * dt) * (1 - rules.damping * dt);
  let angle = swing.angle + speed * dt;
  let nextSpeed = speed;
  if (Math.abs(angle) > rules.maxAngle) {
    angle = Math.sign(angle) * rules.maxAngle;
    nextSpeed = 0;
  }
  return { angle, speed: nextSpeed };
}

/** Where the bottom end of a liana hanging from `anchor` is. */
export function ropeEnd(anchor: Spot, length: number, angle: number): Spot {
  return { x: anchor.x + Math.sin(angle) * length, y: anchor.y + Math.cos(angle) * length };
}

/** The speed you fly off with when letting go (pixels per second, down is +y). */
export function releaseVelocity(swing: Swing, length: number): { vx: number; vy: number } {
  const v = swing.speed * length;
  return { vx: Math.cos(swing.angle) * v, vy: -Math.sin(swing.angle) * v };
}

/**
 * Can someone jumping grab the liana? Their hands (`handsY`) must reach the bottom
 * of it, and they must be close enough sideways.
 */
export function canGrab(
  playerX: number,
  handsY: number,
  end: Spot,
  reachX: number,
  reachY: number,
): boolean {
  return Math.abs(playerX - end.x) <= reachX && handsY <= end.y + reachY;
}

/**
 * How long a flight lasts: starting `height` pixels above the ground, going up at `up`
 * pixels per second, pulled down by `gravity`. Used to spin exactly one flip.
 */
export function flightTime(height: number, up: number, gravity: number): number {
  return (up + Math.sqrt(Math.max(up * up + 2 * gravity * height, 0))) / gravity;
}

/**
 * How far round the flip is (radians, 0 to one full turn) at `progress` 0..1 of the flight.
 * Starts and ends slowly, spins fast in the middle, like a real somersault.
 */
export function flipSpin(progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1);
  return Math.PI * 2 * (p - Math.sin(Math.PI * 2 * p) / (Math.PI * 2));
}

/** Tucked up tight in the middle of the flip, opened out at the start and before landing. */
export function flipTucked(progress: number, openStart: number, openEnd: number): boolean {
  return progress > openStart && progress < openEnd;
}
